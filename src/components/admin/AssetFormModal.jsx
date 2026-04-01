import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createAsset, updateAsset, deleteAsset } from '../../services/taxonomyService.js';

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
`;
const Modal = styled.div`
  background: #0D1220;
  border: 1px solid #1E2740;
  border-radius: 8px;
  width: 540px;
  max-width: 95vw;
  max-height: 92vh;
  overflow-y: auto;
  padding: 28px;
  font-family: 'Space Mono', monospace;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #1E2740; border-radius: 2px; }
`;
const ModalTitle = styled.h2`
  font-family: 'DM Sans', sans-serif;
  font-size: 16px; font-weight: 700;
  color: #E8EAF0; margin: 0 0 24px;
`;
const Field    = styled.div`margin-bottom: 16px;`;
const Label    = styled.label`
  display: block; font-size: 10px; font-weight: 600;
  letter-spacing: 0.15em; color: #4A5568;
  text-transform: uppercase; margin-bottom: 6px;
`;
const Input    = styled.input`
  width: 100%; background: #080C18;
  border: 1px solid ${(p) => (p.$error ? '#FF5252' : '#1E2740')};
  border-radius: 4px; color: #E8EAF0;
  font-family: 'Space Mono', monospace; font-size: 13px;
  padding: 9px 12px; outline: none; box-sizing: border-box;
  &:focus { border-color: ${(p) => (p.$error ? '#FF5252' : '#3b82f6')}; }
`;
const Select   = styled.select`
  width: 100%; background: #080C18;
  border: 1px solid ${(p) => (p.$error ? '#FF5252' : '#1E2740')};
  border-radius: 4px; color: #E8EAF0;
  font-family: 'Space Mono', monospace; font-size: 13px;
  padding: 9px 12px; outline: none; box-sizing: border-box;
  cursor: pointer;
  &:focus { border-color: ${(p) => (p.$error ? '#FF5252' : '#3b82f6')}; }
`;
const Textarea = styled.textarea`
  width: 100%; background: #080C18;
  border: 1px solid ${(p) => (p.$error ? '#FF5252' : '#1E2740')};
  border-radius: 4px; color: #E8EAF0;
  font-family: 'Space Mono', monospace; font-size: 12px;
  padding: 9px 12px; outline: none; resize: vertical;
  min-height: 80px; box-sizing: border-box;
  &:focus { border-color: ${(p) => (p.$error ? '#FF5252' : '#3b82f6')}; }
`;
const FieldError = styled.div`font-size: 11px; color: #FF5252; margin-top: 4px;`;
const Row2 = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
`;
const ErrorMsg = styled.div`
  background: rgba(255,82,82,0.08);
  border: 1px solid rgba(255,82,82,0.3);
  border-radius: 4px; color: #FF5252;
  font-size: 12px; padding: 10px 12px; margin-bottom: 18px;
`;
const ConfirmText = styled.p`
  color: #8892A4; font-size: 13px; line-height: 1.6; margin-bottom: 24px;
  span { color: #FF5252; font-weight: 700; }
`;
const Actions = styled.div`
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;
`;
const ActionsWithDelete = styled(Actions)`
  justify-content: space-between;
`;
const Btn = styled.button`
  border-radius: 4px; font-family: 'Space Mono', monospace;
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
  padding: 9px 18px; cursor: pointer; text-transform: uppercase;
  transition: background 0.15s;
`;
const CancelBtn = styled(Btn)`
  background: transparent; border: 1px solid #1E2740; color: #4A5568;
  &:hover { border-color: #4A5568; color: #E8EAF0; }
`;
const SaveBtn = styled(Btn)`
  background: ${(p) => (p.disabled ? '#1E2740' : '#3b82f6')};
  border: 1px solid transparent;
  color: ${(p) => (p.disabled ? '#4A5568' : '#080C18')};
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  &:hover:not(:disabled) { background: #26C6DA; }
`;
const DeleteBtn = styled(Btn)`
  background: transparent;
  border: 1px solid rgba(255,82,82,0.35);
  color: #FF5252;
  &:hover { background: rgba(255,82,82,0.12); border-color: #FF5252; }
`;
const DeleteConfirmBtn = styled(Btn)`
  background: ${(p) => (p.disabled ? '#1E2740' : '#FF5252')};
  border: none;
  color: ${(p) => (p.disabled ? '#4A5568' : '#fff')};
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  &:hover:not(:disabled) { background: #FF6B6B; }
`;

const ASSET_TYPES = [
  { value: 'equity',          label: 'Equity' },
  { value: 'equity-br',       label: 'Equity BR (B3)' },
  { value: 'fii',             label: 'FII (Fundo Imobiliário)' },
  { value: 'etf',             label: 'ETF (Global)' },
  { value: 'etf-br',          label: 'ETF BR (B3)' },
  { value: 'index',           label: 'Index' },
  { value: 'index-br',        label: 'Index BR' },
  { value: 'forex',           label: 'Forex' },
  { value: 'crypto',          label: 'Crypto' },
  { value: 'rate',            label: 'Rate (BCB)' },
  { value: 'macro-indicator', label: 'Macro Indicator' },
  { value: 'public-debt',     label: 'Título Público' },
  { value: 'credit',          label: 'Crédito' },
];

function metaTemplate(type) {
  if (['equity-br', 'fii', 'etf-br'].includes(type)) return '{\n  "isB3": true\n}';
  if (type === 'crypto') return '{\n  "isCrypto": true,\n  "cgId": ""\n}';
  if (['forex', 'index'].includes(type)) return '{\n  "display": ""\n}';
  return '{}';
}

function suggestCurrency(exchange) {
  if (!exchange) return '';
  const ex = exchange.trim().toUpperCase();
  if (ex === 'B3') return 'BRL';
  if (['FOREX', 'CRYPTO', 'INDEX', 'BCB', 'CBOE'].includes(ex)) return '';
  if (ex) return 'USD';
  return '';
}

export default function AssetFormModal({
  asset,
  subgroup,
  allSubgroups = [],
  onClose,
  onSaved,
}) {
  const isEdit = !!asset;

  const [symbol,         setSymbol]         = useState(asset?.symbol      || '');
  const [name,           setName]           = useState(asset?.name        || '');
  const [type,           setType]           = useState(asset?.type        || '');
  const [exchange,       setExchange]       = useState(asset?.exchange    || '');
  const [subgroupId,     setSubgroupId]     = useState(asset?.subgroup_id || subgroup?.id || '');
  const [currency,       setCurrency]       = useState(asset?.currency    || '');
  const [active,         setActive]         = useState(asset?.active !== undefined ? !!asset.active : true);
  const [sortOrder,      setSortOrder]      = useState(asset?.sort_order  ?? 0);
  const [sector,         setSector]         = useState(asset?.sector     || '');
  const [metaJson,       setMetaJson]       = useState(
    asset?.meta ? JSON.stringify(asset.meta, null, 2) : '',
  );
  const [metaManual,     setMetaManual]     = useState(isEdit);
  const [currencyManual, setCurrencyManual] = useState(isEdit && !!asset?.currency);
  const [error,          setError]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  // Auto-populate meta template when type changes (unless user has manually edited)
  useEffect(() => {
    if (!metaManual && type) {
      setMetaJson(metaTemplate(type));
    }
  }, [type, metaManual]);

  // Auto-suggest currency when exchange changes (unless user has manually set it)
  useEffect(() => {
    if (!currencyManual) {
      setCurrency(suggestCurrency(exchange));
    }
  }, [exchange, currencyManual]);

  // Group allSubgroups by groupDisplayName for <optgroup>
  const subgroupsByGroup = {};
  for (const s of allSubgroups) {
    const key = s.groupDisplayName || s.group_id;
    if (!subgroupsByGroup[key]) subgroupsByGroup[key] = [];
    subgroupsByGroup[key].push(s);
  }

  function parseMetaJson() {
    if (!metaJson.trim()) return null;
    try { return JSON.parse(metaJson); } catch { return 'INVALID'; }
  }

  const metaInvalid = !!metaJson.trim() && parseMetaJson() === 'INVALID';

  const canSave = symbol.trim() && name.trim() && subgroupId && !metaInvalid;

  async function handleSave() {
    if (!canSave) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        symbol:      symbol.trim().toUpperCase(),
        name:        name.trim(),
        type:        type       || null,
        exchange:    exchange.trim() || null,
        subgroup_id: subgroupId,
        currency:    currency.trim() || null,
        active,
        sort_order:  Number(sortOrder) || 0,
        sector:      sector.trim() || null,
        meta:        parseMetaJson(),
      };
      if (isEdit) {
        await updateAsset(asset.id, payload);
      } else {
        await createAsset(payload);
      }
      onSaved(false);
    } catch (err) {
      setError(err?.message || 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setError('');
    setLoading(true);
    try {
      await deleteAsset(asset.id);
      onSaved(true);
    } catch (err) {
      setError(err?.message || 'Failed to delete asset');
    } finally {
      setLoading(false);
    }
  }

  // ── Inline delete confirmation ─────────────────────────────────────────────
  if (confirmDelete) {
    return (
      <Overlay onClick={onClose}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <ModalTitle>Delete Asset</ModalTitle>
          {error && <ErrorMsg>⚠ {error}</ErrorMsg>}
          <ConfirmText>
            Delete <span>{asset?.symbol}</span> permanently?<br />
            This cannot be undone.
          </ConfirmText>
          <Actions>
            <CancelBtn onClick={() => setConfirmDelete(false)}>Cancel</CancelBtn>
            <DeleteConfirmBtn onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Confirm Delete'}
            </DeleteConfirmBtn>
          </Actions>
        </Modal>
      </Overlay>
    );
  }

  // ── Add / Edit form ────────────────────────────────────────────────────────
  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{isEdit ? `Edit Asset: ${asset.symbol}` : 'Add Asset'}</ModalTitle>

        {error && <ErrorMsg>⚠ {error}</ErrorMsg>}

        <Row2>
          <Field>
            <Label>Symbol *</Label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
              $error={!symbol && !!error}
            />
          </Field>
          <Field>
            <Label>Exchange</Label>
            <Input
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              placeholder="e.g. NASDAQ"
            />
          </Field>
        </Row2>

        <Field>
          <Label>Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apple Inc."
            $error={!name && !!error}
          />
        </Field>

        <Row2>
          <Field>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">— Select —</option>
              {ASSET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Currency</Label>
            <Input
              value={currency}
              onChange={(e) => { setCurrency(e.target.value); setCurrencyManual(true); }}
              placeholder="e.g. USD"
            />
          </Field>
        </Row2>

        <Field>
          <Label>Subgroup *</Label>
          <Select
            value={subgroupId}
            onChange={(e) => setSubgroupId(e.target.value)}
            $error={!subgroupId && !!error}
          >
            <option value="">— Select Subgroup —</option>
            {Object.entries(subgroupsByGroup).map(([groupName, sgs]) => (
              <optgroup key={groupName} label={groupName}>
                {sgs.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
          {!subgroupId && !!error && <FieldError>Subgroup is required</FieldError>}
        </Field>

        <Row2>
          <Field>
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field>
            <Label>Active</Label>
            <div style={{ paddingTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#8892A4' }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  style={{ accentColor: '#3b82f6', cursor: 'pointer', width: 14, height: 14 }}
                />
                Active
              </label>
            </div>
          </Field>
        </Row2>

        <Field>
          <Label>Sector</Label>
          <Input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="e.g. Bancos, Petróleo, Tijolo"
          />
        </Field>

        <Field>
          <Label>Meta (JSON)</Label>
          <Textarea
            value={metaJson}
            onChange={(e) => { setMetaJson(e.target.value); setMetaManual(true); }}
            placeholder={'{\n  "isB3": true\n}'}
            $error={metaInvalid}
          />
          {metaInvalid && <FieldError>Invalid JSON</FieldError>}
        </Field>

        {isEdit ? (
          <ActionsWithDelete>
            <DeleteBtn onClick={() => setConfirmDelete(true)}>Delete Asset</DeleteBtn>
            <div style={{ display: 'flex', gap: 10 }}>
              <CancelBtn onClick={onClose}>Cancel</CancelBtn>
              <SaveBtn onClick={handleSave} disabled={loading || !canSave}>
                {loading ? 'Saving...' : 'Save Changes'}
              </SaveBtn>
            </div>
          </ActionsWithDelete>
        ) : (
          <Actions>
            <CancelBtn onClick={onClose}>Cancel</CancelBtn>
            <SaveBtn onClick={handleSave} disabled={loading || !canSave}>
              {loading ? 'Saving...' : 'Create Asset'}
            </SaveBtn>
          </Actions>
        )}
      </Modal>
    </Overlay>
  );
}
