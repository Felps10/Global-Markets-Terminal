import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';
import { CLUBE_COLORS, CLUBE_FONTS } from '../clube/styles/index.js';

const API = import.meta.env.VITE_API_URL || '';

const C        = CLUBE_COLORS;
const BG_CARD  = C.bgCard;
const BG_CARD2 = C.bgCardElevated;
const BORDER   = C.borderSubtle;
const BORDER2  = C.borderFaint;
const TXT_1    = C.textPrimary;
const TXT_2    = C.textMain;
const TXT_3    = C.textDim;
const ACCENT   = C.accent;
const GREEN    = C.green;
const RED      = C.red;
const MONO     = CLUBE_FONTS.mono;

export default function ClubeEstatutoPage() {
  const { id: clubeIdParam } = useParams();
  const { getToken } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────────
  const [clube,              setClube]              = useState(null);
  const [estatuto,           setEstatuto]           = useState(null);
  const [estatutoHistory,    setEstatutoHistory]    = useState([]);
  const [estatutoLoading,    setEstatutoLoading]    = useState(false);
  const [showNewStatuteForm, setShowNewStatuteForm] = useState(false);
  const [newStatuteValues,   setNewStatuteValues]   = useState({
    valid_from:            '',
    prazo_conversao_dias:  '',
    prazo_pagamento_dias:  '',
    carencia_dias:         '',
    taxa_administracao:    '',
    taxa_performance:      '',
    benchmark_performance: '',
    permite_derivativos:   false,
    irrf_rate:             '',
    regime_tributario:     'fia',
    politica_investimento: '',
    versao_nota:           '',
  });
  const [statuteSubmitting, setStatuteSubmitting] = useState(false);
  const [statuteError,      setStatuteError]      = useState(null);
  const [auditLog,          setAuditLog]          = useState([]);
  const [auditLoading,      setAuditLoading]      = useState(false);
  const [auditFilter,       setAuditFilter]       = useState('');

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchEstatuto = useCallback(async (clubeId) => {
    if (!clubeId) return;
    setEstatutoLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [activeRes, histRes] = await Promise.all([
        fetch(`${API}/api/v1/clubes/${clubeId}/estatuto/active`, { headers }),
        fetch(`${API}/api/v1/clubes/${clubeId}/estatuto/history`, { headers }),
      ]);
      const activeData = activeRes.ok ? await activeRes.json() : null;
      const histData   = histRes.ok  ? await histRes.json()   : [];
      setEstatuto(activeData);
      setEstatutoHistory(Array.isArray(histData) ? histData : []);
      if (activeData) {
        setNewStatuteValues({
          prazo_conversao_dias:  activeData.prazo_conversao_dias,
          prazo_pagamento_dias:  activeData.prazo_pagamento_dias,
          carencia_dias:         activeData.carencia_dias,
          taxa_administracao:    (activeData.taxa_administracao * 100).toFixed(4),
          taxa_performance:      (activeData.taxa_performance * 100).toFixed(4),
          benchmark_performance: activeData.benchmark_performance ?? '',
          permite_derivativos:   activeData.permite_derivativos,
          irrf_rate:             (activeData.irrf_rate * 100).toFixed(2),
          regime_tributario:     activeData.regime_tributario ?? 'fia',
          politica_investimento: activeData.politica_investimento ?? '',
          versao_nota:           '',
          valid_from:            '',
        });
      }
    } catch (err) {
      console.error('[fetchEstatuto]', err.message);
    } finally {
      setEstatutoLoading(false);
    }
  }, [getToken]);

  // ── Mount: fetch clube, estatuto, audit log ───────────────────────────────
  useEffect(() => {
    if (!clubeIdParam) return;

    async function loadAll() {
      try {
        const token = await getToken();
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        // Clube
        const clubeRes = await fetch(`${API}/api/v1/clubes/${clubeIdParam}`, { headers });
        if (clubeRes.ok) setClube(await clubeRes.json());

        // Estatuto (active + history)
        await fetchEstatuto(clubeIdParam);

        // Audit log
        setAuditLoading(true);
        try {
          const auditRes = await fetch(
            `${API}/api/v1/clubes/${clubeIdParam}/audit-log?limit=50`,
            { headers }
          );
          if (auditRes.ok) setAuditLog(await auditRes.json());
        } catch (_) {}
        finally { setAuditLoading(false); }

      } catch (err) {
        console.error('[ClubeEstatutoPage mount]', err.message);
      }
    }

    loadAll();
  }, [clubeIdParam, getToken, fetchEstatuto]);

  // ── Submit new statute ────────────────────────────────────────────────────
  const submitNewStatute = useCallback(async () => {
    if (!clube?.id) return;
    setStatuteSubmitting(true);
    setStatuteError(null);
    try {
      const token = await getToken();
      const payload = {
        valid_from:            newStatuteValues.valid_from,
        prazo_conversao_dias:  Number(newStatuteValues.prazo_conversao_dias),
        prazo_pagamento_dias:  Number(newStatuteValues.prazo_pagamento_dias),
        carencia_dias:         Number(newStatuteValues.carencia_dias),
        taxa_administracao:    parseFloat(newStatuteValues.taxa_administracao) / 100,
        taxa_performance:      parseFloat(newStatuteValues.taxa_performance) / 100,
        benchmark_performance: newStatuteValues.benchmark_performance || null,
        permite_derivativos:   Boolean(newStatuteValues.permite_derivativos),
        irrf_rate:             parseFloat(newStatuteValues.irrf_rate) / 100,
        regime_tributario:     newStatuteValues.regime_tributario || 'fia',
        politica_investimento: newStatuteValues.politica_investimento || null,
        versao_nota:           newStatuteValues.versao_nota || null,
      };
      const res = await fetch(`${API}/api/v1/clubes/${clube.id}/estatuto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      setShowNewStatuteForm(false);
      setStatuteError(null);
      await fetchEstatuto(clube.id);
    } catch (err) {
      setStatuteError(err.message);
    } finally {
      setStatuteSubmitting(false);
    }
  }, [clube?.id, getToken, newStatuteValues, fetchEstatuto]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ClubeShell
      activePage="estatuto"
      clubeId={clubeIdParam}
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Loading */}
        {estatutoLoading && (
          <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: TXT_3, letterSpacing: '0.1em' }}>
            CARREGANDO ESTATUTO...
          </div>
        )}

        {/* Active statute card */}
        {estatuto && !estatutoLoading && (
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                  VERSÃO ATIVA
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2 }}>
                  Vigente desde {estatuto.valid_from?.split('-').reverse().join('/')}
                </div>
              </div>
              <button
                onClick={() => setShowNewStatuteForm(v => !v)}
                style={{
                  padding: '6px 14px', fontFamily: MONO, fontSize: 10,
                  background: 'transparent', border: `1px solid ${ACCENT}`,
                  color: ACCENT, borderRadius: 3, cursor: 'pointer', letterSpacing: '0.08em',
                }}
              >
                {showNewStatuteForm ? '× FECHAR' : '+ NOVA VERSÃO'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Prazo de Conversão',    `${estatuto.prazo_conversao_dias} dia(s)`],
                ['Prazo de Pagamento',    `${estatuto.prazo_pagamento_dias} dia(s)`],
                ['Carência',              `${estatuto.carencia_dias} dia(s)`],
                ['Taxa de Administração', `${(estatuto.taxa_administracao * 100).toFixed(4)}% a.a.`],
                ['Taxa de Performance',   estatuto.taxa_performance > 0 ? `${(estatuto.taxa_performance * 100).toFixed(4)}% sobre ${estatuto.benchmark_performance ?? '—'}` : 'Sem taxa'],
                ['IRRF',                  `${(estatuto.irrf_rate * 100).toFixed(2)}%`],
                ['Regime Tributário',     (estatuto.regime_tributario ?? '—').toUpperCase()],
                ['Derivativos',           estatuto.permite_derivativos ? 'Permitidos (exchange-traded)' : 'Não permitidos'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: `1px solid ${BORDER2}`,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>{label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: TXT_1 }}>{value}</span>
                </div>
              ))}
            </div>

            {estatuto.politica_investimento && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: BG_CARD2, borderRadius: 4 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginBottom: 6 }}>POLÍTICA DE INVESTIMENTO</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2, lineHeight: 1.6 }}>
                  {estatuto.politica_investimento}
                </div>
              </div>
            )}

            {estatuto.versao_nota && (
              <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, color: TXT_3 }}>
                Nota: {estatuto.versao_nota}
              </div>
            )}
          </div>
        )}

        {/* No statute yet */}
        {!estatuto && !estatutoLoading && (
          <div style={{
            padding: '32px 0', textAlign: 'center',
            fontFamily: MONO, fontSize: 11, color: TXT_3, lineHeight: 1.8,
          }}>
            Nenhum estatuto configurado.<br />
            <button
              onClick={() => setShowNewStatuteForm(true)}
              style={{
                marginTop: 12, padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                background: 'transparent', border: `1px solid ${ACCENT}`,
                color: ACCENT, borderRadius: 3, cursor: 'pointer',
              }}
            >
              + CRIAR ESTATUTO INICIAL
            </button>
          </div>
        )}

        {/* New statute form */}
        {showNewStatuteForm && (
          <div style={{
            background: BG_CARD2, border: `1px solid ${ACCENT}40`,
            borderRadius: 6, padding: 20,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: ACCENT, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              NOVA VERSÃO DO ESTATUTO
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'valid_from',           label: 'Data de Vigência *', type: 'date'   },
                { key: 'prazo_conversao_dias',  label: 'Prazo Conversão (dias)', type: 'number' },
                { key: 'prazo_pagamento_dias',  label: 'Prazo Pagamento (dias)', type: 'number' },
                { key: 'carencia_dias',         label: 'Carência (dias)',    type: 'number' },
                { key: 'taxa_administracao',    label: 'Taxa Admin (% a.a.)', type: 'number' },
                { key: 'taxa_performance',      label: 'Taxa Performance (%)', type: 'number' },
                { key: 'irrf_rate',             label: 'IRRF (%)',           type: 'number' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={newStatuteValues[key] ?? ''}
                    onChange={e => setNewStatuteValues(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: BG_CARD, border: `1px solid ${BORDER2}`,
                      borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                      padding: '7px 10px', outline: 'none',
                    }}
                  />
                </div>
              ))}

              <div>
                <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Benchmark Performance
                </label>
                <select
                  value={newStatuteValues.benchmark_performance ?? ''}
                  onChange={e => setNewStatuteValues(prev => ({ ...prev, benchmark_performance: e.target.value }))}
                  style={{
                    width: '100%', background: BG_CARD, border: `1px solid ${BORDER2}`,
                    borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                    padding: '7px 10px', outline: 'none',
                  }}
                >
                  <option value="">Nenhum</option>
                  <option value="ibov">IBOV</option>
                  <option value="cdi">CDI</option>
                  <option value="ipca">IPCA</option>
                </select>
              </div>

              <div>
                <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Regime Tributário
                </label>
                <select
                  value={newStatuteValues.regime_tributario ?? 'fia'}
                  onChange={e => setNewStatuteValues(prev => ({ ...prev, regime_tributario: e.target.value }))}
                  style={{
                    width: '100%', background: BG_CARD, border: `1px solid ${BORDER2}`,
                    borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                    padding: '7px 10px', outline: 'none',
                  }}
                >
                  <option value="fia">FIA</option>
                  <option value="geral">Geral</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Permite Derivativos
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['Não', false], ['Sim (exchange-traded only)', true]].map(([label, val]) => (
                  <label key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: TXT_2 }}>
                    <input
                      type="radio"
                      name="permite_derivativos"
                      checked={newStatuteValues.permite_derivativos === val}
                      onChange={() => setNewStatuteValues(prev => ({ ...prev, permite_derivativos: val }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Política de Investimento
              </label>
              <textarea
                value={newStatuteValues.politica_investimento ?? ''}
                onChange={e => setNewStatuteValues(prev => ({ ...prev, politica_investimento: e.target.value }))}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: BG_CARD, border: `1px solid ${BORDER2}`,
                  borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                  padding: '8px 10px', outline: 'none', resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Nota da Versão
              </label>
              <input
                type="text"
                value={newStatuteValues.versao_nota ?? ''}
                onChange={e => setNewStatuteValues(prev => ({ ...prev, versao_nota: e.target.value }))}
                placeholder="ex: Redução de taxa, adição de carência de 30 dias"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: BG_CARD, border: `1px solid ${BORDER2}`,
                  borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                  padding: '7px 10px', outline: 'none',
                }}
              />
            </div>

            {statuteError && (
              <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, color: RED }}>{statuteError}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => { setShowNewStatuteForm(false); setStatuteError(null); }}
                style={{
                  padding: '7px 18px', fontFamily: MONO, fontSize: 10,
                  background: 'transparent', border: `1px solid ${TXT_3}`,
                  color: TXT_3, borderRadius: 3, cursor: 'pointer', letterSpacing: '0.08em',
                }}
              >CANCELAR</button>
              <button
                disabled={!newStatuteValues.valid_from || statuteSubmitting}
                onClick={submitNewStatute}
                style={{
                  padding: '7px 18px', fontFamily: MONO, fontSize: 10,
                  background: (!newStatuteValues.valid_from || statuteSubmitting) ? TXT_3 : ACCENT,
                  border: 'none', color: '#fff', borderRadius: 3,
                  cursor: (!newStatuteValues.valid_from || statuteSubmitting) ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.08em',
                }}
              >{statuteSubmitting ? 'SALVANDO...' : 'SALVAR NOVA VERSÃO'}</button>
            </div>
          </div>
        )}

        {/* Version history */}
        {estatutoHistory.length > 0 && (
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              HISTÓRICO DE VERSÕES ({estatutoHistory.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {estatutoHistory.map((ev, i) => (
                <div key={ev.id} style={{
                  background: BG_CARD, border: `1px solid ${i === 0 ? ACCENT + '40' : BORDER2}`,
                  borderRadius: 4, padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: i === 0 ? ACCENT : TXT_2 }}>
                      {ev.valid_from?.split('-').reverse().join('/')}
                      {ev.valid_until ? ` → ${ev.valid_until.split('-').reverse().join('/')}` : ' → atual'}
                    </span>
                    {ev.versao_nota && (
                      <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginLeft: 12 }}>
                        {ev.versao_nota}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>
                    {(ev.taxa_administracao * 100).toFixed(4)}% a.a.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit log */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: MONO, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              LOG DE AUDITORIA
            </div>
            <input
              type="text"
              placeholder="Filtrar por ação ou tabela..."
              value={auditFilter}
              onChange={e => setAuditFilter(e.target.value)}
              style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 10, padding: '4px 10px', outline: 'none' }}
            />
          </div>

          {auditLoading && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_3, padding: '8px 0' }}>CARREGANDO...</div>
          )}

          {!auditLoading && (() => {
            const filtered = auditLog.filter(entry => {
              if (!auditFilter) return true;
              const q = auditFilter.toLowerCase();
              return (entry.action ?? '').toLowerCase().includes(q) || (entry.table_name ?? '').toLowerCase().includes(q);
            });

            if (filtered.length === 0) {
              return (
                <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_3, padding: '8px 0' }}>
                  {auditLog.length === 0 ? 'Nenhum evento registrado.' : 'Nenhum resultado para o filtro.'}
                </div>
              );
            }

            return (
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 80px 120px 1fr', gap: 8, padding: '6px 14px', borderBottom: `1px solid ${BORDER2}`, fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {['DATA/HORA', 'AÇÃO', 'TABELA', 'DETALHE'].map(h => <div key={h}>{h}</div>)}
                </div>
                {filtered.slice(0, 20).map((entry, i) => {
                  const ac = { create: GREEN, update: ACCENT, delete: RED }[entry.action] ?? TXT_3;
                  return (
                    <div key={entry.id ?? i} style={{ display: 'grid', gridTemplateColumns: '120px 80px 120px 1fr', gap: 8, padding: '7px 14px', borderBottom: i < Math.min(filtered.length, 20) - 1 ? `1px solid ${BORDER2}` : 'none', fontFamily: MONO, fontSize: 10, alignItems: 'center' }}>
                      <div style={{ color: TXT_3, fontSize: 9 }}>{entry.created_at ? new Date(entry.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                      <div style={{ color: ac, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{entry.action ?? '—'}</div>
                      <div style={{ color: TXT_2, fontSize: 9 }}>{entry.table_name ?? '—'}</div>
                      <div style={{ color: TXT_3, fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.record_id ? `ID: ${entry.record_id}` : ''}
                      </div>
                    </div>
                  );
                })}
                {filtered.length > 20 && (
                  <div style={{ padding: '6px 14px', borderTop: `1px solid ${BORDER2}`, fontFamily: MONO, fontSize: 9, color: TXT_3, textAlign: 'center' }}>
                    Mostrando 20 de {filtered.length} eventos
                  </div>
                )}
              </div>
            );
          })()}
        </div>

      </div>
    </ClubeShell>
  );
}
