// Internal color constants — do not import from outside
const GREEN       = '#00E676';
const AMBER       = '#fbbf24';
const RED         = '#FF5252';
const TEXT_BRIGHT = '#e2e8f0';
const TEXT_DIM    = '#475569';

/**
 * Maps a severity string to a display color.
 * @param {string} severity - "CRITICAL" | "WARNING" | "INFO"
 * @returns {string} hex color
 */
export function severityColor(severity) {
  if (severity === 'CRITICAL') return RED;
  if (severity === 'WARNING')  return AMBER;
  return TEXT_DIM;
}

/**
 * Maps a severity string to a Portuguese display label.
 * @param {string} severity - "CRITICAL" | "WARNING" | "INFO"
 * @returns {string} label
 */
export function severityLabel(severity) {
  if (severity === 'CRITICAL') return 'CRÍTICO';
  if (severity === 'WARNING')  return 'ALERTA';
  return 'INFO';
}

/**
 * Maps a numeric value to a color indicating its sign.
 * @param {number|null} value
 * @returns {string} hex color
 */
export function signColor(value) {
  if (value == null || isNaN(value)) return TEXT_BRIGHT;
  if (value > 0) return GREEN;
  if (value < 0) return RED;
  return TEXT_BRIGHT;
}

/**
 * Formats an ISO date string or datetime string to DD/MM/YYYY.
 * Handles both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ssZ' formats.
 * @param {string} dateStr
 * @returns {string} "DD/MM/YYYY"
 */
export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('T')[0].split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
