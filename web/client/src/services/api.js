// API Service for DMARC OpenSearch backend & RBAC User Management
const BASE_URL = '/api';

const TOKEN_KEY = 'sentinel_auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Session expired or invalid
    clearToken();
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Session expired. Please log in again.');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// ==========================================
// Authentication APIs
// ==========================================

export async function login({ email, username, password }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email || username, password })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Invalid credentials');
  }

  const data = await res.json();
  if (data.token) {
    setToken(data.token);
  }
  return data;
}

export async function fetchMe() {
  return authFetch(`${BASE_URL}/auth/me`);
}

export async function changePassword({ currentPassword, newPassword }) {
  return authFetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// ==========================================
// User Management APIs (Admin & Manager)
// ==========================================

export async function fetchUsers() {
  return authFetch(`${BASE_URL}/users`);
}

export async function fetchAssignableDomains() {
  return authFetch(`${BASE_URL}/users/assignable-domains`);
}

export async function createUser(userData) {
  return authFetch(`${BASE_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function updateUser(id, userData) {
  return authFetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
}

export async function deleteUser(id) {
  return authFetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// DMARC & Health Analytics APIs
// ==========================================

export async function fetchFilters() {
  return authFetch(`${BASE_URL}/filters`);
}

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function fetchOverview(params = {}) {
  const query = new URLSearchParams(params).toString();
  return authFetch(`${BASE_URL}/overview?${query}`);
}

export async function fetchAlignment(params = {}) {
  const query = new URLSearchParams(params).toString();
  return authFetch(`${BASE_URL}/alignment?${query}`);
}

export async function fetchTimeseries(params = {}) {
  const query = new URLSearchParams(params).toString();
  return authFetch(`${BASE_URL}/timeseries?${query}`);
}

export async function fetchTraffic(params = {}) {
  const query = new URLSearchParams(params).toString();
  return authFetch(`${BASE_URL}/traffic?${query}`);
}

export async function fetchThreats(params = {}) {
  const query = new URLSearchParams(params).toString();
  return authFetch(`${BASE_URL}/threats?${query}`);
}

export async function fetchPolicies(params = {}) {
  const query = new URLSearchParams(params).toString();
  return authFetch(`${BASE_URL}/policies?${query}`);
}

export async function fetchRecords(params = {}) {
  const query = new URLSearchParams(params).toString();
  return authFetch(`${BASE_URL}/records?${query}`);
}

export async function fetchDomainHealth(domain = 'voxera.net', selector = '') {
  const query = new URLSearchParams({ domain, selector }).toString();
  return authFetch(`${BASE_URL}/domain-health?${query}`);
}
