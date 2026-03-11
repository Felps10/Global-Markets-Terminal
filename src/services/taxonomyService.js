const BASE = '/api/v1';

function authHeaders(token) {
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

export async function getMe(token) {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders(token) });
  return handleResponse(res);
}

// ── Groups ────────────────────────────────────────────────────────────────────
export async function fetchGroups() {
  const res = await fetch(`${BASE}/groups`);
  return handleResponse(res);
}

export async function createGroup(data, token) {
  const res = await fetch(`${BASE}/groups`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateGroup(id, data, token) {
  const res = await fetch(`${BASE}/groups/${id}`, {
    method:  'PUT',
    headers: authHeaders(token),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteGroup(id, token) {
  const res = await fetch(`${BASE}/groups/${id}`, {
    method:  'DELETE',
    headers: authHeaders(token),
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

export async function createSubgroup(data, token) {
  const res = await fetch(`${BASE}/subgroups`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateSubgroup(id, data, token) {
  const res = await fetch(`${BASE}/subgroups/${id}`, {
    method:  'PUT',
    headers: authHeaders(token),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteSubgroup(id, token) {
  const res = await fetch(`${BASE}/subgroups/${id}`, {
    method:  'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204) return { success: true };
  return handleResponse(res);
}

// ── Assets ────────────────────────────────────────────────────────────────────
export async function fetchAssets(subgroupId) {
  const url = subgroupId ? `${BASE}/assets?subgroupId=${subgroupId}` : `${BASE}/assets`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function bulkRelocateAssets(assetIds, targetSubgroupId, token) {
  const res = await fetch(`${BASE}/assets/bulk-relocate`, {
    method:  'PATCH',
    headers: authHeaders(token),
    body:    JSON.stringify({ assetIds, targetSubgroupId }),
  });
  return handleResponse(res);
}

// ── Taxonomy ──────────────────────────────────────────────────────────────────
export async function fetchTaxonomy() {
  const res = await fetch(`${BASE}/taxonomy`);
  return handleResponse(res);
}
