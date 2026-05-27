/**
 * Clube GMT design tokens
 * Import from here instead of hardcoding hex values.
 */

export const CLUBE_COLORS = {
  accent:          '#F9C300',
  goldMuted:       '#C5A059',
  accentDim:       'rgba(249,195,0,0.55)',
  accentFaint:     'rgba(249,195,0,0.12)',
  accentBorder:    'rgba(249,195,0,0.25)',
  bg:              '#080f1a',
  bgSurface:       '#0c1525',
  bgElevated:      '#111827',
  bgHead:          '#0a1628',
  bgCard:          '#0d1824',
  bgCardElevated:  '#0f1f2e',
  textPrimary:     '#e2e8f0',
  textMain:        '#94a3b8',
  textDim:         '#475569',
  textFaint:       '#334155',
  textSecondary:   'rgba(255,255,255,0.55)',
  textMuted:       'rgba(255,255,255,0.3)',
  border:          'rgba(255,255,255,0.08)',
  borderGold:      'rgba(249,195,0,0.2)',
  borderSubtle:    'rgba(30,41,59,0.8)',
  borderFaint:     'rgba(51,65,85,0.5)',
  green:           '#00E676',
  amber:           '#fbbf24',
  red:             '#FF5252',
  blue:            '#60a5fa',
  ctaBg:           '#F9C300',
  ctaText:         '#080f1a',
  ctaHover:        '#FFD740',
};

export const CLUBE_FONTS = {
  sans: "'IBM Plex Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const CLUBE_RADIUS = {
  hairline: 1,
  xxs:      2,
  xs:       3,
  sm:       4,
  md:       6,
  lg:       8,
  xl:       10,
  full:     9999,
};

// Nav items for the public Clube header
// Bilingual — label toggles based on lang prop
export const CLUBE_NAV = {
  pt: [
    { label: 'Início',          path: '/clube'              },
    { label: 'Como Funciona',   path: '/clube/como-funciona'},
    { label: 'Para Gestores',   path: '/clube/para-gestores'},
    { label: 'Para Membros',    path: '/clube/para-membros' },
    { label: 'Contato',         path: '/clube/contato'      },
  ],
  en: [
    { label: 'Home',            path: '/clube'              },
    { label: 'How It Works',    path: '/clube/como-funciona'},
    { label: 'For Managers',    path: '/clube/para-gestores'},
    { label: 'For Members',     path: '/clube/para-membros' },
    { label: 'Contact',         path: '/clube/contato'      },
  ],
};

