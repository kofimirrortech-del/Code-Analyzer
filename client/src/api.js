const BASE = '/api';

async function request(method, path, body) {
  const options = { method, credentials: 'include', headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, options);
  if (res.status === 401 && path !== '/auth/me') {
    window.location.hash = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  delete: (path)       => request('DELETE', path),
};
