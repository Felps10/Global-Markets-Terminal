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
    // '/markets/chart' is a redirect alias of research (see App.jsx ChartAliasRedirect)
    research:     '/markets/research',
    fundamentals: '/markets/fundamentals',
    macro:        '/markets/macro',
    signals:      '/markets/signals',
  },
  admin:    '/admin',
  auth: {
    login:    '/login',
    register: '/register',
  },
  // /features, /about, /community were retired in the 2026-07 consolidation;
  // App.jsx keeps redirects for old links but nothing should navigate to them.
  public: {
    landing:  '/',
    terminal: '/terminal',
    mini:     '/mini',
    coverage: '/coverage',
    pricing:  '/pricing',
  },
};

// Deep-link builders — single-source each page's query-param contract so
// producers can't mix up ?symbol= (single-asset pages) with ?symbols=
// (the Fundamental Lab's multi-asset list).
export const marketsUrl = {
  research:     (symbol)  => `${ROUTES.markets.research}?symbol=${encodeURIComponent(symbol)}`,
  fundamentals: (symbols) => `${ROUTES.markets.fundamentals}?symbols=${symbols.map(encodeURIComponent).join(',')}`,
  signals:      (symbol)  => `${ROUTES.markets.signals}?symbol=${encodeURIComponent(symbol)}`,
  news:         (symbol)  => `${ROUTES.terminal.news}?symbol=${encodeURIComponent(symbol)}`,
};
