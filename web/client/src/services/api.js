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

// ==========================================
// Reporting & Template Management APIs
// ==========================================

export async function fetchReportTemplates() {
  return authFetch(`${BASE_URL}/reports/templates`);
}

export async function saveReportTemplate(templateData) {
  return authFetch(`${BASE_URL}/reports/templates`, {
    method: 'POST',
    body: JSON.stringify(templateData)
  });
}

export async function deleteReportTemplate(id) {
  return authFetch(`${BASE_URL}/reports/templates/${id}`, {
    method: 'DELETE'
  });
}

export async function generateReport(params) {
  return authFetch(`${BASE_URL}/reports/generate`, {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function fetchReportHistory() {
  return authFetch(`${BASE_URL}/reports/history`);
}

export async function fetchReportSchedules() {
  return authFetch(`${BASE_URL}/reports/schedules`);
}

export async function createReportSchedule(scheduleData) {
  return authFetch(`${BASE_URL}/reports/schedules`, {
    method: 'POST',
    body: JSON.stringify(scheduleData)
  });
}

export async function deleteReportSchedule(id) {
  return authFetch(`${BASE_URL}/reports/schedules/${id}`, {
    method: 'DELETE'
  });
}

export function getDownloadReportUrl(filename) {
  const token = getToken();
  return `${BASE_URL}/reports/download/${encodeURIComponent(filename)}?token=${encodeURIComponent(token || '')}`;
}

export function getDashboardsExportUrl() {
  const token = getToken();
  return `${BASE_URL}/reports/dashboards-export?token=${encodeURIComponent(token || '')}`;
}

export async function downloadReportFile(filename) {
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = getDownloadReportUrl(filename);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Download failed with status ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}

export async function downloadDashboardsExport() {
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = getDashboardsExportUrl();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Export failed with status ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'opensearch-dmarc-dashboards.ndjson';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}

