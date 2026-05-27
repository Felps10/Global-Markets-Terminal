import { supabase } from '../lib/supabase.js';

const BASE = `${import.meta.env.VITE_API_URL || ''}/api/v1/users`;

async function req(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? null;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  return json;
}

export async function getUsers() {
  const data = await req('/');
  return data.users;
}

export async function getUserById(id) {
  const data = await req(`/${id}`);
  return data.user;
}

export async function deleteUser(id) {
  return req(`/${id}`, { method: 'DELETE' });
}

export async function patchUserRole(userId, role) {
  return req(`/${userId}/role`, {
    method: 'PATCH',
    body:   JSON.stringify({ role }),
  });
}
