import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createSubgroup, updateSubgroup } from '../../services/taxonomyService.js';

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
  width: 500px;
  max-width: 95vw;
  padding: 28px;
  font-family: 'Space Mono', monospace;
`;
const ModalTitle = styled.h2`
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 16px; font-weight: 700;
  color: #E8EAF0; margin: 0 0 24px;
`;
const Field    = styled.div`margin-bottom: 18px;`;
const Label    = styled.label`
  display: block; font-size: 10px; font-weight: 600;
  letter-spacing: 0.15em; color: #4A5568;
  text-transform: uppercase; margin-bottom: 6px;
`;
const Input    = styled.input`
  width: 100%; background: #080C18;
  border: 1px solid ${(p) => (p.$error ? 'var(--c-error)' : '#1E2740')};
  border-radius: 4px; color: #E8EAF0;
  font-family: 'Space Mono', monospace; font-size: 13px;
  padding: 9px 12px; outline: none; box-sizing: border-box;
  &:focus { border-color: ${(p) => (p.$error ? 'var(--c-error)' : 'var(--c-accent)')}; }
`;
const Select   = styled.select`
  width: 100%; background: #080C18;
  border: 1px solid #1E2740; border-radius: 4px; color: #E8EAF0;
  font-family: 'Space Mono', monospace; font-size: 13px;
  padding: 9px 12px; outline: none; box-sizing: border-box;
  cursor: pointer;
  &:focus { border-color: var(--c-accent); }
`;
const Textarea = styled.textarea`
  width: 100%; background: #080C18;
  border: 1px solid #1E2740; border-radius: 4px; color: #E8EAF0;
  font-family: 'Space Mono', monospace; font-size: 12px;
  padding: 9px 12px; outline: none; resize: vertical;
  min-height: 72px; box-sizing: border-box;
  &:focus { border-color: var(--c-accent); }
`;
const SlugPreview = styled.div`
  font-size: 11px; color: #4A5568; margin-top: 4px;
  span { color: var(--c-accent); }
`;
const FieldError  = styled.div`font-size: 11px; color: var(--c-error); margin-top: 4px;`;
const ErrorMsg    = styled.div`
  background: rgba(255,82,82,0.08);
  border: 1px solid rgba(255,82,82,0.3);
  border-radius: 4px; color: var(--c-error);
  font-size: 12px; padding: 10px 12px; margin-bottom: 18px;
`;
const Actions  = styled.div`display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;`;
const Btn      = styled.button`
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
  background: ${(p) => (p.disabled ? '#1E2740' : 'var(--c-accent)')};
  border: 1px solid transparent;
  color: ${(p) => (p.disabled ? '#4A5568' : '#080C18')};
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  &:hover:not(:disabled) { background: #26C6DA; }
`;

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const Row2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const DATA_SOURCES = ['yahoo', 'brapi', 'bcb', 'bcb_and_yahoo', 'coingecko', 'awesomeapi', 'static'];

const SECTION_IDS = [
  'acoes-b3', 'fiis', 'etfs', 'indices-benchmarks',
  'juros', 'credito', 'titulos-publicos',
  'macro-brasil', 'cambio-liquidez',
];

export default function SubgroupFormModal({ subgroup, defaultGroupId, groups = [], onClose, onSaved, existingSlugs = [] }) {
  const isEdit    = !!subgroup;

  const [displayName, setDisplayName] = useState(subgroup?.display_name || '');
  const [description, setDescription] = useState(subgroup?.description  || '');
  const [groupId,     setGroupId]     = useState(subgroup?.group_id || defaultGroupId || groups[0]?.id || '');
  const [slug,        setSlug]        = useState(subgroup?.slug     || '');
  const [slugManual,  setSlugManual]  = useState(isEdit);
  const [sectionId,   setSectionId]   = useState(subgroup?.section_id  || '');
  const [dataSource,  setDataSource]  = useState(subgroup?.data_source || '');
  const [sortOrder,   setSortOrder]   = useState(subgroup?.sort_order  ?? 0);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (!slugManual) setSlug(toSlug(displayName));
  }, [displayName, slugManual]);

  const slugConflict = slug && slug !== subgroup?.slug && existingSlugs.includes(slug);
  const slugInvalid  = slug && !/^[a-z0-9-]+$/.test(slug);

  async function handleSave() {
    if (!displayName.trim() || !slug.trim() || !groupId) return;
    if (slugConflict || slugInvalid) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        display_name: displayName.trim(),
        description:  description.trim() || null,
        slug,
        group_id:    groupId,
        section_id:  sectionId  || null,
        data_source: dataSource || null,
        sort_order:  Number(sortOrder) || 0,
      };
      if (isEdit) {
        await updateSubgroup(subgroup.id, payload);
      } else {
        await createSubgroup(payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.message || 'Failed to save subgroup');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{isEdit ? `Edit Subgroup: ${subgroup.display_name}` : 'Add Subgroup'}</ModalTitle>

        {error && <ErrorMsg>⚠ {error}</ErrorMsg>}

        <Field>
          <Label>Display Name *</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Technology"
            $error={!displayName && !!error}
          />
        </Field>

        <Field>
          <Label>Parent Group *</Label>
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">— Select Group —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.display_name}</option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
          />
        </Field>

        <Field>
          <Label>Slug *</Label>
          <Input
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
            placeholder="e.g. technology"
            $error={slugConflict || slugInvalid}
          />
          <SlugPreview>Preview: <span>/api/v1/subgroups/{slug || '...'}</span></SlugPreview>
          {slugConflict && <FieldError>This slug is already in use</FieldError>}
          {slugInvalid  && <FieldError>Slug must be lowercase letters, numbers, and hyphens only</FieldError>}
        </Field>

        <Row2>
          <Field>
            <Label>Section ID (Brazil)</Label>
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">— None —</option>
              {SECTION_IDS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Data Source</Label>
            <Select value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
              <option value="">— None —</option>
              {DATA_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </Row2>

        <Field>
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
          />
        </Field>

        <Actions>
          <CancelBtn onClick={onClose}>Cancel</CancelBtn>
          <SaveBtn
            onClick={handleSave}
            disabled={loading || !displayName.trim() || !slug.trim() || !groupId || slugConflict || slugInvalid}
          >
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Subgroup')}
          </SaveBtn>
        </Actions>
      </Modal>
    </Overlay>
  );
}
