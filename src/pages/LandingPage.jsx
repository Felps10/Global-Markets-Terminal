import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { useAuth } from '../hooks/useAuth.js';
import { coingeckoPrices } from '../dataServices.js';
import { GMTPublicHeader } from '../components/GMTHeader.jsx';

// ─── FONTS ────────────────────────────────────────────────────────────────────
const GlobalFonts = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
`;

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#040810',
  surface:  '#080E1A',
  surface2: '#0C1424',
  border:   '#1A2540',
  accent:   '#00C8FF',
  accentDim:'rgba(0,200,255,0.12)',
  text:     '#E8EAF0',
  text2:    '#6B7FA3',
  text3:    '#3A4F6E',
  green:    '#00E676',
  red:      '#FF5252',
};

// ─── KEYFRAMES ────────────────────────────────────────────────────────────────
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.85); }
`;

const scrollLeft = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const scrollRight = keyframes`
  0%   { transform: translateX(-50%); }
  100% { transform: translateX(0); }
`;

const orbFloat = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(30px, -20px) scale(1.05); }
  66%       { transform: translate(-20px, 15px) scale(0.97); }
`;

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────────

// Page shell
const Page = styled.div`
  background: ${C.bg};
  color: ${C.text};
  font-family: 'IBM Plex Sans', -apple-system, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
`;


// ── Hero
const Hero = styled.section`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 120px 40px 80px;
  text-align: center;
`;

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
`;

const GradientOrb = styled.div`
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,200,255,0.06) 0%, transparent 70%);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  animation: ${orbFloat} 14s ease-in-out infinite;
  pointer-events: none;
`;

const HeroInner = styled.div`
  position: relative;
  z-index: 1;
  max-width: 760px;
  animation: ${fadeUp} 0.8s ease both;
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  color: ${C.accent};
  text-transform: uppercase;
  margin-bottom: 28px;
`;

const PulseDot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${C.accent};
  animation: ${pulse} 2s ease-in-out infinite;
  flex-shrink: 0;
`;

const Headline = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(40px, 7vw, 78px);
  font-weight: 800;
  line-height: 1.08;
  color: ${C.text};
  margin: 0 0 28px;
  letter-spacing: -0.02em;

  em {
    font-style: normal;
    color: ${C.accent};
  }
`;

const Subheadline = styled.p`
  font-size: clamp(15px, 2vw, 18px);
  font-weight: 300;
  color: ${C.text2};
  line-height: 1.65;
  max-width: 560px;
  margin: 0 auto 44px;
`;

const HeroCTA = styled.button`
  background: ${C.accent};
  border: none;
  border-radius: 2px;
  color: #040810;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.1em;
  padding: 16px 36px;
  text-transform: uppercase;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;

  &:hover {
    background: #26D4FF;
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,200,255,0.25);
  }
  &:active { transform: translateY(0); }
`;

const HeroRegisterLink = styled.button`
  background: none;
  border: none;
  color: ${C.text2};
  cursor: pointer;
  display: block;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  font-weight: 400;
  margin: 12px auto 0;
  padding: 4px;
  transition: color 0.15s;

  &:hover { color: ${C.accent}; }
`;

const LearnMore = styled.button`
  background: none;
  border: none;
  color: ${C.text3};
  cursor: pointer;
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  margin: 20px auto 0;
  padding: 6px;
  text-transform: uppercase;
  transition: color 0.15s;

  &:hover { color: ${C.text2}; }
`;

// ── Ticker
const TickerSection = styled.section`
  border-top: 1px solid ${C.border};
  border-bottom: 1px solid ${C.border};
  overflow: hidden;
  background: ${C.surface};
`;

const TickerRow = styled.div`
  overflow: hidden;
  padding: 10px 0;
  border-bottom: ${p => p.$last ? 'none' : `1px solid ${C.border}`};
`;

const TickerTrack = styled.div`
  display: flex;
  width: max-content;
  animation: ${p => p.$reverse ? scrollRight : scrollLeft}
             ${p => p.$speed || 35}s linear infinite;

  &:hover { animation-play-state: paused; }
`;

const TickerItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 28px;
  border-right: 1px solid ${C.border};
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
`;

const TickerDiamond = styled.span`
  color: ${C.text3};
  font-size: 8px;
`;

const TickerSymbol = styled.span`
  color: ${C.text};
  font-weight: 500;
  letter-spacing: 0.06em;
`;

const TickerPrice = styled.span`
  color: ${C.text2};
`;

const TickerChange = styled.span`
  color: ${p => p.$pos ? C.green : p.$neg ? C.red : C.text3};
  min-width: 52px;
`;

// ── Trust section
const TrustSection = styled.section`
  padding: 64px 40px;
  background: ${C.surface};
  border-top: 1px solid ${C.border};
`;

const TrustInner = styled.div`
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
`;

const SectionLabel = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  color: ${C.text3};
  text-transform: uppercase;
  margin-bottom: 32px;
`;

const ProviderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 48px;
`;

const ProviderBadge = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: ${C.text2};
  text-transform: uppercase;
  padding: 6px 20px;
  border-right: 1px solid ${C.border};

  &:last-child { border-right: none; }
  @media (max-width: 600px) { border-right: none; padding: 6px 12px; }
`;

const TrustGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  border: 1px solid ${C.border};
  border-radius: 4px;
  overflow: hidden;
  background: ${C.border};

  @media (max-width: 700px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const TrustCard = styled.div`
  background: ${C.surface2};
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const TrustIcon = styled.div`
  color: ${C.accent};
  opacity: 0.8;
`;

const TrustLabel = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${C.text2};
  text-align: center;
  line-height: 1.4;
`;

// ── Footer
const FooterBar = styled.footer`
  border-top: 1px solid ${C.border};
  padding: 24px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${C.bg};

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 16px;
    text-align: center;
    padding: 24px 20px;
  }
`;

const FooterLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const FooterCopy = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: ${C.text3};
  letter-spacing: 0.06em;
`;

const FooterLink = styled.button`
  background: none;
  border: none;
  color: ${C.accent};
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  padding: 0;
  text-transform: uppercase;
  transition: color 0.15s;
  &:hover { color: #26D4FF; }
`;

// ─── SVG LOGO MARK ────────────────────────────────────────────────────────────
const LogoMark = styled.svg`
  flex-shrink: 0;
`;

function GmtMark({ size = 28 }) {
  return (
    <LogoMark width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="1" y="1" width="26" height="26" rx="2" stroke="#00C8FF" strokeWidth="1.5" />
      <polyline points="5,20 10,12 14,16 18,9 23,14" stroke="#00C8FF" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="23" cy="14" r="2" fill="#00C8FF" />
    </LogoMark>
  );
}

// ─── TICKER ITEM ──────────────────────────────────────────────────────────────
function Tick({ sym, price, changePct }) {
  const hasData  = price != null;
  const pos      = hasData && changePct > 0;
  const neg      = hasData && changePct < 0;
  const sign     = pos ? '+' : '';
  const arrow    = pos ? '▲' : neg ? '▼' : '';

  return (
    <TickerItem>
      <TickerDiamond>◆</TickerDiamond>
      <TickerSymbol>{sym}</TickerSymbol>
      <TickerPrice>{hasData ? `$${price >= 1000 ? Math.round(price).toLocaleString() : price >= 1 ? price.toFixed(2) : price.toFixed(4)}` : '—'}</TickerPrice>
      <TickerChange $pos={pos} $neg={neg}>
        {hasData ? `${arrow} ${sign}${changePct.toFixed(2)}%` : '—'}
      </TickerChange>
    </TickerItem>
  );
}

// ─── TRUST ICONS ──────────────────────────────────────────────────────────────
const IconLock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconGlobe = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const IconZap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// ─── CURATED TICKER SYMBOLS ───────────────────────────────────────────────────
// Two rows, different assets for visual variety
const ROW1_SYMBOLS = [
  { sym: '^GSPC', label: 'SPX' }, { sym: '^DJI', label: 'DJIA' },
  { sym: '^IXIC', label: 'NDX' }, { sym: 'AAPL', label: 'AAPL' },
  { sym: 'MSFT', label: 'MSFT' }, { sym: 'NVDA', label: 'NVDA' },
  { sym: 'GOOGL', label: 'GOOGL' }, { sym: 'AMZN', label: 'AMZN' },
  { sym: 'META', label: 'META' }, { sym: 'EURUSD=X', label: 'EUR/USD' },
  { sym: 'GBPUSD=X', label: 'GBP/USD' }, { sym: 'USDJPY=X', label: 'USD/JPY' },
];
const ROW2_SYMBOLS = [
  { sym: 'JPM', label: 'JPM' }, { sym: 'GS', label: 'GS' },
  { sym: 'XOM', label: 'XOM' }, { sym: 'CVX', label: 'CVX' },
  { sym: 'LLY', label: 'LLY' }, { sym: 'UNH', label: 'UNH' },
  { sym: 'TSM', label: 'TSM' }, { sym: 'AVGO', label: 'AVGO' },
  { sym: '^FTSE', label: 'FTSE' }, { sym: '^N225', label: 'N225' },
  { sym: 'USDCAD=X', label: 'USD/CAD' }, { sym: 'AUDUSD=X', label: 'AUD/USD' },
];
const CRYPTO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' };

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate         = useNavigate();
  const { isAuthenticated } = useAuth();
  const [tickerData, setTickerData] = useState({});
  const featuresRef = useRef(null);

  // Redirect authenticated users straight to the app
  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  // Fetch ticker prices
  const fetchTicker = useCallback(async () => {
    const all = [...ROW1_SYMBOLS, ...ROW2_SYMBOLS];
    const yahooSyms = all.map(s => s.sym);
    const next = {};

    // Yahoo Finance via backend proxy / Yahoo query API
    try {
      const qs = yahooSyms.map(encodeURIComponent).join('%2C');
      const res = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${qs}&fields=regularMarketPrice,regularMarketChangePercent`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (res.ok) {
        const json = await res.json();
        const results = json?.quoteResponse?.result || [];
        for (const q of results) {
          next[q.symbol] = {
            price:     q.regularMarketPrice,
            changePct: q.regularMarketChangePercent,
          };
        }
      }
    } catch { /* silent fail — show placeholders */ }

    // CoinGecko crypto
    try {
      const ids = Object.values(CRYPTO_IDS).join(',');
      const data = await coingeckoPrices(ids);
      if (data) {
        for (const [sym, cgId] of Object.entries(CRYPTO_IDS)) {
          const d = data[cgId];
          if (d) next[sym] = { price: d.usd, changePct: d.usd_24h_change };
        }
      }
    } catch { /* silent fail */ }

    setTickerData(next);
  }, []);

  useEffect(() => {
    fetchTicker();
    const id = setInterval(fetchTicker, 30_000);
    return () => clearInterval(id);
  }, [fetchTicker]);

  const launch  = () => navigate(isAuthenticated ? '/app' : '/login');
  const signUp  = () => navigate('/register');
  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Build ticker items + crypto row inserts
  const row1Items = [
    ...ROW1_SYMBOLS,
    ...Object.keys(CRYPTO_IDS).map(sym => ({ sym, label: sym })),
  ];
  const row2Items = ROW2_SYMBOLS;

  // Duplicate each row for seamless infinite scroll
  const r1 = [...row1Items, ...row1Items];
  const r2 = [...row2Items, ...row2Items];

  return (
    <>
      <GlobalFonts />
      <Page>

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <GMTPublicHeader
          onSignIn={() => navigate('/login')}
          onSignUp={() => navigate('/register')}
        />

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <Hero>
          <GridOverlay />
          <GradientOrb />
          <HeroInner>
            <Eyebrow>
              <PulseDot />
              Real-Time Market Intelligence
            </Eyebrow>

            <Headline>
              The Terminal Built<br />
              for <em>Serious</em> Investors.
            </Headline>

            <Subheadline>
              Track equities, crypto, currencies, commodities and indices
              across global markets — all in one professional-grade platform.
            </Subheadline>

            <HeroCTA onClick={launch}>Launch Terminal →</HeroCTA>
            {!isAuthenticated && (
              <HeroRegisterLink onClick={signUp}>
                New to GMT? Create a free account →
              </HeroRegisterLink>
            )}
            <LearnMore onClick={scrollToFeatures}>Learn more ↓</LearnMore>
          </HeroInner>
        </Hero>

        {/* ── LIVE TICKER ───────────────────────────────────────────────────── */}
        <div ref={featuresRef}>
          <TickerSection>
            <TickerRow>
              <TickerTrack $speed={38}>
                {r1.map((s, i) => {
                  const d = tickerData[s.sym];
                  return <Tick key={`r1-${i}`} sym={s.label} price={d?.price} changePct={d?.changePct} />;
                })}
              </TickerTrack>
            </TickerRow>
            <TickerRow $last>
              <TickerTrack $reverse $speed={42}>
                {r2.map((s, i) => {
                  const d = tickerData[s.sym];
                  return <Tick key={`r2-${i}`} sym={s.label} price={d?.price} changePct={d?.changePct} />;
                })}
              </TickerTrack>
            </TickerRow>
          </TickerSection>
        </div>

        {/* ── TRUST SIGNALS ─────────────────────────────────────────────────── */}
        <TrustSection>
          <TrustInner>
            <SectionLabel>Market Data Provided By</SectionLabel>
            <ProviderRow>
              {['Yahoo Finance','CoinGecko','Finnhub','FRED','FMP','BRAPI','BCB'].map(p => (
                <ProviderBadge key={p}>{p}</ProviderBadge>
              ))}
            </ProviderRow>

            <TrustGrid>
              <TrustCard>
                <TrustIcon><IconLock /></TrustIcon>
                <TrustLabel>JWT Secured<br />Authentication</TrustLabel>
              </TrustCard>
              <TrustCard>
                <TrustIcon><IconChart /></TrustIcon>
                <TrustLabel>Real-Time<br />Data Feeds</TrustLabel>
              </TrustCard>
              <TrustCard>
                <TrustIcon><IconGlobe /></TrustIcon>
                <TrustLabel>Global Market<br />Coverage</TrustLabel>
              </TrustCard>
              <TrustCard>
                <TrustIcon><IconZap /></TrustIcon>
                <TrustLabel>Low-Latency<br />Architecture</TrustLabel>
              </TrustCard>
            </TrustGrid>
          </TrustInner>
        </TrustSection>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <FooterBar>
          <FooterLogo>
            <GmtMark size={22} />
            <FooterCopy>© 2025 Global Markets Terminal</FooterCopy>
          </FooterLogo>
          <FooterLink onClick={launch}>Launch Terminal →</FooterLink>
        </FooterBar>

      </Page>
    </>
  );
}
