import { supabase } from '../lib/supabase.js';

const BASE = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function register(name, email, password, confirmPassword) {
  const res = await fetch(`${BASE}/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, password, confirmPassword }),
  });
  return handleResponse(res);
}

export async function getMe(token) {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return handleResponse(res);
}

// ── Groups ────────────────────────────────────────────────────────────────────
export async function fetchGroups() {
  const res = await fetch(`${BASE}/groups`);
  return handleResponse(res);
}

export async function createGroup(data) {
  const res = await fetch(`${BASE}/groups`, {
    method:  'POST',
    headers: await authHeaders(),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateGroup(id, data) {
  const res = await fetch(`${BASE}/groups/${id}`, {
    method:  'PUT',
    headers: await authHeaders(),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteGroup(id) {
  const res = await fetch(`${BASE}/groups/${id}`, {
    method:  'DELETE',
    headers: await authHeaders(),
  });
  if (res.status === 204) return { success: true };
  return handleResponse(res);
}

// ── Subgroups ─────────────────────────────────────────────────────────────────
export async function fetchSubgroups(groupId) {
  const url = groupId ? `${BASE}/subgroups?groupId=${groupId}` : `${BASE}/subgroups`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function createSubgroup(data) {
  const res = await fetch(`${BASE}/subgroups`, {
    method:  'POST',
    headers: await authHeaders(),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateSubgroup(id, data) {
  const res = await fetch(`${BASE}/subgroups/${id}`, {
    method:  'PUT',
    headers: await authHeaders(),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteSubgroup(id) {
  const res = await fetch(`${BASE}/subgroups/${id}`, {
    method:  'DELETE',
    headers: await authHeaders(),
  });
  if (res.status === 204) return { success: true };
  return handleResponse(res);
}

// ── Assets ────────────────────────────────────────────────────────────────────
export async function fetchAssets({ subgroupId, groupId, terminal_view } = {}) {
  const params = new URLSearchParams();
  if (subgroupId)    params.set('subgroupId',    subgroupId);
  if (groupId)       params.set('groupId',       groupId);
  if (terminal_view) params.set('terminal_view', terminal_view);
  const qs = params.toString();
  const res = await fetch(qs ? `${BASE}/assets?${qs}` : `${BASE}/assets`);
  return handleResponse(res);
}

export async function createAsset(data) {
  const res = await fetch(`${BASE}/assets`, {
    method:  'POST',
    headers: await authHeaders(),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateAsset(id, data) {
  const res = await fetch(`${BASE}/assets/${id}`, {
    method:  'PUT',
    headers: await authHeaders(),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteAsset(id) {
  const res = await fetch(`${BASE}/assets/${id}`, {
    method:  'DELETE',
    headers: await authHeaders(),
  });
  if (res.status === 204) return { success: true };
  return handleResponse(res);
}

export async function bulkRelocateAssets(assetIds, targetSubgroupId) {
  const res = await fetch(`${BASE}/assets/bulk-relocate`, {
    method:  'PATCH',
    headers: await authHeaders(),
    body:    JSON.stringify({ assetIds, targetSubgroupId }),
  });
  return handleResponse(res);
}

// ── L1 Nodes ──────────────────────────────────────────────────────────────────
export async function fetchL1() {
  const res = await fetch(`${BASE}/l1`, { headers: await authHeaders() });
  return handleResponse(res);
}

// ── Taxonomy ──────────────────────────────────────────────────────────────────
export async function fetchTaxonomy({ view } = {}) {
  const url = view ? `${BASE}/taxonomy?view=${view}` : `${BASE}/taxonomy`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function fetchTaxonomyTree() {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/taxonomy/tree`,
    { headers }
  );
  if (!res.ok) throw new Error(`taxonomy/tree failed: ${res.status}`);
  return res.json();
}
