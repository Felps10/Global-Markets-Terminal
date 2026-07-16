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

// Deep-link builders — single-source each page's query-param contract so
// producers can't mix up ?symbol= (single-asset pages) with ?symbols=
// (the Fundamental Lab's multi-asset list).
export const marketsUrl = {
  research:     (symbol)  => `${ROUTES.markets.research}?symbol=${encodeURIComponent(symbol)}`,
  fundamentals: (symbols) => `${ROUTES.markets.fundamentals}?symbols=${symbols.map(encodeURIComponent).join(',')}`,
  signals:      (symbol)  => `${ROUTES.markets.signals}?symbol=${encodeURIComponent(symbol)}`,
  news:         (symbol)  => `${ROUTES.terminal.news}?symbol=${encodeURIComponent(symbol)}`,
};
