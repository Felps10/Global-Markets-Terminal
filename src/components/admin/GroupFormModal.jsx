import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createGroup, updateGroup } from '../../services/taxonomyService.js';

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
  width: 480px;
  max-width: 95vw;
  padding: 28px;
  font-family: 'Space Mono', monospace;
`;

const ModalTitle = styled.h2`
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #E8EAF0;
  margin: 0 0 24px;
`;

const Field = styled.div`
  margin-bottom: 18px;
`;

const Label = styled.label`
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: #4A5568;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  background: #080C18;
  border: 1px solid ${(p) => (p.$error ? '#FF5252' : '#1E2740')};
  border-radius: 4px;
  color: #E8EAF0;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  padding: 9px 12px;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${(p) => (p.$error ? '#FF5252' : '#00BCD4')}; }
`;

const Textarea = styled.textarea`
  width: 100%;
  background: #080C18;
  border: 1px solid #1E2740;
  border-radius: 4px;
  color: #E8EAF0;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  padding: 9px 12px;
  outline: none;
  resize: vertical;
  min-height: 72px;
  box-sizing: border-box;
  &:focus { border-color: #00BCD4; }
`;

const SlugPreview = styled.div`
  font-size: 11px;
  color: #4A5568;
  margin-top: 4px;
  span { color: #00BCD4; }
`;

const FieldError = styled.div`
  font-size: 11px;
  color: #FF5252;
  margin-top: 4px;
`;

const ErrorMsg = styled.div`
  background: rgba(255,82,82,0.08);
  border: 1px solid rgba(255,82,82,0.3);
  border-radius: 4px;
  color: #FF5252;
  font-size: 12px;
  padding: 10px 12px;
  margin-bottom: 18px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
`;

const Btn = styled.button`
  border-radius: 4px;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 9px 18px;
  cursor: pointer;
  text-transform: uppercase;
  transition: background 0.15s;
`;

const CancelBtn = styled(Btn)`
  background: transparent;
  border: 1px solid #1E2740;
  color: #4A5568;
  &:hover { border-color: #4A5568; color: #E8EAF0; }
`;

const SaveBtn = styled(Btn)`
  background: ${(p) => (p.disabled ? '#1E2740' : '#00BCD4')};
  border: 1px solid transparent;
  color: ${(p) => (p.disabled ? '#4A5568' : '#080C18')};
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  &:hover:not(:disabled) { background: #26C6DA; }
`;

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const L1_OPTIONS = [
  { id: 'global',  display_name: 'Global' },
  { id: 'brasil',  display_name: 'Brasil' },
];

const RadioGroup = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 2px;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8892A4;
  cursor: pointer;
  input { cursor: pointer; accent-color: #00BCD4; }
`;

const Row2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

export default function GroupFormModal({ group, onClose, onSaved, existingSlugs = [] }) {
  const isEdit    = !!group;

  const [displayName,   setDisplayName]   = useState(group?.display_name   || '');
  const [description,   setDescription]   = useState(group?.description    || '');
  const [slug,          setSlug]          = useState(group?.slug            || '');
  const [slugManual,    setSlugManual]    = useState(isEdit);
  const [l1Id,          setL1Id]          = useState(group?.l1_id          || L1_OPTIONS[0].id);
  const [blockId,       setBlockId]       = useState(group?.block_id       || '');
  const [sortOrder,     setSortOrder]     = useState(group?.sort_order     ?? 0);
  const [icon,          setIcon]          = useState(group?.icon           || '');
  const [color,         setColor]         = useState(group?.color          || '');
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);

  const selectedL1Slug = l1Id;

  useEffect(() => {
    if (!slugManual) setSlug(toSlug(displayName));
  }, [displayName, slugManual]);

  const slugConflict = slug && slug !== group?.slug && existingSlugs.includes(slug);
  const slugInvalid  = slug && !/^[a-z0-9-]+$/.test(slug);

  async function handleSave() {
    if (!displayName.trim() || !slug.trim()) return;
    if (slugConflict || slugInvalid) return;
    setError('');
    setLoading(true);
    try {
      const terminalView = selectedL1Slug === 'brasil' ? 'brazil' : 'global';
      const payload = {
        display_name:  displayName.trim(),
        description:   description.trim() || null,
        slug,
        l1_id:         l1Id || null,
        terminal_view: terminalView,
        block_id:      selectedL1Slug === 'brasil' ? (blockId.trim() || null) : null,
        sort_order:    Number(sortOrder) || 0,
        icon:          icon.trim()  || null,
        color:         color.trim() || null,
      };
      if (isEdit) {
        await updateGroup(group.id, payload);
      } else {
        await createGroup(payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.message || 'Failed to save group');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{isEdit ? `Edit Group: ${group.display_name}` : 'Add Group'}</ModalTitle>

        {error && <ErrorMsg>⚠ {error}</ErrorMsg>}

        <Field>
          <Label>Display Name *</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. US Equities"
            $error={!displayName && !!error}
          />
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
            placeholder="e.g. us-equities"
            $error={slugConflict || slugInvalid}
          />
          <SlugPreview>Preview: <span>/api/v1/groups/{slug || '...'}</span></SlugPreview>
          {slugConflict && <FieldError>This slug is already in use</FieldError>}
          {slugInvalid  && <FieldError>Slug must be lowercase letters, numbers, and hyphens only</FieldError>}
        </Field>

        <Field>
          <Label>Region *</Label>
          <RadioGroup>
            {L1_OPTIONS.map((n) => (
              <RadioLabel key={n.id}>
                <input type="radio" value={n.id} checked={l1Id === n.id} onChange={() => setL1Id(n.id)} />
                {n.display_name}
              </RadioLabel>
            ))}
          </RadioGroup>
        </Field>

        {selectedL1Slug === 'brasil' && (
          <Field>
            <Label>Block ID</Label>
            <Input
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              placeholder="e.g. mercado"
            />
          </Field>
        )}

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
            <Label>Icon (emoji)</Label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🟢"
            />
          </Field>
        </Row2>

        <Field>
          <Label>Accent Color</Label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. #00E676"
              style={{ flex: 1 }}
            />
            {color && <div style={{ width: 28, height: 28, borderRadius: 4, background: color, border: '1px solid #1E2740', flexShrink: 0 }} />}
          </div>
        </Field>

        <Actions>
          <CancelBtn onClick={onClose}>Cancel</CancelBtn>
          <SaveBtn
            onClick={handleSave}
            disabled={loading || !displayName.trim() || !slug.trim() || slugConflict || slugInvalid}
          >
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Group')}
          </SaveBtn>
        </Actions>
      </Modal>
    </Overlay>
  );
}
