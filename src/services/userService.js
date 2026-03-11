const BASE = '/api/v1/users';

async function req(token, path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  return json;
}

export async function getUsers(token) {
  const data = await req(token, '/');
  return data.users;
}

export async function getUserById(token, id) {
  const data = await req(token, `/${id}`);
  return data.user;
}

export async function deleteUser(token, id) {
  return req(token, `/${id}`, { method: 'DELETE' });
}
