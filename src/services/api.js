const PROXY_BASE = import.meta.env.VITE_API_URL || ''; // Vite proxies /api/* → localhost:3001 in dev
const ERP_BASE = 'https://rgipterp.com/erp';


const TOKEN_KEY = 'erp_auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

/**
 * Fetch any ERP page through the proxy.
 * Sends the auth token as Authorization: Bearer <token>
 */
export async function fetchErpPage(path) {
  const url = path.startsWith('http') ? path : `${ERP_BASE}/${path}`;
  const token = getToken();

  const response = await fetch(
    `${PROXY_BASE}/api/proxy?url=${encodeURIComponent(url)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (response.status === 401) {
    clearToken();
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Session expired. Please log in again.');
  }

  if (!response.ok) {
    throw new Error(`Proxy error: ${response.status}`);
  }

  return response.text();
}

/**
 * Submit ERP login credentials.
 * Returns the auth token on success.
 */
export async function loginToErp(username, password) {
  const response = await fetch(`${PROXY_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Login failed');
  }

  // Store the token for all future requests
  setToken(data.token);
  return data;
}
