const MONO   = "'JetBrains Mono', monospace";
const TXT_2  = '#94a3b8';
const TXT_3  = '#475569';
const ACCENT = 'var(--c-accent)';
const GREEN  = '#00E676';
const AMBER  = '#fbbf24';

export default function NavChart({ navSeries, ibovSeries, cdiSeries, inceptionNAV }) {
  if (!navSeries || navSeries.length < 2) {
    return (
      <div style={{
        height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 8,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_3, textAlign: 'center', lineHeight: 1.8 }}>
          Histórico insuficiente para exibir gráfico.<br />
          Registre entradas de NAV diárias para visualizar a evolução.
        </div>
      </div>
    );
  }

  const W = 800, H = 180;
  const PAD = { t: 12, r: 20, b: 12, l: 20 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const N  = navSeries.length;

  const allVals = [
    ...navSeries.map(p => p.nav),
    ...ibovSeries.map(p => p.nav),
    ...cdiSeries.map(p => p.nav),
  ];
  const minV  = Math.min(...allVals);
  const maxV  = Math.max(...allVals);
  const range = maxV - minV || 1;

  const toX = (i) => PAD.l + (i / Math.max(N - 1, 1)) * cW;
  const toY = (v) => PAD.t + cH - ((v - minV) / range) * cH;

  const pts = (series) =>
    series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.nav).toFixed(1)}`).join(' ');

  const baseY = toY(inceptionNAV).toFixed(1);

  return (
    <div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        {/* Inception baseline */}
        <line
          x1={PAD.l} y1={baseY} x2={W - PAD.r} y2={baseY}
          stroke={TXT_3} strokeWidth={1} strokeDasharray="4,3"
        />
        {/* CDI */}
        <polyline points={pts(cdiSeries)}  fill="none" stroke={GREEN} strokeWidth={1.5} />
        {/* IBOV */}
        <polyline points={pts(ibovSeries)} fill="none" stroke={AMBER} strokeWidth={1.5} />
        {/* Portfolio NAV */}
        <polyline points={pts(navSeries)}  fill="none" stroke={ACCENT} strokeWidth={1.5} />
      </svg>
      {/* Legend */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 16,
        padding: '6px 20px 0',
      }}>
        {[['Portfolio', ACCENT], ['IBOV', AMBER], ['CDI', GREEN]].map(([label, color]) => (
          <span key={label} style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
