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
  Database
} from 'lucide-react';
import {
  fetchReportTemplates,
  saveReportTemplate,
  deleteReportTemplate,
  generateReport,
  fetchReportHistory,
  fetchReportSchedules,
  createReportSchedule,
  deleteReportSchedule,
  getDownloadReportUrl,
  getDashboardsExportUrl
} from '../services/api';

export default function ReportsDashboard({ domains = [], selectedDomain, onSelectDomain, currentUser }) {
  const [activeSubTab, setActiveSubTab] = useState('generate'); // 'generate' | 'templates' | 'history' | 'schedules' | 'dashboards'
  
  // State: Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // State: Generator parameters
  const [reportDomain, setReportDomain] = useState(selectedDomain || 'all');
  const [datePreset, setDatePreset] = useState('30d'); // '7d' | '30d' | '90d' | 'all'
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
    recipients: '',
    formats: ['pdf', 'xlsx']
  });

  // State: Template Editor Modal
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadHistory();
    loadSchedules();
  }, []);

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
    }

    try {
      const res = await generateReport({
        domain: reportDomain,
        date_from: dateFrom,
        date_to: dateTo,
        org_name: orgFilter,
        disposition: dispositionFilter,
        template_id: selectedTemplateId,
        formats: activeFormats
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

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
                ENTERPRISE REPORTING ENGINE
              </span>
              <span className="text-xs text-slate-500">• OpenSearch 3.3.2</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-400" />
              Branded DMARC Executive Reports & Dashboards
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Generate pixel-perfect client reports in PDF, multi-sheet Excel (.xlsx), and CSV formats with customizable corporate branding, logo placement, readiness verdict, and full OpenSearch Dashboards integration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/reports/dashboards-export"
              download="opensearch-dmarc-dashboards.ndjson"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Download OpenSearch NDJSON
            </a>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          {[
            { id: 'generate', label: 'Generate Report', icon: FileText },
            { id: 'templates', label: 'Branding & Templates', icon: Palette },
            { id: 'history', label: 'Report History', icon: Clock },
            { id: 'schedules', label: 'Automated Schedules', icon: Calendar },
            { id: 'dashboards', label: 'OpenSearch Dashboards & Queries', icon: Database }
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
      {/* 1. GENERATE REPORT TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Options Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleGenerateReport} className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Report Parameters & Scope
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Domain Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Monitored Domain</label>
                  <select
                    value={reportDomain}
                    onChange={(e) => setReportDomain(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="all">All Monitored Domains</option>
                    {domains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Time Range Preset</label>
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="7d">Last 7 Days (Tactical)</option>
                    <option value="30d">Last 30 Days (Standard Audit)</option>
                    <option value="90d">Last 90 Days (Quarterly Executive)</option>
                    <option value="all">All Ingested Data</option>
                  </select>
                </div>

                {/* Reporting Org Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Reporting Organization</label>
                  <select
                    value={orgFilter}
                    onChange={(e) => setOrgFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="all">All Organizations (Google, Microsoft, etc.)</option>
                    <option value="google.com">google.com / Google Inc.</option>
                    <option value="microsoft.com">microsoft.com</option>
                    <option value="yahoo.com">yahoo.com</option>
                  </select>
                </div>

                {/* Disposition Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Receiver Policy Disposition</label>
                  <select
                    value={dispositionFilter}
                    onChange={(e) => setDispositionFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="all">All Dispositions (none, quarantine, reject)</option>
                    <option value="none">Only Delivered (none)</option>
                    <option value="quarantine">Only Quarantined (quarantine)</option>
                    <option value="reject">Only Gateway Blocked (reject)</option>
                  </select>
                </div>
              </div>

              {/* Template Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Select Branding Template</label>
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
                <label className="block text-xs font-bold text-slate-300 mb-2">Export Formats</label>
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
                        PDF Document
                      </span>
                      <p className="text-[10px] text-slate-500">Executive Briefing & Visuals</p>
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
                        Excel (.xlsx)
                      </span>
                      <p className="text-[10px] text-slate-500">Multi-Sheet & Formatting</p>
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
                        CSV Bundle
                      </span>
                      <p className="text-[10px] text-slate-500">SIEM & Threat Feeds</p>
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
                    <span>Aggregating OpenSearch Telemetry & Generating Branded Assets...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Generate & Compile Branded Report</span>
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
                  <span>Report Generated Successfully!</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                  <div className="text-slate-400">Target: <strong className="text-white">{generatedResult.domain}</strong></div>
                  <div className="text-slate-400">Total Volume: <strong className="text-cyan-400">{generatedResult.summary?.total_messages?.toLocaleString()} msgs</strong></div>
                  <div className="text-slate-400">Pass Rate: <strong className="text-emerald-400">{generatedResult.summary?.pass_percentage}%</strong></div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Download Generated Files:</label>
                  {generatedResult.files?.pdf && (
                    <a
                      href={`/api/reports/download/${generatedResult.files.pdf.filename}`}
                      className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-400" />
                        <span>Executive PDF ({Math.round(generatedResult.files.pdf.size_bytes / 1024)} KB)</span>
                      </div>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {generatedResult.files?.xlsx && (
                    <a
                      href={`/api/reports/download/${generatedResult.files.xlsx.filename}`}
                      className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Formatted Excel (.xlsx) ({Math.round(generatedResult.files.xlsx.size_bytes / 1024)} KB)</span>
                      </div>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {generatedResult.files?.csv && (
                    <a
                      href={`/api/reports/download/${generatedResult.files.csv.filename}`}
                      className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-blue-400" />
                        <span>Raw CSV Bundle ({Math.round(generatedResult.files.csv.size_bytes / 1024)} KB)</span>
                      </div>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Template Information Card */}
            {selectedTemplate && (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    Active Branding Specification
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                    {selectedTemplate.id}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Document Title</span>
                    <span className="text-slate-200 font-medium">{selectedTemplate.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Client / Recipient</span>
                    <span className="text-cyan-400 font-medium">{selectedTemplate.prepared_for}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Authoring Entity</span>
                    <span className="text-slate-200 font-medium">{selectedTemplate.prepared_by}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-bold mb-1.5">Corporate Color Swatches</span>
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
                  <span className="font-semibold text-slate-300">Confidentiality Notice:</span>
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Configured Branding Templates</h2>
              <p className="text-xs text-slate-400">Manage client white-labeling, brand palettes, logos, and custom typography.</p>
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
              <span>Create New Template</span>
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
                    Edit Template
                  </button>

                  {!['default', 'acme_branded'].includes(tpl.id) && (
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                      title="Delete Template"
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
                Audit Report Generation History
              </h2>
              <p className="text-xs text-slate-400">Complete immutable record of all compiled DMARC executive reports.</p>
            </div>
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-3">Timestamp (UTC)</th>
                  <th className="py-3 px-3">Scope / Domain</th>
                  <th className="py-3 px-3">Branding Template</th>
                  <th className="py-3 px-3">Generated By</th>
                  <th className="py-3 px-3">Metrics Snapshot</th>
                  <th className="py-3 px-3 text-right">Download Assets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No reports generated yet. Use the "Generate Report" tab to compile an executive audit.
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
                              href={`/api/reports/download/${item.files.pdf.filename}`}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Download PDF"
                            >
                              <FileText className="w-3 h-3 text-rose-400" />
                              <span>PDF</span>
                            </a>
                          )}
                          {item.files?.xlsx && (
                            <a
                              href={`/api/reports/download/${item.files.xlsx.filename}`}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Download Excel"
                            >
                              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                              <span>XLSX</span>
                            </a>
                          )}
                          {item.files?.csv && (
                            <a
                              href={`/api/reports/download/${item.files.csv.filename}`}
                              className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Download CSV"
                            >
                              <Download className="w-3 h-3 text-blue-400" />
                              <span>CSV</span>
                            </a>
                          )}
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
                Schedule Recurring Report
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Schedule Name</label>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">Target Domain</label>
                <select
                  value={newSchedule.domain}
                  onChange={(e) => setNewSchedule({ ...newSchedule, domain: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="all">All Domains</option>
                  {domains.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cadence / Frequency</label>
                <select
                  value={newSchedule.schedule_type}
                  onChange={(e) => setNewSchedule({ ...newSchedule, schedule_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="daily">Daily (Every morning at 08:00 UTC)</option>
                  <option value="weekly">Weekly (Every Monday at 08:00 UTC)</option>
                  <option value="monthly">Monthly (1st of each month)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Recipient Emails</label>
                <input
                  type="text"
                  required
                  placeholder="ciso@example.com, soc@example.com"
                  value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Branding Template</label>
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
                <span>Save Automated Schedule</span>
              </button>
            </form>
          </div>

          {/* Schedules List */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Active Automated Report Jobs
            </h3>

            {schedules.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No automated schedules currently active.</p>
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
                    </div>

                    <button
                      onClick={() => handleDeleteSchedule(sc.id)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. OPENSEARCH DASHBOARDS & DSL QUERIES TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'dashboards' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  OpenSearch Dashboards Saved Objects Import (.ndjson)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Export file containing 5 complete Dashboards, Index Pattern (<code className="text-cyan-300">dmarc_aggregate-*</code>), and 8 custom visualizations ready to import into OpenSearch Dashboards.
                </p>
              </div>

              <a
                href="/api/reports/dashboards-export"
                download="opensearch-dmarc-dashboards.ndjson"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:opacity-90 transition shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Saved Objects (.ndjson)</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              {[
                { title: '1. Executive Overview', desc: 'Pass rate timeline, top domains, disposition pie chart' },
                { title: '2. Authentication & Alignment', desc: 'SPF x DKIM matrix, DKIM selectors, override types' },
                { title: '3. Traffic & Sender Inventory', desc: 'Top sender base domains, IPs, reverse DNS, GeoIP' },
                { title: '4. Security & Threat Hunting', desc: 'Fail/fail spoofing IPs, unauthorized volume spikes' },
                { title: '5. Operational Health', desc: 'Legitimate sender hygiene, policy readiness (p=reject)' }
              ].map((d, i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div className="font-bold text-cyan-400 mb-1">{d.title}</div>
                  <div className="text-[11px] text-slate-400">{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Import Instructions */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
            <h4 className="text-sm font-bold text-white">How to Import Into OpenSearch Dashboards:</h4>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5">
              <li>Click the <strong>Download Saved Objects (.ndjson)</strong> button above.</li>
              <li>Open your OpenSearch Dashboards instance (e.g. at port 5601).</li>
              <li>Navigate to <strong>Stack Management</strong> &gt; <strong>Saved Objects</strong>.</li>
              <li>Click <strong>Import</strong> in the top right corner and upload <code className="text-cyan-300">opensearch-dmarc-dashboards.ndjson</code>.</li>
              <li>Select <em>"Automatically overwrite conflicts"</em> and confirm the import. All 5 dashboards will immediately appear under the Dashboards menu!</li>
            </ol>
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
    </div>
  );
}
