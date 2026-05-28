# GMT Design System
### Global Markets Terminal · v1.2 · March 2026

> This document is the canonical source of truth for GMT's visual language. It was derived from a full audit of the production codebase. Where the codebase contains inconsistencies, this document resolves them and defines the correct value going forward.

---

## 1. Brand Foundation

### 1.1 What GMT Is

GMT is a professional-grade market intelligence terminal. It aggregates real-time data from eight sources — US equities, Brazilian B3, crypto, FX, commodities, fixed income, and macro — into one unified, data-dense interface.

The product is built for serious investors who live in the market. Every design decision should serve that context: information density over decoration, speed over surprise, precision over personality.

### 1.2 Design Principles

**Data first.** Every pixel that isn't carrying information is wasted space. Chrome, decoration, and whitespace exist only to serve legibility and hierarchy — never to fill emptiness.

**Professional by default.** GMT looks the way Bloomberg feels: authoritative, composed, and built for sustained use. It should feel like a tool you trust with money, not a consumer app.

**Consistent, not clever.** Consistency in color, type, and spacing is more valuable than any single beautiful screen. When in doubt, match what already exists.

**Dark is the primary mode.** The terminal is designed for use during market hours, often for extended periods. Dark theme is the default and the experience that gets the most design investment.

---

## 2. Color System

### 2.1 Design Tokens (CSS Variables)

These are defined in `src/index.css` as CSS custom properties scoped to `[data-theme]`. **All component styles must reference these tokens, not hardcoded hex values.**

#### Dark Theme (Primary)

| Token | Value | Usage |
|---|---|---|
| `--c-bg-root` | `linear-gradient(180deg, #0a0a0f 0%, #0d0f18 100%)` | Root page background |
| `--c-panel` | `#0e1016` | Sidebars, nav panels, detail drawers |
| `--c-surface` | `rgba(255,255,255,0.02)` | Cards, list rows, elevated containers |
| `--c-border` | `rgba(255,255,255,0.06)` | Standard dividers and outlines |
| `--c-border-faint` | `rgba(255,255,255,0.04)` | Subtle separators within surfaces |
| `--c-text` | `rgba(255,255,255,0.95)` | Primary text — prices, labels, headings |
| `--c-text-2` | `rgba(255,255,255,0.35)` | Secondary text — captions, metadata, timestamps |
| `--c-text-3` | `rgba(255,255,255,0.20)` | Tertiary text — placeholders, disabled states |
| `--c-overlay` | `rgba(0,0,0,0.70)` | Modal backdrops, tooltips |

#### Light Theme

| Token | Value | Usage |
|---|---|---|
| `--c-bg-root` | `linear-gradient(180deg, #f2f4fb 0%, #e8eaf6 100%)` | Root page background |
| `--c-panel` | `#eef0f9` | Sidebars, nav panels |
| `--c-surface` | `rgba(255,255,255,0.70)` | Cards, list rows |
| `--c-border` | `rgba(0,0,0,0.09)` | Standard dividers |
| `--c-border-faint` | `rgba(0,0,0,0.05)` | Subtle separators |
| `--c-text` | `rgba(10,10,18,0.90)` | Primary text |
| `--c-text-2` | `rgba(10,10,18,0.48)` | Secondary text |
| `--c-text-3` | `rgba(10,10,18,0.30)` | Tertiary text |
| `--c-overlay` | `rgba(0,0,0,0.35)` | Modal backdrops |

---

### 2.2 Canonical Static Colors

These are hardcoded values used across the product for specific semantic purposes. They do not change between themes.

#### Accent System — Context-Aware

GMT uses a three-accent system. Which accent applies depends on **context and purpose**. These two variables are the decision axes:

1. **Product context** — global terminal vs Brazil/Clube section
2. **Signal type** — interactive UI element vs market data ink

| Role | Accent | Hex | Where it applies |
|---|---|---|---|
| **UI — Global** | Blue | `#3b82f6` | CTAs, active nav, tabs, focus rings, links, selected states — all global product UI |
| **Data — Terminal** | Cyan | `#00C8FF` | Live indicators, chart lines, sparklines, source badges, price highlights — market data ink only |
| **UI + Data — Brazil/Clube** | Yellow | `#F5C518` | All interactive and data elements inside the Brazil/Clube context |

**The split that matters:** `#3b82f6` means "you can click this" or "this is selected." `#00C8FF` means "this is a live data signal." Yellow (`#F5C518`) handles both roles inside the Brazil context. A user should never see both blue and cyan on the same interactive element.

**UI accent tokens (global interactions):**

| Name | Value | Usage |
|---|---|---|
| `--c-accent` | `#3b82f6` | Primary CTA background, active nav indicator, active tab, focus ring, links |
| `--c-accent-dim` | `rgba(59,130,246,0.12)` | Hover backgrounds, selected row tints |
| `--c-accent-muted` | `rgba(59,130,246,0.06)` | Subtle fill on large surfaces |
| `--c-accent-text` | `#ffffff` | Text on top of `--c-accent` fill |

**Data accent tokens (market data ink — terminal-specific):**

| Name | Value | Usage |
|---|---|---|
| `--c-accent-data` | `#00C8FF` | Live/refresh dot, chart lines and fills, sparklines, source badges, price change highlights |
| `--c-accent-data-dim` | `rgba(0,200,255,0.12)` | Data badge backgrounds, chart fill areas |
| `--c-accent-data-muted` | `rgba(0,200,255,0.06)` | Subtle data-surface tints |

**Brazil / Clube accent tokens:**

| Name | Value | Usage |
|---|---|---|
| `--c-accent-br` | `#F5C518` | CTA background, active nav indicator, links, chart lines — all Brazil/Clube pages |
| `--c-accent-br-dim` | `rgba(245,197,24,0.12)` | Hover backgrounds, selected row tints |
| `--c-accent-br-muted` | `rgba(245,197,24,0.06)` | Subtle fill on large surfaces |
| `--c-accent-br-text` | `#0C0A00` | Text on top of `--c-accent-br` fill (near-black on yellow) |

> **Implementation note:** Add `data-context="brazil"` to the Brazil/Clube route wrapper and override `--c-accent` → `#F5C518` at that scope. Components reference `--c-accent` uniformly; only the route wrapper changes the value.

> **Admin note:** The admin UI currently uses `#00BCD4`. This should be migrated to `--c-accent` (`#3b82f6`) as admin pages are global-context UI, not market data.

#### Semantic Colors

| Name | Hex | Usage |
|---|---|---|
| **Positive** | `#00E676` | Price gains, positive returns, success states |
| **Positive dim** | `rgba(0,230,118,0.10)` | Gain row background, success notification fill |
| **Negative** | `#FF5252` | Price losses, negative returns, error states |
| **Negative dim** | `rgba(255,82,82,0.10)` | Loss row background, error notification fill |
| **Neutral** | `#78909C` | Flat/unchanged values, disabled text, cross-list indicators |
| **Warning** | `#FFD740` | Caution states, degraded data source indicators |

#### Background Palette (dark theme static values)

| Name | Hex | Usage |
|---|---|---|
| **Root deep** | `#040810` | Absolute deepest background, used behind the gradient |
| **Surface 0** | `#0A1020` | Primary surface — main panel backgrounds |
| **Surface 1** | `#101830` | Hover state for Surface 0 elements |
| **Surface 2** | `#0E1016` | Matches `--c-panel`; sidebar and drawer backgrounds |
| **Border solid** | `#1A2744` | Use where alpha borders look incorrect (e.g. against non-dark backgrounds) |

---

### 2.3 Exchange & Market Colors

Every exchange has a canonical color used for badges, source indicators, and sparkline accents. These are fixed identifiers — do not repurpose them for other meaning.

| Exchange | Hex | Notes |
|---|---|---|
| NASDAQ | `#00BCD4` | Cyan |
| NYSE | `#7C4DFF` | Purple |
| LSE | `#FF9100` | Orange |
| XETRA | `#FFD740` | Amber |
| TSE | `#E91E63` | Pink |
| HKEX | `#FF5252` | Red |
| B3 | `#00E676` | Green (matches Positive — intentional) |
| INDEX | `#78909C` | Slate (matches Neutral — intentional) |
| FOREX | `#9E9E9E` | Mid-grey |
| CRYPTO | `#F9A825` | Gold-amber |

---

### 2.4 Data Source Colors

Used only in source badges and the API quota/health indicators. Never use these for semantic meaning elsewhere.

| Source | Hex |
|---|---|
| Yahoo Finance | `#7B1FA2` |
| Finnhub | `#00BCD4` |
| CoinGecko | `#8BC34A` |
| FMP | `#E91E63` |
| BRAPI | `#009C3B` |
| BCB | `#003087` |
| FRED | `#1565C0` |
| AwesomeAPI | `#FF6B00` |
| Alpha Vantage | `#FF9100` |

---

## 3. Typography

### 3.1 Type Stack

GMT uses three typefaces. Each has a defined purpose — do not mix them outside their intended role.

| Family | Role | Weights | Where used |
|---|---|---|---|
| **IBM Plex Sans** | UI body, labels, navigation | 300, 400, 500, 600 | All interface text that is not a number or a headline |
| **JetBrains Mono** | Data, numbers, terminal | 400, 500, 600, 700 | Prices, tickers, percentage changes, code, timestamps |
| **Syne** | Brand headlines | 700, 800 | Landing page hero, marketing headings, logo wordmark |

> **Note on DM Sans and Space Mono:** These are currently imported in some components. DM Sans should be replaced with IBM Plex Sans going forward. Space Mono is acceptable as a secondary monospace fallback but JetBrains Mono is preferred.

**Google Fonts import (canonical):**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
```

---

### 3.2 Type Scale

All sizes are in pixels. Use these values only — do not introduce intermediate sizes.

| Step | Size | Weight | Family | Usage |
|---|---|---|---|---|
| `--t-hero` | 52px | 800 | Syne | Landing page hero headline |
| `--t-h1` | 28px | 700 | Syne | Page titles (marketing) |
| `--t-h2` | 18px | 600 | IBM Plex Sans | Section headers within the terminal |
| `--t-h3` | 14px | 600 | IBM Plex Sans | Group/subgroup headers, card titles |
| `--t-body` | 13px | 400 | IBM Plex Sans | Default body text, descriptions |
| `--t-label` | 11px | 500 | IBM Plex Sans | Field labels, column headers, badges |
| `--t-micro` | 9px | 500 | IBM Plex Sans | Metadata, timestamps, sub-captions |
| `--t-price-lg` | 18px | 700 | JetBrains Mono | Large price display in detail panel |
| `--t-price` | 13px | 600 | JetBrains Mono | Standard price column values |
| `--t-price-sm` | 11px | 500 | JetBrains Mono | Compact row prices, badges |
| `--t-change` | 12px | 600 | JetBrains Mono | Percentage change indicators |
| `--t-ticker` | 11px | 700 | JetBrains Mono | Ticker symbols (AAPL, PETR4) |
| `--t-mono-sm` | 9px | 500 | JetBrains Mono | Sparkline labels, micro data |

---

### 3.3 Type Rules

**Monospace for all numbers.** Any numeric value — price, return, ratio, volume, percentage — must use JetBrains Mono. This ensures columns align correctly and prevents layout shifts as values update.

**Tabular figures.** Set `font-variant-numeric: tabular-nums` on all numerical displays. JetBrains Mono has tabular figures by default.

**Letter spacing.** Ticker symbols use `letter-spacing: 0.04em` to improve scannability. Labels at `--t-label` size use `letter-spacing: 0.06em` in uppercase. All other text uses `letter-spacing: normal`.

**Text transform.** Ticker symbols and exchange codes are always uppercase. Column headers and navigation labels may be uppercase at `--t-label` size. Never force uppercase on body text or descriptions.

---

## 4. Spacing & Layout

### 4.1 Base Spacing Scale

All spacing values are multiples of 4px.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Minimum gap between adjacent elements |
| `--space-2` | 8px | Internal padding for compact components (badges, tags) |
| `--space-3` | 12px | Standard component padding |
| `--space-4` | 16px | Section padding, card padding |
| `--space-5` | 20px | Panel padding |
| `--space-6` | 24px | Large section gaps |
| `--space-8` | 32px | Page section margins |
| `--space-12` | 48px | Major layout divisions |

---

### 4.2 Density System

The terminal supports three density modes that users can toggle. Density affects grid column width, gap, and cell padding — nothing else. All three modes use the same type sizes and colors.

| Mode | Grid min-width | Gap | Cell padding | When to use |
|---|---|---|---|---|
| **Compact** | 200px | 8px | 14px 16px | Maximum data density; power users with large monitors |
| **Comfortable** (default) | 260px | 12px | 18px 20px | Balanced legibility and density |
| **Spacious** | 320px | 16px | 24px 24px | Accessibility, smaller viewports, focused analysis |

---

### 4.3 Layout Structure

The terminal uses a fixed-panel layout:

```
┌─────────────────────────────────────────────────────┐
│  Top nav bar                                40px h  │
├────────────┬────────────────────────────────────────┤
│  Left nav  │  Main content area                     │
│  220px     │  Fluid width                           │
│  fixed     │                                        │
│            │                                        │
├────────────┤                                        │
│  (Detail   │                                        │
│   drawer   │                                        │
│   360px    │                                        │
│   from R)  │                                        │
└────────────┴────────────────────────────────────────┘
```

- **Top nav:** 40px height, fixed, `--c-panel` background
- **Left nav panel:** 220px, fixed, `--c-panel` background
- **Main content:** fluid, `--c-bg-root` background
- **Detail drawer:** 360px, slides in from the right, `--c-panel` background, overlays content

---

## 5. Border & Elevation

### 5.1 Border Radius

| Value | Usage |
|---|---|
| `2px` | Data cells, dense list rows, sparkline containers |
| `3px` | Badges, exchange tags, small pill labels |
| `4px` | Form inputs, text fields, select menus |
| `6px` | Cards, asset cards, subgroup panels |
| `8px` | Modals, drawers, tooltips, popovers |
| `10px` | Landing page hero cards, marketing components |

### 5.2 Border Style

Standard border: `1px solid var(--c-border)` — used on cards, panels, and containers.

Dense border: `0.5px solid var(--c-border)` — used on data table rows where visual weight must stay minimal.

Accent border: `1px solid rgba(0,200,255,0.25)` — used on active/selected states.

Never use `box-shadow` to simulate borders. Never mix `border` and `outline` for the same visual purpose.

### 5.3 Elevation

GMT does not use box shadows to convey depth for most components — the dark theme achieves depth through surface color stepping instead. Box shadows are reserved for:

- **Modals and drawers:** `0 24px 64px rgba(0,0,0,0.6)` — strong shadow to separate from the main surface
- **Tooltips and popovers:** `0 8px 24px rgba(0,0,0,0.4)`
- **Floating action elements:** `0 4px 16px rgba(0,0,0,0.3)`

---

## 6. Motion & Animation

### 6.1 Duration Scale

| Name | Value | Usage |
|---|---|---|
| **Fast** | 150ms | Hover color changes, focus states, icon rotations |
| **Standard** | 250ms | Panel slides, drawer reveals, dropdown opens |
| **Slow** | 400ms | Page-level transitions, fade-in on mount |

### 6.2 Easing

All transitions use `ease` (equivalent to `cubic-bezier(0.25, 0.1, 0.25, 1)`). Do not use `linear` for UI transitions. Do not use spring physics in data display components — they create disorienting movement when values update.

### 6.3 Keyframe Animations

```css
/* Entry fade — use for modals, drawers, toasts */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Entry slide-up — use for panels, cards on mount */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Slide in from right — use for detail drawer */
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
```

### 6.4 Rules

**Price updates must never animate color transitions.** When a price changes from green to red (or vice versa), the color switches immediately. Animating the color change creates a visual artifact that implies the price is still in motion.

**Staggered entry animations** may be used on initial page load for asset card grids, with a delay of no more than 20ms per item and a maximum total stagger of 300ms.

**Respect `prefers-reduced-motion`:** All `@keyframes` animations must be disabled when this media query is active. Transitions over 100ms should also be cut to 0ms.

---

## 7. Interactive States

All interactive elements (rows, buttons, links, cards) must implement these states consistently:

| State | Treatment |
|---|---|
| **Default** | Base surface color, `--c-text` at full opacity |
| **Hover** | Surface steps up one level (e.g. `Surface 0` → `Surface 1`), or a subtle `rgba(255,255,255,0.03)` overlay |
| **Active / pressed** | Surface steps up two levels, or `rgba(255,255,255,0.05)` overlay |
| **Selected / active** | `rgba(0,200,255,0.08)` background, left border `2px solid #00C8FF` |
| **Focus (keyboard)** | `outline: 2px solid rgba(0,200,255,0.5)`, `outline-offset: 2px` — never remove outline for accessibility |
| **Disabled** | Opacity `0.35`, `cursor: not-allowed`, no hover state |
| **Loading** | Opacity `0.6`, replace content with a pulse skeleton or spinner at 16px |

---

## 8. Component Conventions

### 8.1 Asset Cards (Grid Mode)

- Background: `var(--c-surface)`
- Border: `1px solid var(--c-border)`
- Border radius: `6px`
- Padding: driven by density setting (see §4.2)
- Ticker: `--t-ticker` size, `--c-text` primary
- Exchange badge: colored pill using exchange color at full opacity (background `rgba(color, 0.12)`, text at full)
- Price: `--t-price`, JetBrains Mono, `--c-text`
- Change: `--t-change`, positive `#00E676`, negative `#FF5252`
- Sparkline: 70–100px wide, 24–34px tall, colored to match change direction

### 8.2 List Rows

- Height: 36px (comfortable), 28px (compact)
- Border: `0.5px solid var(--c-border)` on bottom only
- Hover: `rgba(255,255,255,0.025)` background overlay
- Selected: `rgba(0,200,255,0.06)` background, `2px solid #00C8FF` left border
- All numeric columns right-aligned
- All label columns left-aligned

### 8.3 Badges and Tags

- Border radius: `3px`
- Padding: `2px 7px`
- Font: `--t-label`, `IBM Plex Sans`, weight 500, uppercase
- Letter spacing: `0.06em`
- Exchange badge: background `rgba(exchange-color, 0.15)`, text `exchange-color`
- Status badge: background `rgba(semantic-color, 0.12)`, text `semantic-color`

### 8.4 Form Inputs

- Border radius: `4px`
- Border: `1px solid var(--c-border)`
- Padding: `11px 14px`
- Font: `--t-body`, IBM Plex Sans
- Focus: border color `#00C8FF`, outline `2px solid rgba(0,200,255,0.25)`
- Error: border color `#FF5252`, background `rgba(255,82,82,0.06)`
- Label: `--t-label`, `--c-text-2`, `letter-spacing: 0.06em`, uppercase

### 8.5 Buttons

**Primary:** Background `var(--c-accent)`, text `var(--c-accent-text)`, `font-weight: 600`, `--t-body`. Hover: `filter: brightness(1.08)`. Border radius `4px`. Padding `10px 20px`.

This means primary buttons are **blue** (`#00C8FF` / dark text) everywhere in the global terminal, and **yellow** (`#F5C518` / near-black text) on Brazil and Clube pages — automatically, via the CSS token override on the route wrapper.

**Secondary:** Background `transparent`, border `1px solid var(--c-border)`, text `var(--c-text)`. Hover: `var(--c-surface)` background. Border radius `4px`. Secondary buttons do not change color with context — they are always neutral.

**Ghost / text:** No background, no border. Text `var(--c-accent)`. Hover: `var(--c-accent-dim)` background. Use for inline actions in dense contexts.

**Destructive:** Background `rgba(255,82,82,0.12)`, border `1px solid rgba(255,82,82,0.25)`, text `#FF5252`. Hover: background `rgba(255,82,82,0.18)`. Destructive buttons never use the accent color.

### 8.6 Modals

- Background: `var(--c-panel)` — `#0e1016`
- Border: `1px solid var(--c-border)`
- Border radius: `8px`
- Backdrop: `var(--c-overlay)` with `backdrop-filter: blur(4px)`
- Shadow: `0 24px 64px rgba(0,0,0,0.6)`
- Max width: 480px (standard), 640px (large/taxonomy manager)
- Entry animation: `fadeInUp 250ms ease`

### 8.7 Toasts / Notifications

- Position: bottom-right, `24px` from edges
- Width: 320px
- Border radius: `6px`
- Border-left: `3px solid` using semantic color (success/error/warning)
- Entry: slide in from right over `250ms`
- Auto-dismiss: 4000ms (errors stay until dismissed)

---

## 9. Heatmap-Specific Conventions

The heatmap is a distinct visual context from the main terminal. It uses a more saturated color palette and different surface treatment because it is a data visualization, not a data table.

- **Cell border radius:** `4px`
- **Cell font:** JetBrains Mono for values, IBM Plex Sans for labels
- **Strong gain:** `#00FF9D` fill → `#009950` fill at dark end
- **Strong loss:** `#FF2D55` fill → `#991833` fill at dark end
- **Neutral (near zero):** `#334455`
- **Accent for filters/controls:** `#00C8FF` (consistent with the rest of the terminal)
- **Cell text on gain/loss tiles:** Always `rgba(255,255,255,0.95)` — never use dark text on colored tiles

---

## 10. Macro & Brazil Terminal

The macro banner uses a distinct background to signal a different data context:

- Background: `rgba(21,101,192,0.08)` — a muted navy tint
- Border: `1px solid rgba(21,101,192,0.2)`
- SELIC and CDI rate values: `--t-price-lg`, JetBrains Mono, accent `#00C8FF`

---

## 11. Known Inconsistencies to Resolve

The following inconsistencies were found in the codebase audit. These should be addressed in the next design/dev pass.

| Issue | Current state | Correct state |
|---|---|---|
| **Accent blue fragmentation** | `#3b82f6` (login), `#00C8FF` (heatmap), `#00BCD4` (admin) | `#00C8FF` on all global pages; `#F5C518` on Brazil/Clube pages |
| **Background fragmentation** | `#040810`, `#0a0a0f`, `#080f1a`, `#0e1016` used inconsistently | Use the token system: `--c-bg-root`, `--c-panel`, Surface 0/1/2 |
| **CSS vars vs. hardcoded hex** | Many components bypass the token system and hardcode hex values | All components should reference `var(--c-*)` tokens |
| **Font family drift** | DM Sans imported and used in some components instead of IBM Plex Sans | Replace DM Sans with IBM Plex Sans in all components |
| **Error color inconsistency** | `#FF5252` (terminal), `#FF2D55` (heatmap), `#f87171` (login) | `#FF5252` everywhere |
| **Border radius inconsistency** | Inputs use `4px` in some places, `6px` in others | `4px` for inputs, `6px` for cards |

---

## 12. Accessibility

**Color contrast:** All text must meet WCAG AA minimum contrast ratios. `--c-text` (`rgba(255,255,255,0.95)`) on `--c-bg-root` (`#0a0a0f`) achieves approximately 18:1 — well above the 4.5:1 minimum. `--c-text-2` (`rgba(255,255,255,0.35)`) on dark backgrounds achieves approximately 3:1, which meets AA for large text and UI components but not for body text. Use `--c-text-2` only for truly secondary metadata — never for information the user needs to act on.

**Positive/negative color:** Never use color alone to convey price direction. Always pair with a `+`/`−` prefix character on percentage changes.

**Focus states:** Every interactive element must have a visible focus ring. Use `outline: 2px solid rgba(0,200,255,0.5)` on dark backgrounds. Never set `outline: none` without a custom replacement.

**Keyboard navigation:** The terminal must be fully navigable by keyboard: group navigation, asset selection, drawer open/close, and all modal interactions.

---

## 13. Voice & Tone

GMT's copy is terse, precise, and confident. It speaks like a senior analyst, not a startup chatbot.

**In the UI:**
- Labels are short and specific. "30-day return" not "How has this asset performed over the last month?"
- Error messages state what happened and what to do. "Yahoo Finance quota exceeded. Showing cached data from 14 minutes ago." Not "Something went wrong."
- Empty states are informative. "No assets match this filter." Not "Nothing here yet!"
- Tooltips add context, not description. Don't label what the user can already see.

**In the terminal specifically:**
- Use institutional terminology: "cotização" not "price update", "SELIC" not "Brazil interest rate", "basis points" not "percentage of a percentage".
- Number formatting: prices to 2 decimal places for equities, 4–8 for crypto and FX. Use locale-appropriate separators (`,` for Brazilian reais in BRL contexts, `.` everywhere else by default).

---

*This document should be updated whenever a new component is introduced, a token value is changed, or a significant new surface is designed. Version-control it alongside the codebase.*
