// ============================================================
// TRANSFER NOTE
// Source: src/lib/routes.js
// Classification: SHARED INFRASTRUCTURE — reference only.
// Do not copy directly. New app must create its own equivalent.
// Clube used this for: ROUTES.clube path constants used by marketing pages and header
// New app action: create own ROUTES object for new app paths
// ============================================================

export const ROUTES = {
  terminal: {
    global:    '/app/global',
    brasil:    '/app/brasil',
    catalog:   '/app/catalog',
    news:      '/app/news',
    watchlist: '/app/watchlist',
    alerts:    '/app/alerts',
    settings:  '/app/settings',
  },
  markets: {
    heatmap:      '/markets/heatmap',
    chart:        '/markets/chart',
    research:     '/markets/research',
    fundamentals: '/markets/fundamentals',
    macro:        '/markets/macro',
    signals:      '/markets/signals',
  },
  admin:    '/admin',
  clube: {
    landing:      '/clube',
    comoFunciona: '/clube/como-funciona',
    paraGestores: '/clube/para-gestores',
    paraMembros:  '/clube/para-membros',
    contato:      '/clube/contato',
    list:         '/clubes',
  },
  auth: {
    login:    '/login',
    register: '/register',
  },
  public: {
    landing:   '/',
    terminal:  '/terminal',
    mini:      '/mini',
    features:  '/features',
    coverage:  '/coverage',
    pricing:   '/pricing',
    about:     '/about',
    community: '/community',
  },
};
