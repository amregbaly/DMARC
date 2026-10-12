import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings,
  Palette,
  Calendar,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Check,
  Globe,
  Sliders,
  ChevronRight,
  Building2,
  User,
  Image,
  Save,
  Layers,
  Play,
  Mail
} from 'lucide-react';
import {
  fetchReportTemplates,
  saveReportTemplate,
  deleteReportTemplate,
  generateReport,
  fetchReportHistory,
  fetchReportSchedules,
  createReportSchedule,
  runReportSchedule,
  deleteReportSchedule,
  getDownloadReportUrl,
  downloadReportFile,
  updateProfile,
  sendReportByEmail
} from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import AggregateReportsView from './AggregateReportsView';

export default function ReportsDashboard({ domains = [], selectedDomain, onSelectDomain, currentUser }) {
  const { language, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState('aggregate'); // 'aggregate' | 'generate' | 'templates' | 'history' | 'schedules'
  
  // State: Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // State: Generator parameters
  const [reportDomain, setReportDomain] = useState(selectedDomain || 'all');
  const [reportLanguage, setReportLanguage] = useState(currentUser?.language || language || 'en');
  const [datePreset, setDatePreset] = useState('30d'); // '7d' | '30d' | '90d' | 'all' | 'custom'
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [orgFilter, setOrgFilter] = useState('all');
  const [dispositionFilter, setDispositionFilter] = useState('all');
  const [formats, setFormats] = useState({ pdf: true, xlsx: true, csv: true });
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);

  // State: Report History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // State: Schedules
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    name: 'Weekly Executive Report',
    domain: 'all',
    template_id: 'default',
    schedule_type: 'weekly',
    recipients: currentUser?.email || '',
    formats: ['pdf'],
    send_email: 1,
    time_of_day: '08:00',
    timezone: 'UTC'
  });
  const [runningScheduleId, setRunningScheduleId] = useState(null);

  // State: On-demand Email Report Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalData, setEmailModalData] = useState({
    domain: 'all',
    recipients: currentUser?.email || '',
    formats: ['pdf'],
    template_id: 'default',
    date_from: null,
    date_to: null,
    report_name: ''
  });
  const [sendingEmailReport, setSendingEmailReport] = useState(false);
  const [emailReportStatus, setEmailReportStatus] = useState(null);

  function openEmailModal(params = {}) {
    setEmailModalData({
      domain: params.domain || reportDomain || 'all',
      recipients: params.recipients || currentUser?.email || '',
      formats: params.formats || ['pdf'],
      template_id: params.template_id || selectedTemplateId || 'default',
      date_from: params.date_from || (datePreset === 'custom' ? customFrom : null),
      date_to: params.date_to || (datePreset === 'custom' ? customTo : null),
      report_name: params.report_name || `DMARC Executive Report - ${params.domain || reportDomain}`
    });
    setEmailReportStatus(null);
    setIsEmailModalOpen(true);
  }

  async function handleSendEmailReport(e) {
    if (e) e.preventDefault();
    if (!emailModalData.recipients || !emailModalData.recipients.includes('@')) {
      setEmailReportStatus({ type: 'error', message: 'A valid recipient email address is required.' });
      return;
    }

    setSendingEmailReport(true);
    setEmailReportStatus(null);
    try {
      const res = await sendReportByEmail({
        ...emailModalData,
        organization_name: identityOrg,
        logo_url: identityLogo
      });
      setEmailReportStatus({
        type: 'success',
        message: res.message || 'Report queued for delivery. Check your inbox shortly!'
      });
      setTimeout(() => {
        setIsEmailModalOpen(false);
        loadHistory();
      }, 2500);
    } catch (err) {
      setEmailReportStatus({
        type: 'error',
        message: err.message || 'Failed to dispatch report by email.'
      });
    } finally {
      setSendingEmailReport(false);
    }
  }

  // State: Template Editor Modal
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State: User / Organization Identity for Reports (editable by user & admin)
  const [identityLogon, setIdentityLogon] = useState(currentUser?.username || '');
  const [identityOrg, setIdentityOrg] = useState(currentUser?.organization_name || '');
  const [identityLogo, setIdentityLogo] = useState(currentUser?.logo_url || '');
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityStatus, setIdentityStatus] = useState(null);

  useEffect(() => {
    loadTemplates();
    loadHistory();
    loadSchedules();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.username) setIdentityLogon(currentUser.username);
      if (currentUser.organization_name !== undefined) setIdentityOrg(currentUser.organization_name || '');
      if (currentUser.logo_url !== undefined) setIdentityLogo(currentUser.logo_url || '');
      if (currentUser.language) setReportLanguage(currentUser.language);
    }
  }, [currentUser]);

  useEffect(() => {
    if (language) {
      setReportLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    if (selectedDomain) {
      setReportDomain(selectedDomain);
    }
  }, [selectedDomain]);

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const data = await fetchReportTemplates();
      setTemplates(data.templates || []);
      if (data.templates && data.templates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data.templates[0].id);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await fetchReportHistory();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadSchedules() {
    try {
      const data = await fetchReportSchedules();
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    }
  }

  async function handleGenerateReport(e) {
    e.preventDefault();
    setGenerating(true);
    setGenerationError(null);
    setGeneratedResult(null);

    const activeFormats = Object.keys(formats).filter((k) => formats[k]);
    if (activeFormats.length === 0) {
      setGenerationError('Please select at least one export format (PDF, Excel, or CSV).');
      setGenerating(false);
      return;
    }

    // Calculate dates based on preset
    let dateFrom = null;
    let dateTo = null;
    const now = new Date();
    if (datePreset === '7d') {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      dateFrom = d.toISOString();
    } else if (datePreset === '30d') {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      dateFrom = d.toISOString();
    } else if (datePreset === '90d') {
      const d = new Date();
      d.setDate(now.getDate() - 90);
      dateFrom = d.toISOString();
    } else if (datePreset === 'custom') {
      if (customFrom) {
        dateFrom = new Date(`${customFrom}T00:00:00`).toISOString();
      }
      if (customTo) {
        dateTo = new Date(`${customTo}T23:59:59.999`).toISOString();
      }
    }

    try {
      const res = await generateReport({
        domain: reportDomain,
        date_from: dateFrom,
        date_to: dateTo,
        reporter_org: orgFilter,
        disposition: dispositionFilter,
        template_id: selectedTemplateId,
        formats: activeFormats,
        organization_name: identityOrg || currentUser?.organization_name || '',
        user_logon: identityLogon || currentUser?.username || '',
        logo_url: identityLogo || currentUser?.logo_url || '',
        language: reportLanguage || language || 'en'
      });

      setGeneratedResult(res);
      loadHistory(); // refresh history list
    } catch (err) {
      console.error('Report error:', err);
      setGenerationError(err.message || 'Report generation failed. Please verify OpenSearch connection.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveIdentity(e) {
    if (e) e.preventDefault();
    setSavingIdentity(true);
    setIdentityStatus(null);
    try {
      await updateProfile({
        username: identityLogon,
        organization_name: identityOrg,
        logo_url: identityLogo
      });
      setIdentityStatus({ type: 'success', message: 'Identity & branding updated successfully!' });
      setTimeout(() => setIdentityStatus(null), 4000);
    } catch (err) {
      setIdentityStatus({ type: 'error', message: err.message || 'Failed to update organization profile' });
    } finally {
      setSavingIdentity(false);
    }
  }

  async function handleSaveTemplate(e) {
    e.preventDefault();
    if (!editingTemplate) return;
    try {
      await saveReportTemplate(editingTemplate);
      setIsModalOpen(false);
      setEditingTemplate(null);
      await loadTemplates();
    } catch (err) {
      alert('Failed to save template: ' + err.message);
    }
  }

  async function handleDeleteTemplate(id) {
    if (!window.confirm(`Are you sure you want to delete template "${id}"?`)) return;
    try {
      await deleteReportTemplate(id);
      await loadTemplates();
      if (selectedTemplateId === id) setSelectedTemplateId('default');
    } catch (err) {
      alert('Delete template error: ' + err.message);
    }
  }

  async function handleCreateSchedule(e) {
    e.preventDefault();
    try {
      await createReportSchedule(newSchedule);
      setNewSchedule({
        name: '',
        domain: 'all',
        template_id: 'default',
        schedule_type: 'weekly',
        recipients: '',
        formats: ['pdf']
      });
      loadSchedules();
    } catch (err) {
      alert('Schedule error: ' + err.message);
    }
  }

  async function handleDeleteSchedule(id) {
    if (!window.confirm('Delete this automated schedule?')) return;
    try {
      await deleteReportSchedule(id);
      loadSchedules();
    } catch (err) {
      alert('Error deleting schedule: ' + err.message);
    }
  }

  async function handleRunSchedule(id) {
    setRunningScheduleId(id);
    try {
      const res = await runReportSchedule(id);
      alert(`Report executed successfully! Generated for ${res.domain || 'all'}. You can download it now in Report History.`);
      await loadSchedules();
      await loadHistory();
    } catch (err) {
      alert('Error executing schedule: ' + err.message);
    } finally {
      setRunningScheduleId(null);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
                {t('reports.engineBadge', 'ENTERPRISE REPORTING ENGINE')}
              </span>
              <span className="text-xs text-slate-500">• OpenSearch 3.3.2</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-400" />
              {t('reports.title', 'Branded DMARC Executive Reports')}
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              {t('reports.subtitle', 'Generate pixel-perfect client reports in PDF, multi-sheet Excel (.xlsx), and CSV formats with customizable corporate branding, logo placement, client readiness verdict, and white-labeling.')}
            </p>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          {[
            { id: 'aggregate', label: t('reports.aggregateTab', 'Aggregate Views (PowerDMARC)'), icon: Layers },
            { id: 'generate', label: t('reports.generateTab', 'Generate Report'), icon: FileText },
            { id: 'templates', label: t('reports.brandingTab', 'Branding & Templates'), icon: Palette },
            { id: 'history', label: t('reports.historyTab', 'Report History'), icon: Clock },
            { id: 'schedules', label: t('reports.schedulesTab', 'Automated Schedules'), icon: Calendar }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'history' && history.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] bg-slate-800 text-cyan-300 rounded-full">
                    {history.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 0. POWERDMARC MULTI-VIEW AGGREGATE REPORTS TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'aggregate' && (
        <AggregateReportsView
          domains={domains}
          selectedDomain={reportDomain}
          currentUser={currentUser}
          onSwitchToGenerate={({ domain, preset, customDateFrom, customDateTo }) => {
            if (domain) setReportDomain(domain);
            if (preset) setDatePreset(preset);
            if (customDateFrom) setCustomFrom(customDateFrom);
            if (customDateTo) setCustomTo(customDateTo);
            setActiveSubTab('generate');
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 1. GENERATE REPORT TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Options Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleGenerateReport} className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                {t('reports.paramsTitle', 'Report Parameters & Scope')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Domain Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('reports.domainLabel', 'Monitored Domain')}</label>
                  <select
                    value={reportDomain}
                    onChange={(e) => setReportDomain(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="all">{t('filters.allDomains', 'All Monitored Domains')}</option>
                    {domains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('reports.timeRangeLabel', 'Time Range Preset')}</label>
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="7d">{t('reports.preset7d', 'Last 7 Days (Tactical)')}</option>
                    <option value="30d">{t('reports.preset30d', 'Last 30 Days (Standard Audit)')}</option>
                    <option value="90d">{t('reports.preset90d', 'Last 90 Days (Quarterly Executive)')}</option>
                    <option value="all">{t('reports.presetAll', 'All Ingested Data')}</option>
                    <option value="custom">{t('reports.presetCustom', 'Custom Date Range (Specific Dates)')}</option>
                  </select>
                </div>

                {/* Custom Date Range Specific Inputs */}
                {datePreset === 'custom' && (
                  <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-cyan-500/30 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t('reports.dateFromStart', 'Date From (Start)')}</span>
                      </label>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-cyan-500 [color-scheme:dark] cursor-pointer"
                        required={datePreset === 'custom'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t('reports.dateToEnd', 'Date To (End)')}</span>
                      </label>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-cyan-500 [color-scheme:dark] cursor-pointer"
                        required={datePreset === 'custom'}
                      />
                    </div>
                  </div>
                )}

                {/* Reporting Org Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('reports.reporterOrgLabel', 'Reporting Organization')}</label>
                  <select
                    value={orgFilter}
                    onChange={(e) => setOrgFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="all">{t('reports.allReceivers', 'All Organizations (Google, Microsoft, etc.)')}</option>
                    <option value="google.com">google.com / Google Inc.</option>
                    <option value="microsoft.com">microsoft.com</option>
                    <option value="yahoo.com">yahoo.com</option>
                  </select>
                </div>

                {/* Disposition Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('reports.dispositionLabel', 'Receiver Policy Disposition')}</label>
                  <select
                    value={dispositionFilter}
                    onChange={(e) => setDispositionFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="all">{t('reports.allDispositions', 'All Dispositions (none, quarantine, reject)')}</option>
                    <option value="none">{t('reports.dispNone', 'Only Delivered (none)')}</option>
                    <option value="quarantine">{t('reports.dispQuarantine', 'Only Quarantined (quarantine)')}</option>
                    <option value="reject">{t('reports.dispReject', 'Only Gateway Blocked (reject)')}</option>
                  </select>
                </div>
              </div>

              {/* Report Language Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('profileModal.languageLabel', 'Report Language / Idioma')}</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setReportLanguage('en')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                      reportLanguage === 'en'
                        ? 'bg-cyan-950/20 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">🇺🇸</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        English (en)
                        {reportLanguage === 'en' && <Check className="w-3 h-3 text-cyan-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400">Executive Report in English</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setReportLanguage('es')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                      reportLanguage === 'es'
                        ? 'bg-cyan-950/20 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">🇪🇸</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        Español (es)
                        {reportLanguage === 'es' && <Check className="w-3 h-3 text-cyan-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400">Informe Ejecutivo en Español</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">{t('reports.templatePicker', 'Select Branding Template')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/20 border-cyan-500 shadow-md shadow-cyan-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center border"
                          style={{ borderColor: tpl.brand_colors?.primary || '#0284c7' }}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">{tpl.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-slate-800 text-slate-400">
                              {tpl.language || 'en'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{tpl.description}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: tpl.brand_colors?.primary || '#0f172a' }}
                              title="Primary Color"
                            />
                            <span
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: tpl.brand_colors?.secondary || '#0284c7' }}
                              title="Secondary Color"
                            />
                            <span
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: tpl.brand_colors?.accent || '#06b6d4' }}
                              title="Accent Color"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Format Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">{t('reports.exportFormats', 'Export Formats')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={formats.pdf}
                      onChange={(e) => setFormats({ ...formats, pdf: e.target.checked })}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-rose-400" />
                        {t('reports.pdfFormat', 'PDF Document')}
                      </span>
                      <p className="text-[10px] text-slate-500">{t('reports.pdfDesc', 'Executive Briefing & Visuals')}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={formats.xlsx}
                      onChange={(e) => setFormats({ ...formats, xlsx: e.target.checked })}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        {t('reports.xlsxFormat', 'Excel (.xlsx)')}
                      </span>
                      <p className="text-[10px] text-slate-500">{t('reports.xlsxDesc', 'Multi-Sheet & Formatting')}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={formats.csv}
                      onChange={(e) => setFormats({ ...formats, csv: e.target.checked })}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        {t('reports.csvFormat', 'CSV Bundle')}
                      </span>
                      <p className="text-[10px] text-slate-500">{t('reports.csvDesc', 'SIEM & Threat Feeds')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              {generationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={generating}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('reports.generatingBtn', 'Aggregating OpenSearch Telemetry & Generating Branded Assets...')}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>{t('reports.generateBtn', 'Generate & Compile Branded Report')}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Template Preview & Generated Result */}
          <div className="space-y-6">
            {/* Generated Output Card (If ready) */}
            {generatedResult && (
              <div className="glass-panel p-6 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{t('reports.successTitle', 'Report Generated Successfully!')}</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                  <div className="text-slate-400">{t('reports.targetLabel', 'Target')}: <strong className="text-white">{generatedResult.domain}</strong></div>
                  <div className="text-slate-400">{t('reports.totalVolume', 'Total Volume')}: <strong className="text-cyan-400">{generatedResult.summary?.total_messages?.toLocaleString()} msgs</strong></div>
                  <div className="text-slate-400">{t('policies.complianceScore', 'Pass Rate')}: <strong className="text-emerald-400">{generatedResult.summary?.pass_percentage}%</strong></div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">{t('reports.downloadFilesLabel', 'Download Generated Files:')}</label>
                  {generatedResult.files?.pdf && (
                    <a
                      href={getDownloadReportUrl(generatedResult.files.pdf.filename)}
                      onClick={(e) => {
                        e.preventDefault();
                        downloadReportFile(generatedResult.files.pdf.filename).catch(() => {
                          window.location.href = getDownloadReportUrl(generatedResult.files.pdf.filename);
                        });
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-400" />
                        <span>{t('reports.downloadPdf', 'Executive PDF')} ({Math.round(generatedResult.files.pdf.size_bytes / 1024)} KB)</span>
                      </div>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {generatedResult.files?.xlsx && (
                    <a
                      href={getDownloadReportUrl(generatedResult.files.xlsx.filename)}
                      onClick={(e) => {
                        e.preventDefault();
                        downloadReportFile(generatedResult.files.xlsx.filename).catch(() => {
                          window.location.href = getDownloadReportUrl(generatedResult.files.xlsx.filename);
                        });
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>{t('reports.downloadXlsx', 'Formatted Excel (.xlsx)')} ({Math.round(generatedResult.files.xlsx.size_bytes / 1024)} KB)</span>
                      </div>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {generatedResult.files?.csv && (
                    <a
                      href={getDownloadReportUrl(generatedResult.files.csv.filename)}
                      onClick={(e) => {
                        e.preventDefault();
                        downloadReportFile(generatedResult.files.csv.filename).catch(() => {
                          window.location.href = getDownloadReportUrl(generatedResult.files.csv.filename);
                        });
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-blue-400" />
                        <span>{t('reports.downloadCsv', 'Raw CSV Bundle')} ({Math.round(generatedResult.files.csv.size_bytes / 1024)} KB)</span>
                      </div>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => openEmailModal({
                        domain: generatedResult.domain,
                        template_id: selectedTemplateId,
                        formats: Object.keys(generatedResult.files || {}),
                        report_name: `DMARC Executive Report - ${generatedResult.domain}`
                      })}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email This Report</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Template Information Card */}
            {selectedTemplate && (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    {t('reports.activeBrandingSpec', 'Active Branding Specification')}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                    {selectedTemplate.id}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('reports.docTitle', 'Document Title')}</span>
                    <span className="text-slate-200 font-medium">{selectedTemplate.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('reports.clientRecipient', 'Client / Recipient')}</span>
                    <span className="text-cyan-400 font-medium">
                      {identityOrg || selectedTemplate.prepared_for}
                      {identityOrg ? <span className="text-[10px] text-cyan-300/70 ml-1.5">{t('reports.customOrgTag', '(Custom Org)')}</span> : null}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('reports.authorEntity', 'Authoring Entity / Logon')}</span>
                    <span className="text-slate-200 font-medium">
                      {identityLogon || selectedTemplate.prepared_by}
                      {identityLogon ? <span className="text-[10px] text-slate-400 ml-1.5">{t('reports.userLogonTag', '(User Logon)')}</span> : null}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-bold mb-1.5">{t('reports.colorSwatches', 'Corporate Color Swatches')}</span>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: selectedTemplate.brand_colors?.primary }} />
                      <span className="text-[9px] text-slate-400 font-mono">Primary</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: selectedTemplate.brand_colors?.secondary }} />
                      <span className="text-[9px] text-slate-400 font-mono">Secondary</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: selectedTemplate.brand_colors?.table_header }} />
                      <span className="text-[9px] text-slate-400 font-mono">Table</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: selectedTemplate.brand_colors?.pass_color }} />
                      <span className="text-[9px] text-slate-400 font-mono">Pass</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">{t('reports.confidentialityNotice', 'Confidentiality Notice:')}</span>
                  <p className="mt-1 text-slate-500 italic bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    "{selectedTemplate.confidentiality_notice}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TEMPLATES & BRANDING TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          {/* Organization & User Identity Card */}
          <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-cyan-950/20 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {t('reports.identityTitle', 'Organization & User Identity')}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase">
                      {t('reports.identityBadge', 'Report Author & Client')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('reports.identitySubtitle', 'Configure your user logon, organization name, and corporate logo. These credentials are automatically injected into executive PDF cover pages, Excel audit metadata, and client CSV headers.')}
                  </p>
                </div>
              </div>

              {identityStatus && (
                <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 ${
                  identityStatus.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {identityStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{identityStatus.message}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveIdentity} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    {t('reports.userLogonLabel', 'User Logon / Author Name')}
                  </label>
                  <input
                    type="text"
                    required
                    value={identityLogon}
                    onChange={(e) => setIdentityLogon(e.target.value)}
                    placeholder="e.g. admin or john.doe"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">{t('reports.userLogonHelp', 'Appears as Prepared By / Author on PDF, Excel & CSV reports.')}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    {t('reports.orgNameLabel', 'Organization / Client Name')}
                  </label>
                  <input
                    type="text"
                    value={identityOrg}
                    onChange={(e) => setIdentityOrg(e.target.value)}
                    placeholder="e.g. Acme Corporation or SOC Unit"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">{t('reports.orgNameHelp', 'Appears as Prepared For / Client on title blocks.')}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-cyan-400" />
                    {t('reports.logoLabel', 'Organization Logo (URL or Path)')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={identityLogo}
                      onChange={(e) => setIdentityLogo(e.target.value)}
                      placeholder="templates/assets/sentinel_logo.png or https://..."
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition"
                    />
                    {identityLogo && (
                      <div className="w-10 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        <img
                          src={identityLogo}
                          alt="Logo Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{t('reports.logoHelp', 'Logo rendered on executive PDF title page & sheet headers.')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {t('reports.currentIdentity', 'Current report identity:')} <strong className="text-white">{identityLogon || 'Default Author'}</strong> for <strong className="text-cyan-400">{identityOrg || 'Default Client'}</strong>
                </span>
                <button
                  type="submit"
                  disabled={savingIdentity}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingIdentity ? t('reports.savingIdentityBtn', 'Saving Identity...') : t('reports.saveIdentityBtn', 'Save Identity & Branding')}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">{t('reports.configuredTemplates', 'Configured Branding Templates')}</h2>
              <p className="text-xs text-slate-400">{t('reports.configuredTemplatesDesc', 'Manage client white-labeling, brand palettes, logos, and custom typography.')}</p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate({
                  id: `template_${Date.now()}`,
                  name: 'New Custom Template',
                  description: 'Custom client branding configuration',
                  logo: 'templates/assets/sentinel_logo.png',
                  logo_position: 'left',
                  logo_max_height_px: 50,
                  brand_colors: {
                    primary: '#0f172a',
                    secondary: '#0284c7',
                    accent: '#06b6d4',
                    table_header: '#1e293b',
                    table_header_text: '#f8fafc',
                    pass_color: '#10b981',
                    fail_color: '#ef4444'
                  },
                  title: 'DMARC Executive Authentication Report',
                  subtitle: 'Email Security & Authentication Audit',
                  prepared_for: 'Client Organization',
                  prepared_by: 'Security Operations Center',
                  confidentiality_notice: 'CONFIDENTIAL: Internal Security Audit',
                  language: 'en'
                });
                setIsModalOpen(true);
              }}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('reports.createNewTemplate', 'Create New Template')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-semibold">
                      {tpl.id}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-800 text-slate-400">
                      {tpl.language?.toUpperCase() || 'EN'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1">{tpl.name}</h3>
                  <p className="text-xs text-slate-400 mb-4">{tpl.description}</p>

                  <div className="space-y-2 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prepared For:</span>
                      <span className="font-semibold text-slate-200">{tpl.prepared_for}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Logo Pos:</span>
                      <span className="font-mono text-cyan-400 uppercase">{tpl.logo_position || 'left'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Brand Palette:</span>
                      <div className="flex items-center gap-1">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: tpl.brand_colors?.primary }} />
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: tpl.brand_colors?.secondary }} />
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: tpl.brand_colors?.accent }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setEditingTemplate(JSON.parse(JSON.stringify(tpl)));
                      setIsModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                  >
                    {t('reports.editTemplate', 'Edit Template')}
                  </button>

                  {!['default', 'acme_branded'].includes(tpl.id) && (
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                      title={t('reports.deleteTemplate', 'Delete Template')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. REPORT HISTORY TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'history' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                {t('reports.historyTitle', 'Audit Report Generation History')}
              </h2>
              <p className="text-xs text-slate-400">{t('reports.historySubtitle', 'Complete immutable record of all compiled DMARC executive reports.')}</p>
            </div>
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>{t('common.refresh', 'Refresh')}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-3">{t('reports.colTime', 'Timestamp (UTC)')}</th>
                  <th className="py-3 px-3">{t('reports.colScope', 'Scope / Domain')}</th>
                  <th className="py-3 px-3">{t('reports.colTemplate', 'Branding Template')}</th>
                  <th className="py-3 px-3">{t('reports.colAuthor', 'Generated By')}</th>
                  <th className="py-3 px-3">{t('reports.colMetrics', 'Metrics Snapshot')}</th>
                  <th className="py-3 px-3 text-right">{t('reports.colAssets', 'Download Assets')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      {t('reports.noHistory', 'No reports generated yet. Use the "Generate Report" tab to compile an executive audit.')}
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-white">{item.domain?.toUpperCase()}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-cyan-300">
                          {item.template_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {item.username || 'System'}
                      </td>
                      <td className="py-3 px-3">
                        {item.summary?.total_messages ? (
                          <span className="text-[11px] font-mono text-slate-300">
                            {item.summary.total_messages.toLocaleString()} msgs ({item.summary.pass_percentage}% pass)
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.files?.pdf && (
                            <a
                              href={getDownloadReportUrl(item.files.pdf.filename)}
                              onClick={(e) => {
                                e.preventDefault();
                                downloadReportFile(item.files.pdf.filename).catch(() => {
                                  window.location.href = getDownloadReportUrl(item.files.pdf.filename);
                                });
                              }}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Download PDF"
                            >
                              <FileText className="w-3 h-3 text-rose-400" />
                              <span>PDF</span>
                            </a>
                          )}
                          {item.files?.xlsx && (
                            <a
                              href={getDownloadReportUrl(item.files.xlsx.filename)}
                              onClick={(e) => {
                                e.preventDefault();
                                downloadReportFile(item.files.xlsx.filename).catch(() => {
                                  window.location.href = getDownloadReportUrl(item.files.xlsx.filename);
                                });
                              }}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Download Excel"
                            >
                              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                              <span>XLSX</span>
                            </a>
                          )}
                          {item.files?.csv && (
                            <a
                              href={getDownloadReportUrl(item.files.csv.filename)}
                              onClick={(e) => {
                                e.preventDefault();
                                downloadReportFile(item.files.csv.filename).catch(() => {
                                  window.location.href = getDownloadReportUrl(item.files.csv.filename);
                                });
                              }}
                              className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Download CSV"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-400" />
                              <span>CSV</span>
                            </a>
                          )}

                          <button
                            onClick={() => openEmailModal({
                              domain: item.domain,
                              template_id: item.template_id,
                              formats: item.formats,
                              report_name: `${item.template_name || 'DMARC Report'} - ${item.domain}`
                            })}
                            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Email Report"
                          >
                            <Mail className="w-3 h-3 text-cyan-400" />
                            <span>Email</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. AUTOMATED SCHEDULES TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'schedules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Schedule Form */}
          <div className="lg:col-span-1">
            <form onSubmit={handleCreateSchedule} className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                {t('reports.scheduleTitle', 'Schedule Recurring Report')}
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t('reports.scheduleName', 'Schedule Name')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Security Brief"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t('reports.targetDomain', 'Target Domain')}</label>
                <select
                  value={newSchedule.domain}
                  onChange={(e) => setNewSchedule({ ...newSchedule, domain: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="all">{t('reports.allDomains', 'All Domains')}</option>
                  {domains.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t('reports.cadenceFrequency', 'Cadence / Frequency')}</label>
                <select
                  value={newSchedule.schedule_type}
                  onChange={(e) => setNewSchedule({ ...newSchedule, schedule_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="daily">{t('reports.cadenceDaily', 'Daily (Every morning at 08:00 UTC)')}</option>
                  <option value="weekly">{t('reports.cadenceWeekly', 'Weekly (Every Monday at 08:00 UTC)')}</option>
                  <option value="monthly">{t('reports.cadenceMonthly', 'Monthly (1st of each month)')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t('reports.recipientEmails', 'Recipient Emails')}</label>
                <input
                  type="text"
                  required
                  placeholder="ciso@example.com, soc@example.com"
                  value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              {/* Time of Day & Timezone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Time of Day</label>
                  <input
                    type="time"
                    value={newSchedule.time_of_day || '08:00'}
                    onChange={(e) => setNewSchedule({ ...newSchedule, time_of_day: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Timezone</label>
                  <select
                    value={newSchedule.timezone || 'UTC'}
                    onChange={(e) => setNewSchedule({ ...newSchedule, timezone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">US Eastern (EST/EDT)</option>
                    <option value="America/Chicago">US Central (CST/CDT)</option>
                    <option value="America/Los_Angeles">US Pacific (PST/PDT)</option>
                    <option value="Europe/London">UK / London (GMT/BST)</option>
                    <option value="Europe/Paris">Europe / Paris (CET/CEST)</option>
                    <option value="Asia/Tokyo">Japan (JST)</option>
                  </select>
                </div>
              </div>

              {/* Send Email toggle */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSchedule.send_email === 1 || newSchedule.send_email === true}
                  onChange={(e) => setNewSchedule({ ...newSchedule, send_email: e.target.checked ? 1 : 0 })}
                  className="accent-cyan-500"
                />
                <span className="font-semibold text-white">Dispatch by Outgoing Email on Schedule</span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t('reports.colTemplate', 'Branding Template')}</label>
                <select
                  value={newSchedule.template_id}
                  onChange={(e) => setNewSchedule({ ...newSchedule, template_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('reports.saveScheduleBtn', 'Save Automated Schedule')}</span>
              </button>
            </form>
          </div>

          {/* Schedules List */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              {t('reports.activeSchedulesTitle', 'Active Automated Report Jobs')}
            </h3>

            {schedules.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{t('reports.noActiveSchedules', 'No automated schedules currently active.')}</p>
            ) : (
              <div className="space-y-3">
                {schedules.map((sc) => (
                  <div
                    key={sc.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{sc.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-cyan-500/20 text-cyan-400">
                          {sc.schedule_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Domain: <strong className="text-slate-200">{sc.domain}</strong> | Recipients: <strong className="text-slate-200">{sc.recipients}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        {sc.last_run_at ? `Last executed: ${new Date(sc.last_run_at).toLocaleString()}` : 'Status: Standing schedule (pending run)'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunSchedule(sc.id)}
                        disabled={runningScheduleId === sc.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Execute this report schedule immediately"
                      >
                        <Play className={`w-3.5 h-3.5 ${runningScheduleId === sc.id ? 'animate-spin' : ''}`} />
                        <span>{runningScheduleId === sc.id ? t('reports.executing', 'Executing...') : t('reports.runNow', 'Run Now')}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(sc.id)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}



      {/* ======================================================== */}
      {/* TEMPLATE EDITOR MODAL */}
      {/* ======================================================== */}
      {isModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-950 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-cyan-400" />
                Edit Branding Template: {editingTemplate.id}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                Close (ESC)
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Template Name</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Language</label>
                  <select
                    value={editingTemplate.language || 'en'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, language: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Document Title</label>
                  <input
                    type="text"
                    value={editingTemplate.title}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={editingTemplate.subtitle}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subtitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Prepared For (Client Name)</label>
                  <input
                    type="text"
                    value={editingTemplate.prepared_for}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, prepared_for: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Prepared By (Auditor / SOC)</label>
                  <input
                    type="text"
                    value={editingTemplate.prepared_by}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, prepared_by: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Color Pickers */}
              <div className="pt-2">
                <label className="block text-slate-300 font-bold mb-2">Corporate Brand Colors</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">Primary Color</span>
                    <input
                      type="color"
                      value={editingTemplate.brand_colors?.primary || '#0f172a'}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          brand_colors: { ...editingTemplate.brand_colors, primary: e.target.value }
                        })
                      }
                      className="w-full h-8 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">Secondary Color</span>
                    <input
                      type="color"
                      value={editingTemplate.brand_colors?.secondary || '#0284c7'}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          brand_colors: { ...editingTemplate.brand_colors, secondary: e.target.value }
                        })
                      }
                      className="w-full h-8 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">Pass Color</span>
                    <input
                      type="color"
                      value={editingTemplate.brand_colors?.pass_color || '#10b981'}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          brand_colors: { ...editingTemplate.brand_colors, pass_color: e.target.value }
                        })
                      }
                      className="w-full h-8 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Confidentiality Notice</label>
                <textarea
                  rows={2}
                  value={editingTemplate.confidentiality_notice}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, confidentiality_notice: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition cursor-pointer"
                >
                  Save Branding Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ON-DEMAND EMAIL REPORT MODAL */}
      {/* ======================================================== */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-400" />
                Dispatch Report via Outgoing Email
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
              <div className="text-slate-400">
                Scope: <strong className="text-white">{emailModalData.domain?.toUpperCase()}</strong>
              </div>
              <div className="text-slate-400">
                Template: <strong className="text-cyan-400">{emailModalData.template_id}</strong>
              </div>
              {emailModalData.date_from && emailModalData.date_to && (
                <div className="text-slate-400">
                  Window: <span className="text-slate-200">{emailModalData.date_from} to {emailModalData.date_to}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendEmailReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Email Addresses (comma-separated) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={emailModalData.recipients}
                  onChange={(e) => setEmailModalData({ ...emailModalData, recipients: e.target.value })}
                  placeholder="executive@example.com, auditor@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Attached File Formats</label>
                <div className="grid grid-cols-3 gap-2">
                  {['pdf', 'xlsx', 'csv'].map((fmt) => {
                    const isChecked = emailModalData.formats?.includes(fmt);
                    return (
                      <label
                        key={fmt}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold uppercase cursor-pointer transition ${
                          isChecked
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newFmts = e.target.checked
                              ? [...emailModalData.formats, fmt]
                              : emailModalData.formats.filter((f) => f !== fmt);
                            setEmailModalData({ ...emailModalData, formats: newFmts });
                          }}
                          className="accent-cyan-500"
                        />
                        <span>{fmt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {emailReportStatus && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    emailReportStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {emailReportStatus.message}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmailReport}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950 transition cursor-pointer disabled:opacity-50"
                >
                  {sendingEmailReport ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling & Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Enqueue Report Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
