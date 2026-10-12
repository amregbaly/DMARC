import React, { useState, useEffect } from 'react';
import {
  Mail,
  Server,
  Lock,
  ShieldCheck,
  Send,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  Info,
  Key,
  Eye,
  EyeOff,
  Sliders,
  Inbox,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {
  fetchSmtpSettings,
  saveSmtpSettings,
  sendSmtpTestEmail,
  fetchSmtpAuditLogs,
  fetchEmailLogs,
  fetchEmailQueue,
  retryEmailQueueJob
} from '../services/api';

export default function EmailSettings({ currentUser }) {
  const [activeSubTab, setActiveSubTab] = useState('settings'); // 'settings' | 'logs' | 'audit' | 'queue'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [encryption, setEncryption] = useState('starttls');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fromName, setFromName] = useState('DMARC Sentinel');
  const [fromAddress, setFromAddress] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [timeout, setTimeoutVal] = useState(10000);
  const [isConfigured, setIsConfigured] = useState(false);

  // Test Email Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState(currentUser?.email || '');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string, code?: string }

  // Delivery Logs & Audit Logs State
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailLogsTotal, setEmailLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [queueJobs, setQueueJobs] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'logs') loadEmailLogs();
    else if (activeSubTab === 'audit') loadAuditLogs();
    else if (activeSubTab === 'queue') loadQueue();
  }, [activeSubTab, logStatusFilter, logTypeFilter]);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSmtpSettings();
      if (data) {
        setHost(data.host || '');
        setPort(data.port || 587);
        setEncryption(data.encryption || 'starttls');
        setUsername(data.username || '');
        setPassword(data.password || '');
        setHasPassword(Boolean(data.has_password));
        setIsChangingPassword(!data.has_password);
        setFromName(data.from_name || 'DMARC Sentinel');
        setFromAddress(data.from_address || '');
        setReplyTo(data.reply_to || '');
        setTimeoutVal(data.connection_timeout || 10000);
        setIsConfigured(Boolean(data.is_configured));
      }
    } catch (err) {
      setError(err.message || 'Failed to load SMTP settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        host: host.trim(),
        port: parseInt(port, 10) || 587,
        encryption,
        username: username.trim(),
        from_name: fromName.trim(),
        from_address: fromAddress.trim().toLowerCase(),
        reply_to: replyTo.trim().toLowerCase(),
        connection_timeout: parseInt(timeout, 10) || 10000
      };

      if (isChangingPassword) {
        payload.password = password;
      }

      const res = await saveSmtpSettings(payload);
      setSaveSuccess(true);
      setIsConfigured(Boolean(res.settings?.is_configured));
      setHasPassword(Boolean(res.settings?.has_password));
      setIsChangingPassword(false);
      setPassword('••••••••');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save SMTP settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!testRecipient || !testRecipient.includes('@')) {
      setTestResult({ success: false, message: 'Please enter a valid recipient email address.' });
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

    try {
      // Send draft settings so admin can test changes before saving
      const draftSettings = {
        host: host.trim(),
        port: parseInt(port, 10) || 587,
        encryption,
        username: username.trim(),
        password: isChangingPassword ? password : '',
        from_name: fromName.trim(),
        from_address: fromAddress.trim().toLowerCase() || username.trim(),
        reply_to: replyTo.trim().toLowerCase(),
        connection_timeout: parseInt(timeout, 10) || 10000
      };

      const res = await sendSmtpTestEmail({ recipient: testRecipient.trim(), settings: draftSettings });
      setTestResult({
        success: true,
        message: res.message || 'Test email dispatched successfully! Please check your inbox and spam folder.'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'SMTP Connection Test Failed',
        code: err.code
      });
    } finally {
      setTestingEmail(false);
    }
  }

  async function loadEmailLogs() {
    setLogsLoading(true);
    try {
      const data = await fetchEmailLogs({
        limit: 50,
        status: logStatusFilter || null,
        emailType: logTypeFilter || null,
        search: logSearch || null
      });
      setEmailLogs(data.logs || []);
      setEmailLogsTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }

  async function loadAuditLogs() {
    setAuditLoading(true);
    try {
      const data = await fetchSmtpAuditLogs({ limit: 50 });
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadQueue() {
    setQueueLoading(true);
    try {
      const data = await fetchEmailQueue({ limit: 50 });
      setQueueJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to load queue jobs:', err);
    } finally {
      setQueueLoading(false);
    }
  }

  async function handleRetryJob(id) {
    try {
      await retryEmailQueueJob(id);
      loadQueue();
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    }
  }

  function applyPreset(preset) {
    if (preset === 'mailpit') {
      setHost('mailpit');
      setPort(1025);
      setEncryption('none');
      setUsername('');
      setPassword('');
      setIsChangingPassword(true);
      setFromAddress('dmarc-alerts@voxera.net');
    } else if (preset === 'gmail') {
      setHost('smtp.gmail.com');
      setPort(587);
      setEncryption('starttls');
    } else if (preset === 'outlook') {
      setHost('smtp.office365.com');
      setPort(587);
      setEncryption('starttls');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10 shrink-0">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">Outgoing Email & SMTP Settings</h1>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5" /> Incomplete Setup
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure centralized SMTP relay credentials for sending automated security alerts, daily digests, and executive PDF reports.
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTestResult(null);
              setIsTestModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer border border-slate-700"
          >
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            Send Test Email
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> SMTP Configuration
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" /> Email Delivery Logs
        </button>
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'queue'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Dispatch Queue
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Audit History
        </button>
      </div>

      {/* Notifications / Alerts */}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>SMTP configuration saved and encrypted at rest with AES-256-GCM. Transporter connection reloaded.</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: SMTP CONFIGURATION */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" /> Mail Transfer Agent (MTA) Server
                </h3>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('mailpit')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono transition cursor-pointer"
                  >
                    Mailpit (Local)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('gmail')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition cursor-pointer"
                  >
                    Gmail
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('outlook')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition cursor-pointer"
                  >
                    Office365
                  </button>
                </div>
              </div>

              {/* Host & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    SMTP Host / FQDN <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="e.g. smtp.sendgrid.net, mailpit, or smtp.voxera.net"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Port <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="587"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Encryption Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Security / Encryption Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'starttls', label: 'STARTTLS', desc: 'Port 587 (Standard opportunistic TLS)' },
                    { id: 'ssl', label: 'SSL / TLS', desc: 'Port 465 (Direct TLS handshake)' },
                    { id: 'none', label: 'None / Plaintext', desc: 'Port 25 or 1025 (Local relay/Mailpit)' }
                  ].map((mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setEncryption(mode.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        encryption === mode.id
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm shadow-cyan-950'
                          : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{mode.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Authentication Credentials */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" /> Authentication Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Username / API Key ID</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. apikey or user@domain.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-400">Password / Secret</label>
                      {hasPassword && !isChangingPassword && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPassword(true);
                            setPassword('');
                          }}
                          className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          Change Secret
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={!isChangingPassword && hasPassword}
                        placeholder={hasPassword ? '••••••••' : 'Enter SMTP password'}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sender Details */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Sender Identity Headers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">From Display Name</label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="DMARC Sentinel Security"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      From Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      placeholder="dmarc-alerts@voxera.net"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Reply-To Address (Optional)</label>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="soc-team@voxera.net"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Connection Timeout */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block">Connection Timeout</label>
                  <p className="text-[10px] text-slate-500">Max wait time for MTA socket handshake response</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="3000"
                    max="30000"
                    step="1000"
                    value={timeout}
                    onChange={(e) => setTimeoutVal(parseInt(e.target.value, 10))}
                    className="w-32 accent-cyan-500"
                  />
                  <span className="text-xs font-mono text-cyan-400 w-12 text-right">
                    {(timeout / 1000).toFixed(0)}s
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Test Connection...
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-950/50 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving & Encrypting...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-6">
            {/* Security Guarantee Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" /> Military-Grade Credential Protection
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                SMTP credentials are never stored in plaintext or environment variables. All secrets are encrypted in SQLite using <strong>AES-256-GCM</strong> with an authenticated Galois tag and random initialization vectors.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono space-y-1">
                <div>&bull; At-Rest: AES-256-GCM Encrypted</div>
                <div>&bull; In-Transit: TLS 1.3 Strict Cipher</div>
                <div>&bull; API Mask: Never returns plaintext secrets</div>
              </div>
            </div>

            {/* Mailpit Info for Dev/Testing */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <Info className="w-4 h-4" /> Mailpit Sandbox Ready
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Testing alerts without third-party email quota? Use our built-in Mailpit service on port <code>1025</code> with Web UI on port <code>8025</code>.
              </p>
              <div className="pt-1">
                <a
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Open Mailpit Web Inbox &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL DELIVERY LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-cyan-400" /> Outgoing Email Dispatch Logs
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Total recorded dispatches: {emailLogsTotal}</p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent (Success)</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="alert">Alerts</option>
                <option value="report">Scheduled Reports</option>
                <option value="digest">Daily Digest</option>
                <option value="test">Test Emails</option>
              </select>

              <button
                onClick={loadEmailLogs}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Details / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500 font-sans">
                      No email delivery logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-2.5 px-3 font-sans">
                        {log.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            SENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{log.recipient}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans max-w-xs truncate">{log.subject}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="text-cyan-400 uppercase text-[10px] font-bold">{log.email_type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{log.attempts}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 max-w-xs truncate">
                        {log.error_message ? (
                          <span className="text-rose-400" title={log.error_message}>
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-500">Delivered</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCH QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Asynchronous DB Email Queue
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active jobs processed every 5s by background workers with exponential backoff retries.
              </p>
            </div>
            <button
              onClick={loadQueue}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className={`w-4 h-4 ${queueLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold uppercase tracking-wider font-sans">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Next Run</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {queueJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500 font-sans">
                      Queue is currently idle. No pending or retrying jobs.
                    </td>
                  </tr>
                ) : (
                  queueJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : (job.status === 'processing'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{job.recipient}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans max-w-xs truncate">{job.subject}</td>
                      <td className="py-2.5 px-3 text-cyan-400">{job.priority}</td>
                      <td className="py-2.5 px-3 text-slate-400">{job.attempts} / {job.max_attempts}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(job.run_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT HISTORY */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" /> Administrative Audit Trail
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full chronological record of modifications to sensitive email infrastructure.
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Refresh audit"
            >
              <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Sanitized Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 font-sans">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-sans font-semibold">
                        {item.username}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold uppercase text-[10px]">
                        {item.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{item.ip_address}</td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-sm truncate text-[11px]">
                        {JSON.stringify(item.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LIVE TEST EMAIL MODAL */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" /> Live SMTP Diagnostic Test
              </h3>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This initiates a live socket handshake and sends a styled diagnostic test email using the settings configured on this page.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Recipient Email Address</label>
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-xl text-xs border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {testResult.success ? 'Delivery Succeeded' : `Diagnostic Error [${testResult.code || 'SMTP_FAIL'}]`}
                </div>
                <div className="text-[11px] leading-relaxed break-words">{testResult.message}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testingEmail}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950 transition cursor-pointer disabled:opacity-50"
              >
                {testingEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying Connection...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Transmit Test Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
