// API Service for DMARC OpenSearch backend & RBAC User Management
const BASE_URL = '/api';

const TOKEN_KEY = 'sentinel_auth_token';

export function syncAuthCookie(token) {
  if (typeof document !== 'undefined') {
    if (token) {
      document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      document.cookie = `auth_token=; path=/; max-age=0; SameSite=Lax`;
    }
  }
}

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    syncAuthCookie(token);
  }
  return token;
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    syncAuthCookie(token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    syncAuthCookie(null);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  syncAuthCookie(null);
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

// Ensure cookie is synchronized on initial script load
if (typeof window !== 'undefined') {
  syncAuthCookie(localStorage.getItem(TOKEN_KEY));
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

export async function updateProfile(profileData) {
  return authFetch(`${BASE_URL}/auth/profile`, {
    method: 'PUT',
    body: JSON.stringify(profileData)
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

export async function fetchAggregateViews(params = {}) {
  const query = new URLSearchParams(params).toString();
  return authFetch(`${BASE_URL}/reports/aggregate-views?${query}`);
}

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

export async function runReportSchedule(id) {
  return authFetch(`${BASE_URL}/reports/schedules/${id}/run`, {
    method: 'POST'
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

export async function exportAggregateTab(payload) {
  const result = await authFetch(`${BASE_URL}/reports/export-tab`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (result.filename) {
    await downloadReportFile(result.filename);
  }
  return result;
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

// ==========================================
// SMTP Settings & Audit Logs (Admin)
// ==========================================

export async function fetchSmtpSettings() {
  return authFetch(`${BASE_URL}/admin/smtp`);
}

export async function saveSmtpSettings(settings) {
  return authFetch(`${BASE_URL}/admin/smtp`, {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}

export async function sendSmtpTestEmail({ recipient, settings = null }) {
  return authFetch(`${BASE_URL}/admin/smtp/test`, {
    method: 'POST',
    body: JSON.stringify({ recipient, settings })
  });
}

export async function fetchSmtpAuditLogs({ limit = 50, offset = 0, action = null } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (action) params.append('action', action);
  return authFetch(`${BASE_URL}/admin/smtp/audit-logs?${params.toString()}`);
}

// ==========================================
// Email Delivery Logs & Queue
// ==========================================

export async function fetchEmailLogs({ limit = 50, offset = 0, status = null, emailType = null, search = null } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (status) params.append('status', status);
  if (emailType) params.append('email_type', emailType);
  if (search) params.append('search', search);
  return authFetch(`${BASE_URL}/admin/email-logs?${params.toString()}`);
}

export async function fetchEmailQueue({ limit = 50, offset = 0, status = null } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (status) params.append('status', status);
  return authFetch(`${BASE_URL}/admin/email-queue?${params.toString()}`);
}

export async function retryEmailQueueJob(id) {
  return authFetch(`${BASE_URL}/admin/email-queue/${id}/retry`, {
    method: 'POST'
  });
}

// ==========================================
// Alert Rules & Incidents
// ==========================================

export async function fetchAlertRules() {
  return authFetch(`${BASE_URL}/alerts/rules`);
}

export async function createAlertRule(ruleData) {
  return authFetch(`${BASE_URL}/alerts/rules`, {
    method: 'POST',
    body: JSON.stringify(ruleData)
  });
}

export async function fetchAlertRule(id) {
  return authFetch(`${BASE_URL}/alerts/rules/${id}`);
}

export async function updateAlertRule(id, ruleData) {
  return authFetch(`${BASE_URL}/alerts/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ruleData)
  });
}

export async function deleteAlertRule(id) {
  return authFetch(`${BASE_URL}/alerts/rules/${id}`, {
    method: 'DELETE'
  });
}

export async function testAlertRule(ruleData) {
  return authFetch(`${BASE_URL}/alerts/rules/test`, {
    method: 'POST',
    body: JSON.stringify(ruleData)
  });
}

export async function testExistingAlertRule(id) {
  return authFetch(`${BASE_URL}/alerts/rules/${id}/test`, {
    method: 'POST'
  });
}

export async function fetchAlertHistory({ limit = 50, offset = 0, severity = null } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (severity) params.append('severity', severity);
  return authFetch(`${BASE_URL}/alerts/history?${params.toString()}`);
}

// ==========================================
// Report Emailing
// ==========================================

export async function sendReportByEmail({
  domain = 'all',
  recipients,
  formats = ['pdf'],
  template_id = 'default',
  date_from = null,
  date_to = null,
  organization_name = null,
  logo_url = null,
  report_name = null
}) {
  return authFetch(`${BASE_URL}/reports/send-email`, {
    method: 'POST',
    body: JSON.stringify({
      domain,
      recipients,
      formats,
      template_id,
      date_from,
      date_to,
      organization_name,
      logo_url,
      report_name
    })
  });
}

// ==========================================
// Theme Studio & Management API
// ==========================================

export async function fetchThemes() {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/themes`, { headers });
  if (!res.ok) {
    throw new Error('Failed to fetch themes');
  }
  return res.json();
}

export async function fetchThemeById(id) {
  const res = await fetch(`${BASE_URL}/themes/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch theme');
  }
  return res.json();
}

export async function createTheme(themeData) {
  return authFetch(`${BASE_URL}/admin/themes`, {
    method: 'POST',
    body: JSON.stringify(themeData)
  });
}

export async function updateTheme(id, themeData) {
  return authFetch(`${BASE_URL}/admin/themes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(themeData)
  });
}

export async function deleteTheme(id) {
  return authFetch(`${BASE_URL}/admin/themes/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function resetTheme(id) {
  return authFetch(`${BASE_URL}/admin/themes/${encodeURIComponent(id)}/reset`, {
    method: 'POST'
  });
}


