import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Plus,
  Play,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Globe,
  Mail,
  Shield,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Sliders,
  History,
  Info,
  ChevronRight,
  Flame,
  Zap,
  TrendingDown,
  TrendingUp,
  MapPin,
  Lock
} from 'lucide-react';
import {
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  testAlertRule,
  testExistingAlertRule,
  fetchAlertHistory
} from '../services/api';

const CONDITION_PRESETS = [
  {
    id: 'failure_rate',
    name: 'DMARC Failure Rate (%)',
    description: 'Triggers when failed messages exceed a percentage threshold of total volume',
    defaultThreshold: 5.0,
    unit: '%',
    icon: Flame
  },
  {
    id: 'new_sender_ip',
    name: 'New Unseen Sender IP',
    description: 'Triggers when messages originate from an IP not seen across your domains in past 30 days',
    defaultThreshold: 1,
    unit: 'messages',
    icon: Zap
  },
  {
    id: 'quarantine_reject_volume',
    name: 'Quarantine / Reject Volume',
    description: 'Triggers when messages subjected to quarantine or reject policies exceed a volume count',
    defaultThreshold: 50,
    unit: 'messages',
    icon: Shield
  },
  {
    id: 'alignment_failures',
    name: 'SPF or DKIM Alignment Failure Spike',
    description: 'Triggers when messages fail SPF or DKIM alignment validation',
    defaultThreshold: 20,
    unit: 'messages',
    icon: AlertTriangle
  },
  {
    id: 'report_volume_drop',
    name: 'Report Volume Drop (%)',
    description: 'Triggers when report volume drops unexpectedly compared to the previous period',
    defaultThreshold: 50,
    unit: '% drop',
    icon: TrendingDown
  },
  {
    id: 'volume_spike',
    name: 'Sudden Volume Spike (%)',
    description: 'Triggers when message traffic surges compared to the previous monitoring baseline',
    defaultThreshold: 100,
    unit: '% increase',
    icon: TrendingUp
  },
  {
    id: 'disallowed_country_asn',
    name: 'Disallowed Origin Country / ASN',
    description: 'Triggers when email traffic is accepted from unauthorized geo-locations or ASN carrier ranges',
    defaultThreshold: 1,
    unit: 'messages',
    icon: MapPin
  }
];

export default function AlertsDashboard({ currentUser, domains = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('rules'); // 'rules' | 'history'
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [conditionType, setConditionType] = useState('failure_rate');
  const [thresholdValue, setThresholdValue] = useState(5);
  const [timeWindow, setTimeWindow] = useState(60);
  const [severity, setSeverity] = useState('warning');
  const [selectedDomains, setSelectedDomains] = useState(['all']);
  const [recipients, setRecipients] = useState(currentUser?.email || '');
  const [cooldown, setCooldown] = useState(60);
  const [digestMode, setDigestMode] = useState(0);
  const [notifyRecovery, setNotifyRecovery] = useState(1);
  const [filterMetadata, setFilterMetadata] = useState({});

  // Dry-Run Testing State
  const [testingRule, setTestingRule] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savingRule, setSavingRule] = useState(false);

  // History Filter
  const [historySeverityFilter, setHistorySeverityFilter] = useState('');

  useEffect(() => {
    loadRules();
    loadHistory();
  }, []);

  async function loadRules() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlertRules();
      setRules(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const data = await fetchAlertHistory({ severity: historySeverityFilter || null });
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load alert history:', err);
    }
  }

  function handleOpenCreateModal() {
    setEditingRuleId(null);
    setName('');
    setConditionType('failure_rate');
    setThresholdValue(5);
    setTimeWindow(60);
    setSeverity('warning');
    setSelectedDomains(['all']);
    setRecipients(currentUser?.email || '');
    setCooldown(60);
    setDigestMode(0);
    setNotifyRecovery(1);
    setFilterMetadata({});
    setTestResult(null);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(rule) {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setConditionType(rule.condition_type);
    setThresholdValue(rule.threshold_value);
    setTimeWindow(rule.time_window_minutes);
    setSeverity(rule.severity);
    setSelectedDomains(rule.domains || ['all']);
    setRecipients(rule.recipients ? rule.recipients.join(', ') : currentUser?.email || '');
    setCooldown(rule.cooldown_minutes || 60);
    setDigestMode(rule.digest_mode ? 1 : 0);
    setNotifyRecovery(rule.notify_recovery !== 0 ? 1 : 0);
    setFilterMetadata(rule.filter_metadata || {});
    setTestResult(null);
    setIsModalOpen(true);
  }

  async function handleToggleRule(rule) {
    try {
      const newActive = rule.is_active ? 0 : 1;
      await updateAlertRule(rule.id, { is_active: newActive });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: newActive } : r))
      );
    } catch (err) {
      alert(`Failed to update rule state: ${err.message}`);
    }
  }

  async function handleDeleteRule(id) {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await deleteAlertRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(`Failed to delete rule: ${err.message}`);
    }
  }

  async function handleDryRunTest() {
    setTestingRule(true);
    setTestResult(null);
    try {
      const payload = {
        condition_type: conditionType,
        threshold_value: Number(thresholdValue),
        time_window_minutes: parseInt(timeWindow, 10),
        domains: selectedDomains,
        filter_metadata: filterMetadata
      };

      const result = await testAlertRule(payload);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        triggered: false,
        message: `Dry Run Evaluation Error: ${err.message}`
      });
    } finally {
      setTestingRule(false);
    }
  }

  async function handleSaveRule(e) {
    if (e) e.preventDefault();
    setSavingRule(true);
    setError(null);

    try {
      const recipientList = recipients
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));

      const payload = {
        name: name.trim(),
        condition_type: conditionType,
        threshold_value: Number(thresholdValue),
        time_window_minutes: parseInt(timeWindow, 10),
        severity,
        domains: selectedDomains,
        recipients: recipientList,
        cooldown_minutes: parseInt(cooldown, 10),
        digest_mode: digestMode,
        notify_recovery: notifyRecovery,
        filter_metadata: filterMetadata
      };

      if (editingRuleId) {
        await updateAlertRule(editingRuleId, payload);
      } else {
        await createAlertRule(payload);
      }

      setIsModalOpen(false);
      loadRules();
    } catch (err) {
      alert(`Save rule failed: ${err.message}`);
    } finally {
      setSavingRule(false);
    }
  }

  const activeCount = rules.filter((r) => r.is_active).length;
  const currentCondition = CONDITION_PRESETS.find((c) => c.id === conditionType) || CONDITION_PRESETS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-500/20 ring-1 ring-white/10 shrink-0">
            <BellRing className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">Security Alert Rules & Incident Engine</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Shield className="w-3.5 h-3.5" /> {activeCount} Active Rules
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure real-time threshold detection across OpenSearch telemetry. Receive immediate incident notifications with IP offender forensics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadRules}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Refresh rules"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-950/50 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Alert Rule
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'rules'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Configured Alert Rules ({rules.length})
        </button>
        <button
          onClick={() => {
            setActiveSubTab('history');
            loadHistory();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Incident Telemetry & History ({history.length})
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: RULES LIST */}
      {activeSubTab === 'rules' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">State</th>
                  <th className="py-3 px-3">Rule Name</th>
                  <th className="py-3 px-3">Condition & Threshold</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Domain Scope</th>
                  <th className="py-3 px-3">Window / Cooldown</th>
                  <th className="py-3 px-3">Delivery</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      <BellRing className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      No alert rules configured yet. Click "Create Alert Rule" to define your first monitoring threshold.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => {
                    const condPreset = CONDITION_PRESETS.find((c) => c.id === rule.condition_type);
                    const isAlerting = rule.last_state === 'alerting';

                    return (
                      <tr key={rule.id} className="hover:bg-slate-800/20 transition">
                        {/* Status Toggle & State */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleRule(rule)}
                              className={`w-9 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                                rule.is_active ? 'bg-cyan-600' : 'bg-slate-800'
                              }`}
                              title={rule.is_active ? 'Rule Active' : 'Rule Paused'}
                            >
                              <div
                                className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                                  rule.is_active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            {rule.is_active && (
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isAlerting ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                                }`}
                                title={isAlerting ? 'Currently in ALERTING state' : 'Healthy (OK)'}
                              />
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {rule.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {rule.recipients && rule.recipients.length > 0
                              ? rule.recipients.join(', ')
                              : 'Owner Email'}
                          </div>
                        </td>

                        {/* Condition */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-200 flex items-center gap-1">
                            {condPreset?.name || rule.condition_type}
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                            Threshold: {rule.threshold_value} {condPreset?.unit || ''}
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="py-3 px-3 font-semibold uppercase text-[10px]">
                          {rule.severity === 'critical' ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              CRITICAL
                            </span>
                          ) : rule.severity === 'warning' ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              WARNING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                              INFO
                            </span>
                          )}
                        </td>

                        {/* Domains */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          {rule.domains && rule.domains.length > 0
                            ? rule.domains.join(', ')
                            : 'All'}
                        </td>

                        {/* Window / Cooldown */}
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          <div>Window: {rule.time_window_minutes}m</div>
                          <div>Cooldown: {rule.cooldown_minutes}m</div>
                        </td>

                        {/* Delivery */}
                        <td className="py-3 px-3 text-[11px] text-slate-300">
                          {rule.digest_mode ? (
                            <span className="text-amber-400 font-semibold">Daily Digest</span>
                          ) : (
                            <span className="text-cyan-400 font-semibold">Immediate Email</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                handleOpenEditModal(rule);
                                handleDryRunTest();
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition cursor-pointer"
                              title="Dry-run simulation"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(rule)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                              title="Edit rule"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition cursor-pointer"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENT HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" /> Historical Incidents & Offender Forensics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every triggered threshold incident recorded with exact observed metrics and offending source IPs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={historySeverityFilter}
                onChange={(e) => setHistorySeverityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warning Only</option>
                <option value="info">Info Only</option>
              </select>

              <button
                onClick={loadHistory}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Refresh incident history"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Rule Name</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3">Observed Value</th>
                  <th className="py-2.5 px-3">Threshold</th>
                  <th className="py-2.5 px-3">Triggered Time</th>
                  <th className="py-2.5 px-3">Offending Sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500">
                      No security incidents have triggered yet. Your monitored domains are operating within normal parameters.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-2.5 px-3 font-semibold uppercase text-[10px]">
                        {item.severity === 'critical' ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            CRITICAL
                          </span>
                        ) : item.severity === 'warning' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            WARNING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            INFO
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{item.rule_name}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                        {item.condition_type}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-400">
                        {typeof item.current_value === 'number'
                          ? item.current_value.toFixed(1)
                          : item.current_value}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {item.threshold_value}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(item.triggered_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                        {item.offenders && item.offenders.length > 0 ? (
                          <div className="space-y-0.5 max-w-xs truncate" title={JSON.stringify(item.offenders)}>
                            {item.offenders.slice(0, 2).map((o, idx) => (
                              <div key={idx}>
                                {o.ip || o.source_ip} ({o.org || o.country || 'N/A'}) - {o.vol || o.volume || 1} msgs
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">None detected</span>
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

      {/* CREATE / EDIT ALERT RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-rose-400" />
                {editingRuleId ? 'Edit Alert Rule' : 'Create New Security Alert Rule'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* Rule Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rule Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Critical DMARC Failure Spike or Unauthorized Geo Origin"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              {/* Condition Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Trigger Condition <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {CONDITION_PRESETS.map((cond) => {
                    const Icon = cond.icon;
                    return (
                      <button
                        type="button"
                        key={cond.id}
                        onClick={() => {
                          setConditionType(cond.id);
                          setThresholdValue(cond.defaultThreshold);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                          conditionType === cond.id
                            ? 'bg-rose-500/10 border-rose-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${conditionType === cond.id ? 'text-rose-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="text-xs font-bold text-white">{cond.name}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{cond.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Threshold & Time Window */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Threshold Value ({currentCondition.unit}) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Evaluation Time Window</label>
                  <select
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour (Standard)</option>
                    <option value={180}>3 Hours</option>
                    <option value={360}>6 Hours</option>
                    <option value={1440}>24 Hours</option>
                  </select>
                </div>
              </div>

              {/* Severity & Domain Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Alert Severity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['info', 'warning', 'critical'].map((sev) => (
                      <button
                        type="button"
                        key={sev}
                        onClick={() => setSeverity(sev)}
                        className={`py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer border ${
                          severity === sev
                            ? sev === 'critical'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                              : sev === 'warning'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Domain Scope</label>
                  <select
                    value={selectedDomains[0] || 'all'}
                    onChange={(e) => setSelectedDomains([e.target.value])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="all">All Monitored Domains</option>
                    {domains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipients & Cooldown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recipient Emails (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder="security@example.com, soc@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cooldown Duration</label>
                  <select
                    value={cooldown}
                    onChange={(e) => setCooldown(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={180}>3 Hours</option>
                    <option value={360}>6 Hours</option>
                    <option value={1440}>24 Hours</option>
                  </select>
                </div>
              </div>

              {/* Notification Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={digestMode === 1}
                    onChange={(e) => setDigestMode(e.target.checked ? 1 : 0)}
                    className="accent-cyan-500"
                  />
                  <span>Batch into Daily Incident Digest (No immediate email)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyRecovery === 1}
                    onChange={(e) => setNotifyRecovery(e.target.checked ? 1 : 0)}
                    className="accent-cyan-500"
                  />
                  <span>Send Recovery Notification when metric normalizes</span>
                </label>
              </div>

              {/* DRY RUN TEST BOX */}
              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-cyan-400" /> Dry-Run Simulation Engine
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Evaluates this condition against real telemetry without dispatching emails.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDryRunTest}
                    disabled={testingRule}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {testingRule ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Test Rule Now
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      testResult.triggered
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {testResult.triggered ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>WOULD TRIGGER INCIDENT: {testResult.current_formatted || testResult.current_value}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>NORMAL / WOULD NOT TRIGGER: {testResult.current_formatted || testResult.current_value}</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] mt-1 text-slate-300">{testResult.message}</p>

                    {testResult.offenders && testResult.offenders.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400">
                        <strong className="text-slate-300">Top Detected IP Offenders:</strong>
                        <div className="mt-1 space-y-0.5">
                          {testResult.offenders.slice(0, 3).map((o, idx) => (
                            <div key={idx}>
                              &bull; {o.ip || o.source_ip} ({o.org || o.country || 'N/A'}) - {o.vol || o.volume || 1} msgs
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/50 transition cursor-pointer disabled:opacity-50"
                >
                  {savingRule ? 'Saving Rule...' : (editingRuleId ? 'Update Rule' : 'Save & Activate Rule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
