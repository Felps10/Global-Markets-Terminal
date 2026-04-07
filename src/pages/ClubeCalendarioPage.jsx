import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Colors ────────────────────────────────────────────────────────────────────
const BG_PAGE  = '#080f1a';
const BG_CELL  = '#0d1829';
const BORDER   = 'rgba(255,255,255,0.06)';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const GOLD     = '#C5A059';
const ACCENT   = 'var(--c-accent)';

const MONO     = "'JetBrains Mono', monospace";
const SANS     = "'DM Sans', 'IBM Plex Sans', sans-serif";

const CATEGORY_COLORS = {
  assembleia:   '#3b82f6',
  fechamento:   '#C5A059',
  tributacao:   '#ef4444',
  movimentacao: '#00E676',
  nav:          '#6b7280',
};

const CATEGORY_LABELS = {
  assembleia:   'Assembleias',
  fechamento:   'Fechamento Mensal',
  tributacao:   'Tributação',
  movimentacao: 'Movimentações',
  nav:          'NAV',
};

const VIEWS = [
  { id: 'ano',    label: 'ANO' },
  { id: 'mes',    label: 'MÊS' },
  { id: 'semana', label: 'SEMANA' },
  { id: 'dia',    label: 'DIA' },
];

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ── Module-level cache ────────────────────────────────────────────────────────
const _calCache   = {};
const _calCacheTs = {};
const CAL_TTL_MS  = 2 * 60 * 1000;

// ── Date helpers ──────────────────────────────────────────────────────────────
function toISO(d) { return d.toISOString().split('T')[0]; }
function todayISO() { return toISO(new Date()); }

function lastBusinessDay(year, month) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  while (lastDay.getUTCDay() === 0 || lastDay.getUTCDay() === 6) {
    lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  }
  return lastDay.toISOString().split('T')[0];
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let week = new Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    dates.push(toISO(dd));
  }
  return dates;
}

function pad2(n) { return String(n).padStart(2, '0'); }
function dateKey(year, month, day) { return `${year}-${pad2(month + 1)}-${pad2(day)}`; }

// ── Compute fechamento dates ──────────────────────────────────────────────────
function computeFechamentos() {
  const now = new Date();
  const events = [];
  const todayStr = todayISO();
  for (let offset = -12; offset <= 6; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const dt = lastBusinessDay(y, m);
    events.push({
      id: `fechamento-${dt}`,
      category: 'fechamento',
      date: dt,
      title: 'Fechamento Mensal',
      status: dt <= todayStr ? 'realizado' : 'agendado',
      detail: { tipo: 'monthly_close' },
      linkPath: null,
    });
  }
  return events;
}

// ── Compute upcoming tributação dates ─────────────────────────────────────────
function computeUpcomingTributacao() {
  const now = new Date();
  const year = now.getFullYear();
  const candidates = [
    new Date(Date.UTC(year, 4, 31)),
    new Date(Date.UTC(year, 10, 30)),
    new Date(Date.UTC(year + 1, 4, 31)),
  ];
  for (const d of candidates) {
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      d.setUTCDate(d.getUTCDate() - 1);
    }
  }
  const todayStr = todayISO();
  return candidates
    .filter(d => d.toISOString().split('T')[0] >= todayStr)
    .map(d => {
      const dt = d.toISOString().split('T')[0];
      return {
        id: `tributacao-upcoming-${dt}`,
        category: 'tributacao',
        date: dt,
        title: 'Tributação Periódica',
        status: 'agendado',
        detail: { tipo: 'tax_date' },
        linkPath: null,
      };
    });
}

// ── Normalize API data into unified events ───────────────────────────────────
function normalizeEvents(assembleias, movimentacoes, navHistory, tribHistorico, clubeId, navAttrMap = {}) {
  const events = [];

  for (const a of (assembleias ?? [])) {
    if (!a.data_realizacao) continue;
    events.push({
      id: `assembleia-${a.id}`,
      category: 'assembleia',
      date: a.data_realizacao,
      title: a.tipo === 'ordinaria' ? 'AGO' : 'AGE',
      status: a.status,
      detail: a,
      linkPath: `/clube/${clubeId}/governanca`,
    });
  }

  for (const m of (movimentacoes ?? [])) {
    if (!m.data_solicitacao) continue;
    events.push({
      id: `movimentacao-${m.id}`,
      category: 'movimentacao',
      date: m.data_solicitacao,
      title: `${m.tipo === 'aporte' ? 'Aporte' : 'Resgate'} · ${m.cotista_nome ?? ''}`,
      status: m.status,
      detail: m,
      linkPath: `/clube/${clubeId}?tab=fila-operacoes`,
    });
  }

  for (const n of (navHistory ?? [])) {
    if (!n.data) continue;
    events.push({
      id: `nav-${n.id}`,
      category: 'nav',
      date: n.data,
      title: `NAV ${Number(n.valor_cota).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      status: 'registrado',
      detail: { ...n, registered_by: navAttrMap[String(n.id)] ?? null },
      linkPath: `/clube/${clubeId}/nav`,
    });
  }

  for (const t of (tribHistorico ?? [])) {
    const state = t.after_state ?? {};
    const dt = state.dataRef ?? t.created_at?.split('T')[0];
    if (!dt) continue;
    events.push({
      id: `tributacao-${t.id}`,
      category: 'tributacao',
      date: dt,
      title: `IRRF ${Number(state.totalTaxBrl ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      status: 'executado',
      detail: t,
      linkPath: `/clube/${clubeId}/simulador`,
    });
  }

  events.push(...computeFechamentos());
  events.push(...computeUpcomingTributacao());

  return events;
}

// ── Popover component ─────────────────────────────────────────────────────────
function EventPopover({ event, onClose, navigate }) {
  const color = CATEGORY_COLORS[event.category];
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: BG_CELL, border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        padding: 20, width: 320, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 4, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color, textTransform: 'uppercase' }}>
              {CATEGORY_LABELS[event.category]}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: TXT_1, fontWeight: 500, marginTop: 2 }}>
              {event.title}
            </div>
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, marginBottom: 8 }}>
          {event.date.split('-').reverse().join('/')}
        </div>
        <div style={{
          display: 'inline-flex', padding: '2px 7px', borderRadius: 3,
          background: `${color}20`, border: `1px solid ${color}40`,
          fontFamily: MONO, fontSize: 9, color, letterSpacing: '0.08em',
        }}>
          {(event.status ?? '').toUpperCase()}
        </div>
        {event.category === 'nav' && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, marginTop: 10 }}>
            Registrado por: {event.detail?.registered_by ?? '—'}
          </div>
        )}
        {event.linkPath && (
          <button
            onClick={() => { navigate(event.linkPath); onClose(); }}
            style={{
              display: 'block', marginTop: 14, width: '100%',
              padding: '7px 0', fontFamily: MONO, fontSize: 10,
              letterSpacing: '0.08em', borderRadius: 3,
              background: 'transparent', border: `1px solid ${BORDER}`,
              color: TXT_2, cursor: 'pointer', textAlign: 'center',
            }}
          >Ver detalhes →</button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function ClubeCalendarioPage() {
  const navigate = useNavigate();
  const { id: clubeIdParam } = useParams();
  const { getToken } = useAuth();

  const [clube,    setClube]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [events,   setEvents]   = useState([]);

  const [view,       setView]       = useState('mes');
  const [focusDate,  setFocusDate]  = useState(() => new Date());
  const [miniMonth,  setMiniMonth]  = useState(() => new Date());
  const [visibleCats, setVisibleCats] = useState(() => new Set(Object.keys(CATEGORY_COLORS)));
  const [popover,    setPopover]    = useState(null);

  const today = todayISO();
  const focusYear  = focusDate.getFullYear();
  const focusMonth = focusDate.getMonth();
  const focusDay   = focusDate.getDate();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCalendarData = useCallback(async () => {
    const cacheKey = `calendario-${clubeIdParam}`;
    if (_calCache[cacheKey] && Date.now() - (_calCacheTs[cacheKey] ?? 0) < CAL_TTL_MS) {
      const cached = _calCache[cacheKey];
      setClube(cached.clube);
      setEvents(cached.events);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const clubeRes = await fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}`, { headers });
      if (!clubeRes.ok) { setLoading(false); return; }
      const c = await clubeRes.json();
      setClube(c);

      const [asmRes, movRes, navRes, tribRes, navAuditRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/clubes/${c.id}/assembleias`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${c.id}/movimentacoes`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${c.id}/nav`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${c.id}/tributacao/historico`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${c.id}/audit-log?action=nav.registrar`, { headers }),
      ]);

      const assembleias   = asmRes.status  === 'fulfilled' && asmRes.value.ok  ? await asmRes.value.json()  : [];
      const movimentacoes = movRes.status  === 'fulfilled' && movRes.value.ok  ? await movRes.value.json()  : [];
      const navHistory    = navRes.status  === 'fulfilled' && navRes.value.ok  ? await navRes.value.json()  : [];
      const tribHistorico = tribRes.status === 'fulfilled' && tribRes.value.ok ? await tribRes.value.json() : [];
      const navAuditLog   = navAuditRes.status === 'fulfilled' && navAuditRes.value.ok ? await navAuditRes.value.json() : [];

      // Build nav attribution map: record_id → registered_by_name
      const navAttrMap = {};
      for (const entry of navAuditLog) {
        if (entry.record_id) navAttrMap[entry.record_id] = entry.after_state?.registered_by_name ?? '—';
      }

      const normalized = normalizeEvents(assembleias, movimentacoes, navHistory, tribHistorico, c.id, navAttrMap);
      setEvents(normalized);

      _calCache[cacheKey]   = { clube: c, events: normalized };
      _calCacheTs[cacheKey] = Date.now();
    } catch (_) {}
    finally { setLoading(false); }
  }, [getToken, clubeIdParam]);

  useEffect(() => { fetchCalendarData(); }, [fetchCalendarData]);

  // ── Derived: events grouped by date, filtered by visible categories ────────
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!visibleCats.has(ev.category)) continue;
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events, visibleCats]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToday = () => { setFocusDate(new Date()); setView('mes'); };

  const goPrev = () => {
    const d = new Date(focusDate);
    if (view === 'ano')    d.setFullYear(d.getFullYear() - 1);
    else if (view === 'mes')    d.setMonth(d.getMonth() - 1);
    else if (view === 'semana') d.setDate(d.getDate() - 7);
    else                        d.setDate(d.getDate() - 1);
    setFocusDate(d);
  };

  const goNext = () => {
    const d = new Date(focusDate);
    if (view === 'ano')    d.setFullYear(d.getFullYear() + 1);
    else if (view === 'mes')    d.setMonth(d.getMonth() + 1);
    else if (view === 'semana') d.setDate(d.getDate() + 7);
    else                        d.setDate(d.getDate() + 1);
    setFocusDate(d);
  };

  const periodLabel = view === 'ano'
    ? String(focusYear)
    : view === 'mes'
    ? `${MONTH_LABELS[focusMonth]} ${focusYear}`
    : view === 'semana'
    ? (() => {
        const wk = getWeekDates(focusDate);
        return `${wk[0].split('-').reverse().join('/')} — ${wk[6].split('-').reverse().join('/')}`;
      })()
    : `${pad2(focusDay)}/${pad2(focusMonth + 1)}/${focusYear}`;

  // ── Toggle category ────────────────────────────────────────────────────────
  const toggleCat = (cat) => {
    setVisibleCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // ── Event block renderer ───────────────────────────────────────────────────
  const renderEventBlock = (ev, compact = false) => {
    const color = CATEGORY_COLORS[ev.category];
    return (
      <div
        key={ev.id}
        onClick={(e) => { e.stopPropagation(); setPopover(ev); }}
        style={{
          background: `${color}d9`, color: '#fff',
          borderRadius: 3, padding: compact ? '1px 4px' : '2px 6px',
          fontSize: compact ? 8 : 10, fontFamily: SANS,
          cursor: 'pointer', overflow: 'hidden',
          whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          lineHeight: 1.4,
        }}
      >{ev.title}</div>
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em' }}>CALENDÁRIO</div>
        <div style={{ fontSize: 12, color: TXT_2 }}>Carregando eventos...</div>
      </div>
    );
  }

  if (!clube) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO }}>
        <div style={{ fontSize: 12, color: TXT_2 }}>Nenhum clube encontrado.</div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Mini month navigator ───────────────────────────────────────────────────
  const miniYear  = miniMonth.getFullYear();
  const miniMo    = miniMonth.getMonth();
  const miniGrid  = getMonthGrid(miniYear, miniMo);

  const miniNavigator = (
    <div style={{ marginBottom: 20 }}>
      {/* Mini month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={() => setMiniMonth(new Date(miniYear, miniMo - 1, 1))} style={{ background: 'none', border: 'none', color: TXT_3, cursor: 'pointer', fontFamily: MONO, fontSize: 12 }}>‹</button>
        <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, letterSpacing: '0.06em' }}>
          {MONTH_LABELS[miniMo].slice(0, 3).toUpperCase()} {miniYear}
        </span>
        <button onClick={() => setMiniMonth(new Date(miniYear, miniMo + 1, 1))} style={{ background: 'none', border: 'none', color: TXT_3, cursor: 'pointer', fontFamily: MONO, fontSize: 12 }}>›</button>
      </div>
      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 2 }}>
        {WEEKDAY_LABELS.map(w => (
          <div key={w} style={{ fontFamily: MONO, fontSize: 8, color: TXT_3, letterSpacing: '0.04em' }}>{w.charAt(0)}</div>
        ))}
      </div>
      {/* Day grid */}
      {miniGrid.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
          {week.map((day, di) => {
            if (!day) return <div key={di} />;
            const dk = dateKey(miniYear, miniMo, day);
            const isToday = dk === today;
            const dayEvents = eventsByDate[dk];
            const dotColor = dayEvents ? CATEGORY_COLORS[dayEvents[0].category] : null;
            return (
              <div
                key={di}
                onClick={() => { setFocusDate(new Date(miniYear, miniMo, day)); setView('dia'); }}
                style={{
                  padding: '3px 0', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? GOLD : 'transparent',
                  color: isToday ? '#080f1a' : TXT_2,
                  fontFamily: MONO, fontSize: 10, fontWeight: isToday ? 700 : 400,
                }}>{day}</div>
                {dotColor && (
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: dotColor }} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // ── Category legend ────────────────────────────────────────────────────────
  const categoryLegend = (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
        CATEGORIAS
      </div>
      {Object.keys(CATEGORY_COLORS).map(cat => {
        const active = visibleCats.has(cat);
        return (
          <div
            key={cat}
            onClick={() => toggleCat(cat)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 0', cursor: 'pointer',
              opacity: active ? 1 : 0.35,
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: CATEGORY_COLORS[cat], flexShrink: 0,
            }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>
              {CATEGORY_LABELS[cat]}
            </span>
          </div>
        );
      })}
    </div>
  );

  // ── MÊS view ──────────────────────────────────────────────────────────────
  const monthGrid = getMonthGrid(focusYear, focusMonth);

  const renderMonthView = () => (
    <div>
      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${BORDER}` }}>
        {WEEKDAY_LABELS.map(w => (
          <div key={w} style={{
            padding: '6px 8px', fontFamily: MONO, fontSize: 9,
            color: TXT_3, letterSpacing: '0.08em', textAlign: 'center',
          }}>{w}</div>
        ))}
      </div>
      {/* Weeks */}
      {monthGrid.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {week.map((day, di) => {
            if (!day) return <div key={di} style={{ minHeight: 90, background: BG_PAGE, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} />;
            const dk = dateKey(focusYear, focusMonth, day);
            const isToday = dk === today;
            const dayEvs = eventsByDate[dk] ?? [];
            const showCount = dayEvs.length > 3;
            const displayed = showCount ? dayEvs.slice(0, 2) : dayEvs;

            return (
              <div
                key={di}
                onClick={() => { setFocusDate(new Date(focusYear, focusMonth, day)); setView('dia'); }}
                style={{
                  minHeight: 90, padding: '4px 6px',
                  background: BG_CELL, cursor: 'pointer',
                  borderRight: `1px solid ${BORDER}`,
                  borderBottom: `1px solid ${BORDER}`,
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
              >
                <div style={{
                  fontFamily: MONO, fontSize: 11,
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? GOLD : 'transparent',
                  color: isToday ? '#080f1a' : TXT_1,
                  fontWeight: isToday ? 700 : 400,
                  marginBottom: 2,
                }}>{day}</div>
                {displayed.map(ev => renderEventBlock(ev, true))}
                {showCount && (
                  <div style={{
                    fontFamily: MONO, fontSize: 8, color: TXT_3,
                    padding: '1px 4px', borderRadius: 2,
                    background: 'rgba(255,255,255,0.04)',
                  }}>+{dayEvs.length - 2} mais</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // ── SEMANA view ────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const weekDates = getWeekDates(focusDate);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
        {weekDates.map((dk, i) => {
          const isToday = dk === today;
          const dayEvs = eventsByDate[dk] ?? [];
          const [, m, d] = dk.split('-');
          return (
            <div key={dk} style={{
              borderRight: `1px solid ${BORDER}`,
              display: 'flex', flexDirection: 'column',
              borderTop: isToday ? `2px solid ${GOLD}` : `2px solid transparent`,
            }}>
              {/* Column header */}
              <div style={{
                padding: '8px 6px', textAlign: 'center',
                borderBottom: `1px solid ${BORDER}`,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3 }}>{WEEKDAY_LABELS[i]}</div>
                <div style={{
                  fontFamily: MONO, fontSize: 14, marginTop: 2,
                  color: isToday ? GOLD : TXT_1,
                  fontWeight: isToday ? 700 : 400,
                }}>{Number(d)}</div>
              </div>
              {/* Events */}
              <div style={{ flex: 1, padding: 4, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
                {dayEvs.map(ev => renderEventBlock(ev))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── DIA view ───────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const dk = toISO(focusDate);
    const dayEvs = eventsByDate[dk] ?? [];
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          {WEEKDAY_LABELS[focusDate.getDay()]}, {pad2(focusDay)}/{pad2(focusMonth + 1)}/{focusYear}
        </div>
        {dayEvs.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: TXT_3 }}>
            Nenhum evento nesta data.
          </div>
        )}
        {dayEvs.map(ev => {
          const color = CATEGORY_COLORS[ev.category];
          return (
            <div
              key={ev.id}
              onClick={() => setPopover(ev)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', marginBottom: 6,
                background: BG_CELL, borderRadius: 4,
                borderLeft: `4px solid ${color}`,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 9, color, letterSpacing: '0.08em', width: 90, flexShrink: 0, textTransform: 'uppercase' }}>
                {CATEGORY_LABELS[ev.category]}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 12, color: TXT_1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.title}
              </span>
              <span style={{
                fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 3,
                background: `${color}20`, border: `1px solid ${color}40`, color,
              }}>{(ev.status ?? '').toUpperCase()}</span>
              {ev.linkPath && (
                <span style={{ color: TXT_3, fontSize: 12, flexShrink: 0 }}>→</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── ANO view ───────────────────────────────────────────────────────────────
  const renderYearView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      {Array.from({ length: 12 }, (_, mo) => {
        const grid = getMonthGrid(focusYear, mo);
        return (
          <div
            key={mo}
            onClick={() => { setFocusDate(new Date(focusYear, mo, 1)); setView('mes'); }}
            style={{
              background: BG_CELL, borderRadius: 6, padding: 12, cursor: 'pointer',
              border: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, marginBottom: 6, letterSpacing: '0.06em' }}>
              {MONTH_LABELS[mo].slice(0, 3).toUpperCase()}
            </div>
            {/* Weekday header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 2 }}>
              {WEEKDAY_LABELS.map(w => (
                <div key={w} style={{ fontFamily: MONO, fontSize: 7, color: TXT_3 }}>{w.charAt(0)}</div>
              ))}
            </div>
            {grid.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                {week.map((day, di) => {
                  if (!day) return <div key={di} style={{ height: 14 }} />;
                  const dk = dateKey(focusYear, mo, day);
                  const isToday = dk === today;
                  const dayEvs = eventsByDate[dk];
                  const dotColor = dayEvs ? CATEGORY_COLORS[dayEvs[0].category] : null;
                  return (
                    <div key={di} style={{
                      height: 14, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{
                        fontFamily: MONO, fontSize: 8,
                        color: isToday ? GOLD : TXT_3,
                        fontWeight: isToday ? 700 : 400,
                      }}>{day}</div>
                      {dotColor && (
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: dotColor, marginTop: -1 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <ClubeShell
      clubeId={clubeIdParam}
      activePage="calendario"
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={null}
      valorCota={null}
      cotasEmitidas={null}
      pendingCount={0}
      headerLeft={
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: TXT_2 }}>
          <span style={{ color: GOLD }}>CALENDÁRIO</span>
        </span>
      }
      headerRight={null}
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <div style={{
          width: 220, flexShrink: 0, borderRight: `1px solid ${BORDER}`,
          overflowY: 'auto', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {miniNavigator}
          {categoryLegend}
        </div>

        {/* ── MAIN AREA ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header bar */}
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '10px 20px',
            borderBottom: `1px solid ${BORDER}`,
          }}>
            {/* Left: arrows + period label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={goPrev} style={{ background: 'none', border: 'none', color: TXT_3, cursor: 'pointer', fontFamily: MONO, fontSize: 14 }}>‹</button>
              <span style={{ fontFamily: MONO, fontSize: 13, color: TXT_1, letterSpacing: '0.04em', minWidth: 160 }}>
                {periodLabel}
              </span>
              <button onClick={goNext} style={{ background: 'none', border: 'none', color: TXT_3, cursor: 'pointer', fontFamily: MONO, fontSize: 14 }}>›</button>
              <button onClick={goToday} style={{
                marginLeft: 8, padding: '3px 10px', fontFamily: MONO, fontSize: 9,
                letterSpacing: '0.08em', borderRadius: 3,
                background: 'transparent', border: `1px solid ${BORDER}`,
                color: TXT_2, cursor: 'pointer',
              }}>HOJE</button>
            </div>

            {/* Right: view toggle */}
            <div style={{ display: 'flex', gap: 0 }}>
              {VIEWS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  style={{
                    padding: '6px 14px', fontFamily: MONO, fontSize: 9,
                    letterSpacing: '0.08em', border: 'none',
                    borderBottom: `2px solid ${view === id ? GOLD : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    color: view === id ? TXT_1 : TXT_3,
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: view === 'semana' ? 0 : 16 }}>
            {view === 'mes'    && renderMonthView()}
            {view === 'semana' && renderWeekView()}
            {view === 'dia'    && renderDayView()}
            {view === 'ano'    && renderYearView()}
          </div>
        </div>
      </div>

      {/* Popover */}
      {popover && (
        <EventPopover event={popover} onClose={() => setPopover(null)} navigate={navigate} />
      )}
    </ClubeShell>
  );
}
