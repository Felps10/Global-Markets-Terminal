import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { useAuth } from '../hooks/useAuth.js';
import { coingeckoPrices } from '../dataServices.js';
import { GMTHomepageHeader } from '../components/GMTHeader.jsx';
import { useTranslation } from 'react-i18next';

// ─── FONTS ────────────────────────────────────────────────────────────────────
const GlobalFonts = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

// ─── KEYFRAMES ────────────────────────────────────────────────────────────────
const scrollLeft = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const orbFloat = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(30px, -20px) scale(1.05); }
  66%       { transform: translate(-20px, 15px) scale(0.97); }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── TICKER DATA ──────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { sym: 'IBOV',    price: 131842, change: +0.74 },
  { sym: 'S&P 500', price: 5488.12, change: +0.41 },
  { sym: 'NASDAQ',  price: 17219.55, change: +0.63 },
  { sym: 'USD/BRL', price: 5.67, change: -0.22 },
  { sym: 'BTC',     price: null, change: null },
  { sym: 'PETR4',   price: 38.42, change: +1.83 },
  { sym: 'BRENT',   price: 74.18, change: -0.31 },
  { sym: 'SELIC',   price: 14.25, change: 0 },
  { sym: 'VALE3',   price: 58.91, change: +2.41 },
  { sym: 'NVDA',    price: 131.28, change: +3.12 },
  { sym: 'EUR/USD', price: 1.0842, change: -0.18 },
  { sym: 'GOLD',    price: 2341.50, change: +0.52 },
];

const PREVIEW_ASSETS = [
  { sym: 'NVDA', name: 'NVIDIA Corp', price: 131.28, change: +3.12 },
  { sym: 'AAPL', name: 'Apple Inc', price: 189.84, change: +0.82 },
  { sym: 'MSFT', name: 'Microsoft', price: 422.15, change: -0.41 },
  { sym: 'GOOGL', name: 'Alphabet', price: 176.92, change: +1.24 },
  { sym: 'AMZN', name: 'Amazon', price: 186.47, change: +0.67 },
  { sym: 'META', name: 'Meta Platforms', price: 504.38, change: -0.23 },
];

const CAPABILITIES = [
  { title: 'Terminal Global', tag: 'Gratuito', tagType: 'green', desc: '269 ativos em tempo real \u2014 equities EUA por setor GICS, \u00edndices globais, FX, cripto, commodities e renda fixa.', locked: false },
  { title: 'Terminal Brasil', tag: 'Gratuito', tagType: 'green', desc: 'B3, SELIC, IPCA, curva de juros, USD/BRL, EUR/BRL e macro dom\u00e9stico.', locked: false },
  { title: 'Research & Fundamentals', tag: 'Conta gratuita', tagType: 'lock', desc: 'P/L, EPS, ROE, EBITDA e recomenda\u00e7\u00f5es de analistas. Fundamentalista e t\u00e9cnico no mesmo lugar.', locked: true },
  { title: 'Signal Engine', tag: 'Conta gratuita', tagType: 'lock', desc: 'RSI, MACD e sinais t\u00e9cnicos em tempo real. Alertas de pre\u00e7o por email.', locked: true },
  { title: 'Watchlist & Alertas', tag: 'Conta gratuita', tagType: 'lock', desc: 'Salve ativos, organize por tema, e receba alertas quando o mercado se mover.', locked: true },
  { title: 'Clube de Investimento', tag: 'Convite', tagType: 'lock', desc: 'NAV, cotiza\u00e7\u00e3o, hist\u00f3rico de rentabilidade e relat\u00f3rio AI em portugu\u00eas.', locked: true },
];

const GLOBAL_ROWS = [
  { sym: 'NVDA', name: 'NVIDIA Corp', price: '$131.28', change: +3.12 },
  { sym: 'AAPL', name: 'Apple Inc', price: '$189.84', change: +0.82 },
  { sym: 'BTC', name: 'Bitcoin', price: '$67,432', change: +2.14 },
  { sym: 'GOLD', name: 'Gold Spot', price: '$2,341', change: +0.52 },
  { sym: 'EUR/USD', name: 'Euro / Dollar', price: '1.0842', change: -0.18 },
];

const BRASIL_ROWS = [
  { sym: 'PETR4', name: 'Petrobras PN', price: 'R$ 38.42', change: +1.83 },
  { sym: 'VALE3', name: 'Vale ON', price: 'R$ 58.91', change: +2.41 },
  { sym: 'ITUB4', name: 'Ita\u00fa PN', price: 'R$ 34.18', change: -0.31 },
  { sym: 'USD/BRL', name: 'D\u00f3lar / Real', price: 'R$ 5.67', change: -0.28 },
  { sym: 'SELIC', name: 'Taxa Selic', price: '14.25%', change: null },
];

const METRICS = [
  { num: '269', label: 'ativos rastreados' },
  { num: '8', label: 'fontes de dados' },
  { num: '30s', label: 'ciclo de atualiza\u00e7\u00e3o' },
  { num: '9', label: 'grupos de ativos' },
];

const SOURCES = ['Yahoo Finance', 'Finnhub', 'BRAPI', 'BCB / SGS', 'FRED', 'CoinGecko', 'FMP', 'AwesomeAPI'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatTickerPrice(sym, price) {
  if (price == null) return '\u2014';
  const noPrefix = ['IBOV', 'USD/BRL', 'EUR/USD'];
  const isSelic = sym === 'SELIC';
  let formatted;
  if (price >= 1000) formatted = Math.round(price).toLocaleString();
  else if (price >= 1) formatted = price.toFixed(2);
  else formatted = price.toFixed(4);
  if (isSelic) return `${formatted}%`;
  if (noPrefix.includes(sym)) return formatted;
  return `$${formatted}`;
}

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────────

const Page = styled.div`
  background: #080f1a;
  color: rgba(255,255,255,0.92);
  font-family: 'IBM Plex Sans', -apple-system, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
`;

const SectionWrap = styled.div`
  padding: 72px 40px;
  max-width: 1080px;
  margin: 0 auto;
`;

const Eyebrow = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin-bottom: 12px;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: 'Syne', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
  text-align: center;
  margin: 0 0 10px;
`;

const SectionSub = styled.p`
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 300;
  color: rgba(255,255,255,0.4);
  text-align: center;
  max-width: 520px;
  margin: 0 auto 48px;
  line-height: 1.6;
`;

// ── Hero
const Hero = styled.section`
  padding: 80px 32px 72px;
  position: relative;
  overflow: hidden;
  text-align: center;
`;

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
`;

const GradientOrb = styled.div`
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ${orbFloat} 14s ease-in-out infinite;
  pointer-events: none;
`;

const HeroInner = styled.div`
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 0 auto;
  animation: ${fadeUp} 0.8s ease both;
`;

const HeroEyebrow = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  margin-bottom: 20px;
`;

const Headline = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 800;
  line-height: 1.15;
  color: white;
  margin: 0 0 20px;
  white-space: pre-line;
`;

const Subline = styled.p`
  font-size: 15px;
  font-weight: 300;
  color: rgba(255,255,255,0.45);
  max-width: 540px;
  margin: 0 auto 36px;
  line-height: 1.65;
`;

const CTARow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const PrimaryBtn = styled.button`
  background: white;
  color: #080f1a;
  border: none;
  padding: 10px 28px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.9; }
`;

const SecondaryBtn = styled.button`
  background: transparent;
  color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.2);
  padding: 10px 28px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  &:hover {
    border-color: rgba(255,255,255,0.4);
    color: rgba(255,255,255,0.8);
  }
`;

// ── Ticker
const TickerSection = styled.section`
  background: #080f1a;
  border-top: 0.5px solid rgba(255,255,255,0.06);
  border-bottom: 0.5px solid rgba(255,255,255,0.06);
  overflow: hidden;
  padding: 8px 0;
`;

const TickerTrack = styled.div`
  display: flex;
  width: max-content;
  animation: ${scrollLeft} 22s linear infinite;
  &:hover { animation-play-state: paused; }
`;

const TickerItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
`;

const TickerDiamond = styled.span`
  color: rgba(255,255,255,0.2);
  font-size: 8px;
`;

const TickerSym = styled.span`
  color: white;
  font-weight: 500;
`;

const TickerPrice = styled.span`
  color: rgba(255,255,255,0.5);
`;

const TickerChange = styled.span`
  color: ${p => p.$pos ? '#4ade80' : p.$neg ? '#f87171' : 'rgba(255,255,255,0.35)'};
`;

// ── Capabilities
const CapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
`;

const CapCard = styled.div`
  background: rgba(255,255,255,0.03);
  border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 20px;
  opacity: ${p => p.$locked ? 0.65 : 1};
`;

const CapTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.92);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const GreenTag = styled.span`
  color: #4ade80;
  background: rgba(74,222,128,0.15);
  border: 0.5px solid rgba(74,222,128,0.3);
  border-radius: 20px;
  font-size: 10px;
  padding: 2px 8px;
  font-family: 'JetBrains Mono', monospace;
`;

const LockTag = styled.span`
  color: rgba(255,255,255,0.35);
  border: 0.5px solid rgba(255,255,255,0.15);
  border-radius: 20px;
  font-size: 10px;
  padding: 2px 8px;
  font-family: 'JetBrains Mono', monospace;
`;

const CapDesc = styled.div`
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  line-height: 1.6;
`;

// ── Split section
const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const SplitCard = styled.div`
  border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  overflow: hidden;
`;

const SplitHeader = styled.div`
  padding: 14px 16px;
  border-bottom: 0.5px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const MarketName = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.92);
`;

const IndexChange = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: ${p => p.$pos ? '#4ade80' : p.$neg ? '#f87171' : 'rgba(255,255,255,0.35)'};
`;

const SplitRow = styled.div`
  padding: 10px 16px;
  border-bottom: 0.5px solid rgba(255,255,255,0.04);
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr 0.8fr;
  align-items: center;
  gap: 4px;
  &:last-child { border-bottom: none; }
`;

const RowSym = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: white;
`;

const RowName = styled.span`
  font-size: 11px;
  color: rgba(255,255,255,0.35);
`;

const RowPrice = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.6);
`;

const RowChange = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-align: right;
  color: ${p => p.$pos ? '#4ade80' : p.$neg ? '#f87171' : 'rgba(255,255,255,0.35)'};
`;

// ── Metrics
const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricNum = styled.div`
  font-size: 22px;
  font-weight: 500;
  color: white;
`;

const MetricLabel = styled.div`
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  margin-top: 4px;
`;

const SourceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 32px;
`;

const SourceTag = styled.span`
  border: 0.5px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(255,255,255,0.3);
  padding: 4px 10px;
`;

// ── Terminal Preview
const MockFrame = styled.div`
  background: rgba(255,255,255,0.02);
  border: 0.5px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  overflow: hidden;
`;

const MockTopBar = styled.div`
  padding: 8px 12px;
  border-bottom: 0.5px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
`;

const Dots = styled.div`
  display: flex;
  gap: 4px;
  margin-right: 12px;
`;

const Dot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.$color};
  opacity: 0.6;
`;

const TabRow = styled.div`
  display: flex;
  gap: 0;
`;

const Tab = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 4px;
  background: ${p => p.$active ? 'rgba(255,255,255,0.06)' : 'transparent'};
  color: ${p => p.$active ? 'white' : 'rgba(255,255,255,0.3)'};
`;

const MockBody = styled.div`
  display: flex;
`;

const Sidebar = styled.div`
  width: 140px;
  padding: 10px 12px;
  border-right: 0.5px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
`;

const SidebarGroup = styled.div`
  &:not(:first-child) {
    margin-top: 12px;
  }
`;

const SidebarLabel = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.25);
  margin-bottom: 6px;
`;

const SidebarItem = styled.div`
  font-size: 10px;
  padding: 3px 0;
  color: ${p => p.$active ? 'white' : 'rgba(255,255,255,0.35)'};
`;

const MockContent = styled.div`
  flex: 1;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const AssetCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.07);
  border-radius: 6px;
  padding: 8px;
`;

const ACSym = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: white;
  font-weight: 500;
`;

const ACName = styled.div`
  font-size: 9px;
  color: rgba(255,255,255,0.3);
  margin-top: 2px;
`;

const ACPrice = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.8);
  margin-top: 6px;
`;

const ACChange = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  margin-top: 2px;
  color: ${p => p.$pos ? '#4ade80' : p.$neg ? '#f87171' : 'rgba(255,255,255,0.35)'};
`;

// ── Final CTA
const FinalCTA = styled.section`
  padding: 72px 40px;
  text-align: center;
`;

const CTAH2 = styled.h2`
  font-family: 'Syne', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
  margin: 0 0 12px;
`;

const CTAPara = styled.p`
  font-size: 14px;
  font-weight: 300;
  color: rgba(255,255,255,0.4);
  max-width: 480px;
  margin: 0 auto 32px;
  line-height: 1.6;
`;

// ── Footer
const FooterWrap = styled.footer`
  background: #080f1a;
  border-top: 0.5px solid rgba(255,255,255,0.06);
  padding: 48px 40px 24px;
`;

const FooterInner = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const FooterBrand = styled.div``;

const FooterWordmark = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: white;
  margin-bottom: 12px;
`;

const FooterTagline = styled.div`
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  line-height: 1.6;
`;

const FooterColHeader = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(255,255,255,0.25);
  margin-bottom: 12px;
`;

const FooterLink = styled.div`
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  line-height: 2.2;
`;

const FooterBottom = styled.div`
  border-top: 0.5px solid rgba(255,255,255,0.06);
  margin-top: 32px;
  padding-top: 20px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 1080px;
  margin-left: auto;
  margin-right: auto;
`;

const FooterSmall = styled.span`
  font-size: 10px;
  color: rgba(255,255,255,0.2);
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [tickerData, setTickerData] = useState(TICKER_ITEMS);
  const [previewAssets, setPreviewAssets] = useState(PREVIEW_ASSETS);
  const [lang, setLang] = useState(i18n.language?.startsWith('en') ? 'en' : 'pt');

  function handleLangChange(newLang) {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  }

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  // Fetch BTC price from coingecko
  useEffect(() => {
    (async () => {
      try {
        const data = await coingeckoPrices('bitcoin');
        if (data?.bitcoin) {
          setTickerData(prev => prev.map(t =>
            t.sym === 'BTC'
              ? { ...t, price: data.bitcoin.usd, change: +(data.bitcoin.usd_24h_change || 0).toFixed(2) }
              : t
          ));
        }
      } catch {}
    })();
  }, []);

  // Price animation for terminal preview
  useEffect(() => {
    const id = setInterval(() => {
      setPreviewAssets(prev => prev.map(a => {
        const drift = (Math.random() - 0.5) * 0.0016;
        const newPrice = +(a.price * (1 + drift)).toFixed(2);
        const newChange = +(a.change + drift * 100).toFixed(2);
        return { ...a, price: newPrice, change: newChange };
      }));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const tickerDup = [...tickerData, ...tickerData];

  return (
    <>
      <GlobalFonts />
      <Page>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <GMTHomepageHeader
          lang={lang}
          onLangChange={handleLangChange}
          onSignIn={() => navigate('/login')}
          onSignUp={() => navigate('/register')}
        />

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <Hero>
          <GridOverlay />
          <GradientOrb />
          <HeroInner>
            <HeroEyebrow>{t('hero.eyebrow')}</HeroEyebrow>
            <Headline>
              {t('hero.headline_1') + '\n' + t('hero.headline_2')}
            </Headline>
            <Subline>
              {t('hero.subline')}
            </Subline>
            <CTARow>
              <PrimaryBtn onClick={() => navigate('/mini')}>{t('hero.cta_primary')}</PrimaryBtn>
              <SecondaryBtn onClick={() => navigate('/terminal')}>{t('hero.cta_secondary')}</SecondaryBtn>
            </CTARow>
          </HeroInner>
        </Hero>

        {/* ── TICKER STRIP ────────────────────────────────────────────────── */}
        <TickerSection>
          <TickerTrack>
            {tickerDup.map((t, i) => {
              const hasData = t.price != null;
              const pos = hasData && t.change > 0;
              const neg = hasData && t.change < 0;
              return (
                <TickerItem key={i}>
                  <TickerDiamond>&#9670;</TickerDiamond>
                  <TickerSym>{t.sym}</TickerSym>
                  <TickerPrice>{formatTickerPrice(t.sym, t.price)}</TickerPrice>
                  <TickerChange $pos={pos} $neg={neg}>
                    {hasData ? `${pos ? '+' : ''}${t.change.toFixed(2)}%` : '\u2014'}
                  </TickerChange>
                </TickerItem>
              );
            })}
          </TickerTrack>
        </TickerSection>

        {/* ── PRODUCTS ───────────────────────────────────────────────────── */}
        <section id="capabilities">
          <SectionWrap>
            <Eyebrow>{t('products.eyebrow')}</Eyebrow>
            <SectionTitle>{t('products.title')}</SectionTitle>
            <SectionSub>{t('products.subtitle')}</SectionSub>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Card 1 — Terminal Mini */}
              <div style={{ border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 28 }}>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: '#4ade80', background: 'rgba(74,222,128,0.15)', border: '0.5px solid rgba(74,222,128,0.3)', borderRadius: 20, fontSize: 10, padding: '2px 8px', fontFamily: "'JetBrains Mono', monospace" }}>{t('products.mini_label')}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: 'rgba(255,255,255,0.92)', marginBottom: 10 }}>{t('products.mini_name')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 20 }}>{t('products.mini_desc')}</div>
                <div style={{ marginBottom: 20 }}>
                  {[t('products.mini_f1'), t('products.mini_f2'), t('products.mini_f3'), t('products.mini_f4')].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
                      <span style={{ color: '#4ade80', fontSize: 10 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/mini')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', padding: '10px 28px', width: '100%', transition: 'border-color 0.15s, color 0.15s' }}>
                  {t('products.mini_cta')}
                </button>
              </div>

              {/* Card 2 — Terminal Pro (featured) */}
              <div style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: 28, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.15)', border: '0.5px solid rgba(96,165,250,0.3)', borderRadius: 20, fontSize: 10, padding: '2px 8px', fontFamily: "'JetBrains Mono', monospace" }}>{t('products.pro_badge')}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 20, fontSize: 10, padding: '2px 8px', fontFamily: "'JetBrains Mono', monospace" }}>{t('products.pro_label')}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: 'rgba(255,255,255,0.92)', marginBottom: 10 }}>{t('products.pro_name')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 20 }}>{t('products.pro_desc')}</div>
                <div style={{ marginBottom: 20 }}>
                  {[t('products.pro_f1'), t('products.pro_f2'), t('products.pro_f3'), t('products.pro_f4'), t('products.pro_f5')].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
                      <span style={{ color: '#4ade80', fontSize: 10 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/register')} style={{ background: 'white', border: 'none', borderRadius: 8, color: '#080f1a', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', padding: '10px 28px', width: '100%', transition: 'opacity 0.15s' }}>
                  {t('products.pro_cta')}
                </button>
              </div>

              {/* Card 3 — Club Management */}
              <div style={{ border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 28 }}>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', border: '0.5px solid rgba(251,191,36,0.3)', borderRadius: 20, fontSize: 10, padding: '2px 8px', fontFamily: "'JetBrains Mono', monospace" }}>{t('products.club_label')}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: 'rgba(255,255,255,0.92)', marginBottom: 10 }}>{t('products.club_name')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 20 }}>{t('products.club_desc')}</div>
                <div style={{ marginBottom: 20 }}>
                  {[t('products.club_f1'), t('products.club_f2'), t('products.club_f3'), t('products.club_f4')].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
                      <span style={{ color: '#4ade80', fontSize: 10 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/clube')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', padding: '10px 28px', width: '100%', transition: 'border-color 0.15s, color 0.15s' }}>
                  {t('products.club_cta')}
                </button>
              </div>
            </div>
          </SectionWrap>
        </section>

        {/* ── GLOBAL vs BRASIL ────────────────────────────────────────────── */}
        <SectionWrap>
          <Eyebrow>{t('coverage.eyebrow')}</Eyebrow>
          <SectionTitle>{t('coverage.title')}</SectionTitle>
          <SectionSub>{t('coverage.subtitle')}</SectionSub>
          <SplitGrid>
            <SplitCard>
              <SplitHeader>
                <MarketName>Global</MarketName>
                <IndexChange $pos>S&amp;P 500 +0.41%</IndexChange>
              </SplitHeader>
              {GLOBAL_ROWS.map((r, i) => (
                <SplitRow key={i}>
                  <RowSym>{r.sym}</RowSym>
                  <RowName>{r.name}</RowName>
                  <RowPrice>{r.price}</RowPrice>
                  <RowChange $pos={r.change > 0} $neg={r.change < 0}>
                    {r.change > 0 ? '+' : ''}{r.change.toFixed(2)}%
                  </RowChange>
                </SplitRow>
              ))}
            </SplitCard>
            <SplitCard>
              <SplitHeader>
                <MarketName>Brasil</MarketName>
                <IndexChange $pos>IBOV +0.74%</IndexChange>
              </SplitHeader>
              {BRASIL_ROWS.map((r, i) => (
                <SplitRow key={i}>
                  <RowSym>{r.sym}</RowSym>
                  <RowName>{r.name}</RowName>
                  <RowPrice>{r.price}</RowPrice>
                  <RowChange $pos={r.change != null && r.change > 0} $neg={r.change != null && r.change < 0}>
                    {r.change != null ? `${r.change > 0 ? '+' : ''}${r.change.toFixed(2)}%` : '\u2014'}
                  </RowChange>
                </SplitRow>
              ))}
            </SplitCard>
          </SplitGrid>
        </SectionWrap>

        {/* ── NUMBERS ─────────────────────────────────────────────────────── */}
        <SectionWrap>
          <Eyebrow>{t('numbers.eyebrow')}</Eyebrow>
          <SectionTitle>{t('numbers.title')}</SectionTitle>
          <SectionSub>{t('numbers.subtitle')}</SectionSub>
          <MetricGrid>
            {[
              { num: '269', labelKey: 'numbers.assets' },
              { num: '8',   labelKey: 'numbers.sources' },
              { num: '30s', labelKey: 'numbers.refresh' },
              { num: '9',   labelKey: 'numbers.groups' },
            ].map((m, i) => (
              <MetricItem key={i}>
                <MetricNum>{m.num}</MetricNum>
                <MetricLabel>{t(m.labelKey)}</MetricLabel>
              </MetricItem>
            ))}
          </MetricGrid>
          <SourceRow>
            {SOURCES.map(s => (
              <SourceTag key={s}>{s}</SourceTag>
            ))}
          </SourceRow>
        </SectionWrap>

        {/* ── TERMINAL PREVIEW ────────────────────────────────────────────── */}
        <SectionWrap>
          <Eyebrow>{t('preview.eyebrow')}</Eyebrow>
          <SectionTitle>{t('preview.title')}</SectionTitle>
          <SectionSub>{t('preview.subtitle')}</SectionSub>
          <MockFrame>
            <MockTopBar>
              <Dots>
                <Dot $color="#ff5f57" />
                <Dot $color="#ffbd2e" />
                <Dot $color="#28c840" />
              </Dots>
              <TabRow>
                <Tab $active>Global</Tab>
                <Tab>Brasil</Tab>
                <Tab>Research &#128274;</Tab>
                <Tab>Sinais &#128274;</Tab>
                <Tab>Clube &#128274;</Tab>
              </TabRow>
            </MockTopBar>
            <MockBody>
              <Sidebar>
                <SidebarGroup>
                  <SidebarLabel>Equities</SidebarLabel>
                  <SidebarItem $active>Technology</SidebarItem>
                  <SidebarItem>Semiconductors</SidebarItem>
                  <SidebarItem>Financials</SidebarItem>
                  <SidebarItem>Healthcare</SidebarItem>
                </SidebarGroup>
                <SidebarGroup>
                  <SidebarLabel>Digital Assets</SidebarLabel>
                  <SidebarItem>Crypto</SidebarItem>
                </SidebarGroup>
                <SidebarGroup>
                  <SidebarLabel>Commodities</SidebarLabel>
                  <SidebarItem>Precious Metals</SidebarItem>
                  <SidebarItem>Energy</SidebarItem>
                </SidebarGroup>
              </Sidebar>
              <MockContent>
                {previewAssets.map(a => (
                  <AssetCard key={a.sym}>
                    <ACSym>{a.sym}</ACSym>
                    <ACName>{a.name}</ACName>
                    <ACPrice>${a.price.toFixed(2)}</ACPrice>
                    <ACChange $pos={a.change > 0} $neg={a.change < 0}>
                      {a.change > 0 ? '+' : ''}{a.change.toFixed(2)}%
                    </ACChange>
                  </AssetCard>
                ))}
              </MockContent>
            </MockBody>
          </MockFrame>
        </SectionWrap>

        {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
        <FinalCTA>
          <CTAH2>{t('final_cta.title')}</CTAH2>
          <CTAPara>{t('final_cta.subtitle')}</CTAPara>
          <CTARow>
            <PrimaryBtn onClick={() => navigate('/mini')}>{t('final_cta.primary')}</PrimaryBtn>
            <SecondaryBtn onClick={() => navigate('/register')}>{t('final_cta.secondary')}</SecondaryBtn>
          </CTARow>
        </FinalCTA>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <FooterWrap>
          <FooterInner>
            <FooterBrand>
              <FooterWordmark>GMT</FooterWordmark>
              <FooterTagline>
                {t('footer.tagline')}
              </FooterTagline>
            </FooterBrand>
            <div>
              <FooterColHeader>{t('footer.product')}</FooterColHeader>
              <FooterLink>{t('footer.terminal_global')}</FooterLink>
              <FooterLink>{t('footer.terminal_brasil')}</FooterLink>
              <FooterLink>{t('footer.research')}</FooterLink>
              <FooterLink>{t('footer.signal_engine')}</FooterLink>
              <FooterLink>{t('footer.clube')}</FooterLink>
            </div>
            <div>
              <FooterColHeader>{t('footer.company')}</FooterColHeader>
              <FooterLink>{t('footer.sobre')}</FooterLink>
              <FooterLink>{t('footer.contato')}</FooterLink>
            </div>
            <div>
              <FooterColHeader>{t('footer.legal')}</FooterColHeader>
              <FooterLink>{t('footer.privacidade')}</FooterLink>
              <FooterLink>{t('footer.termos')}</FooterLink>
              <FooterLink>{t('footer.disclaimer_link')}</FooterLink>
            </div>
          </FooterInner>
          <FooterBottom>
            <FooterSmall>{t('footer.disclaimer')}</FooterSmall>
            <FooterSmall>{t('footer.data_sources')}</FooterSmall>
          </FooterBottom>
        </FooterWrap>

      </Page>
    </>
  );
}
