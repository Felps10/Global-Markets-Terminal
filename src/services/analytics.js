/**
 * analytics.js — GMT event tracking abstraction
 *
 * All call sites use trackEvent() from this file.
 * To swap providers: change only this file.
 *
 * Provider: Mixpanel
 * Env var required: VITE_MIXPANEL_TOKEN
 *
 * In development (no token): events log to console only.
 * In production: events fire to Mixpanel.
 */

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const IS_DEV = import.meta.env.DEV;

let mixpanelReady = false;

/**
 * Initialize Mixpanel. Call once at app startup.
 * Safe to call multiple times — idempotent.
 */
export function initAnalytics() {
  if (mixpanelReady) return;
  if (!TOKEN) {
    if (IS_DEV) console.info('[Analytics] No VITE_MIXPANEL_TOKEN — dev mode, logging to console only');
    return;
  }
  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.init(TOKEN, {
      track_pageview: false,
      persistence: 'localStorage',
      ignore_dnt: false,
    });
    mixpanelReady = true;
  }
}

/**
 * Track a named event with optional properties.
 *
 * @param {string} eventName  - snake_case event name
 * @param {object} properties - flat key/value pairs, all serializable
 */
export function trackEvent(eventName, properties = {}) {
  const payload = {
    ...properties,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.pathname : '',
  };

  if (IS_DEV || !TOKEN) {
    console.info(`[Analytics] ${eventName}`, payload);
    return;
  }

  if (mixpanelReady && window.mixpanel) {
    window.mixpanel.track(eventName, payload);
  }
}

/**
 * Identify an authenticated user.
 * Call after successful login/registration.
 *
 * @param {string} userId
 * @param {object} traits - { role, email }
 */
export function identifyUser(userId, traits = {}) {
  if (!mixpanelReady || !window.mixpanel) return;
  window.mixpanel.identify(userId);
  if (Object.keys(traits).length > 0) {
    window.mixpanel.people.set(traits);
  }
}
