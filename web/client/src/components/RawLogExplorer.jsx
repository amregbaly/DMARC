import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileJson,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Download,
  WrapText,
  Eye,
  Code,
  Globe,
  Server,
  Mail,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  Bot,
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { fetchRecords, fetchAiStatus, diagnoseLogWithAi } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

// Helper: Escape HTML special characters for safe code rendering
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Helper: Syntax highlight a single JSON line with high-contrast Black font for strings/values
function highlightJsonLine(rawLine, search = '') {
  let line = escapeHtml(rawLine);

  // Syntax highlighting regex for JSON tokens
  line = line.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // Property Key: Dark navy / slate bold (ALWAYS crisp and visible)
          const keyName = match.slice(0, -1);
          return `<span style="color: #0f172a; font-weight: 700;">${keyName}</span><span style="color: #64748b; font-weight: 600;">:</span>`;
        } else {
          // String Value: Crisp TRUE BLACK font as explicitly requested
          return `<span style="color: #000000; font-weight: 600;">${match}</span>`;
        }
      } else if (/true/.test(match)) {
        return `<span style="color: #15803d; background-color: #dcfce7; border: 1px solid #86efac; border-radius: 4px; padding: 1px 6px; font-weight: 700; font-size: 11px;">true</span>`;
      } else if (/false/.test(match)) {
        return `<span style="color: #b91c1c; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; padding: 1px 6px; font-weight: 700; font-size: 11px;">false</span>`;
      } else if (/null/.test(match)) {
        return `<span style="color: #64748b; font-style: italic;">null</span>`;
      } else {
        // Numbers: Deep bold blue
        return `<span style="color: #1d4ed8; font-weight: 700;">${match}</span>`;
      }
    }
  );

  // If there's an active in-editor search query, highlight it in bright amber with black font
  if (search && search.trim().length > 0) {
    const term = search.trim();
    const escapedTerm = escapeHtml(term);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    line = line.replace(regex, '<mark style="background-color: #fde047; color: #000000; padding: 1px 4px; border-radius: 3px; font-weight: 700;">$1</mark>');
  }

  return line;
}

export default function RawLogExplorer({ selectedDomain }) {
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalTab, setModalTab] = useState('visual'); // 'visual' | 'json' | 'ai'
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const [jsonSearch, setJsonSearch] = useState('');

  // AI Diagnostics State
  const [aiStatus, setAiStatus] = useState({ enabled: false, configured: false, features: {} });
  const [aiAnalysisMap, setAiAnalysisMap] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [copiedDnsIndex, setCopiedDnsIndex] = useState(null);

  useEffect(() => {
    fetchAiStatus()
      .then(res => setAiStatus(res || { enabled: false, configured: false, features: {} }))
      .catch(() => setAiStatus({ enabled: false, configured: false, features: {} }));
  }, []);

  async function handleRunAiAnalysis(recordToAnalyze = selectedRecord) {
    if (!recordToAnalyze) return;
    setModalTab('ai');
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await diagnoseLogWithAi(recordToAnalyze);
      if (res && res.status === 'success') {
        setAiAnalysisMap(prev => ({
          ...prev,
          [recordToAnalyze.id]: res
        }));
      } else {
        setAiError(res?.error || 'AI Diagnosis failed to generate.');
      }
    } catch (err) {
      setAiError(err.message || 'Failed to connect to AI Intelligence service.');
    } finally {
      setAiLoading(false);
    }
  }

  function handleCopyDns(text, idx) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedDnsIndex(idx);
    setTimeout(() => setCopiedDnsIndex(null), 2500);
  }

  useEffect(() => {
    loadData();
  }, [page, search, selectedDomain]);

  // Keyboard shortcut: close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedRecord) {
        setSelectedRecord(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRecord]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchRecords({
        page,
        limit,
        search,
        domain: selectedDomain
      });
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load raw records:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Pretty JSON string of the currently selected record
  const recordJsonString = useMemo(() => {
    if (!selectedRecord) return '';
    return JSON.stringify(selectedRecord, null, 2);
  }, [selectedRecord]);

  // Split lines for the code viewer with line numbers
  const jsonLines = useMemo(() => {
    if (!recordJsonString) return [];
    return recordJsonString.split('\n');
  }, [recordJsonString]);

  // Filtered line indices when searching inside the JSON editor
  const matchingLineIndices = useMemo(() => {
    if (!jsonSearch || !jsonSearch.trim()) return null;
    const term = jsonSearch.toLowerCase();
    const set = new Set();
    jsonLines.forEach((line, idx) => {
      if (line.toLowerCase().includes(term)) {
        set.add(idx);
      }
    });
    return set;
  }, [jsonLines, jsonSearch]);

  const handleCopyId = (e) => {
    e.stopPropagation();
    if (!selectedRecord?.id) return;
    navigator.clipboard.writeText(selectedRecord.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyJson = () => {
    if (!recordJsonString) return;
    navigator.clipboard.writeText(recordJsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!recordJsonString) return;
    const blob = new Blob([recordJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dmarc-log-${selectedRecord?.id || 'record'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-200 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileJson className="w-4.5 h-4.5" />
            </div>
            {t('rawLogs.title', 'OpenSearch DMARC Aggregate Log Explorer')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('rawLogs.subtitle', 'Direct query inspection of individual aggregate report records in OpenSearch.')}
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('rawLogs.searchPlaceholder', 'Filter logs by IP, domain, selector, or disposition...')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-xs"
          />
        </form>
      </div>

      {/* Records Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-sans font-semibold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">{t('rawLogs.timestamp', 'Date')}</th>
                <th className="px-5 py-3.5">{t('rawLogs.headerFrom', 'Header From')}</th>
                <th className="px-5 py-3.5">{t('rawLogs.sourceIp', 'Sender IP')}</th>
                <th className="px-5 py-3.5">{t('rawLogs.reporter', 'Reporter')}</th>
                <th className="px-5 py-3.5 text-right">{t('rawLogs.messages', 'Messages')}</th>
                <th className="px-5 py-3.5 text-center">{t('rawLogs.spfResult', 'SPF')}</th>
                <th className="px-5 py-3.5 text-center">{t('rawLogs.dkimResult', 'DKIM')}</th>
                <th className="px-5 py-3.5 text-center">{t('rawLogs.dmarcResult', 'DMARC')}</th>
                <th className="px-5 py-3.5 text-center">{t('rawLogs.disposition', 'Policy')}</th>
                <th className="px-5 py-3.5 text-center">{t('common.actions', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 text-xs font-medium">
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      Loading records from OpenSearch...
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FileJson className="w-8 h-8 text-slate-500 mb-1" />
                      <span className="font-semibold text-slate-200">No matching records found</span>
                      <span className="text-xs text-slate-400">Try adjusting your search filter or date scope.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setSelectedRecord(r);
                      setModalTab('visual');
                    }}
                    className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(r.date_begin).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                      {r.header_from}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-cyan-400 font-semibold">
                      {r.source_ip_address}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-[11px] truncate max-w-[150px]">
                      {r.org_name}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-200">
                      {r.message_count?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.spf_aligned
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {r.spf_aligned ? 'pass' : 'fail'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.dkim_aligned
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {r.dkim_aligned ? 'pass' : 'fail'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        r.passed_dmarc
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {r.passed_dmarc ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {r.passed_dmarc ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        r.disposition === 'reject'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : r.disposition === 'quarantine'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {r.disposition}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/50 px-2.5 py-1 rounded-lg border border-cyan-800/60 transition-colors shadow-2xs">
                        <Eye className="w-3 h-3" />
                        Inspect
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-bold text-slate-200">{records.length}</span> of{' '}
            <span className="font-bold text-slate-200">{total}</span> total documents
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-200 font-semibold px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REDESIGNED DMARC DOCUMENT INSPECTOR MODAL
          ========================================================================= */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-200">
                      {t('rawLogs.inspectorTitle', 'OpenSearch DMARC Document Inspector')}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wider">
                      OpenSearch Hit
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {selectedRecord.id}
                    </span>
                    <button
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                      title="Copy Document ID"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId ? t('rawLogs.copied', 'Copied!') : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* View Switcher & Close button */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
                  <button
                    onClick={() => setModalTab('visual')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      modalTab === 'visual'
                        ? 'bg-slate-800 text-cyan-400 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('rawLogs.viewVisual', 'Structured Overview')}
                  </button>
                  <button
                    onClick={() => setModalTab('json')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      modalTab === 'json'
                        ? 'bg-slate-800 text-cyan-400 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    {t('rawLogs.viewJson', 'Raw JSON Log')}
                  </button>
                  <button
                    onClick={() => {
                      setModalTab('ai');
                      if (!aiAnalysisMap[selectedRecord.id] && !aiLoading && aiStatus.enabled) {
                        handleRunAiAnalysis(selectedRecord);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer relative ${
                      modalTab === 'ai'
                        ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/60 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-cyan-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('rawLogs.viewAi', 'AI Forensic RCA')}</span>
                    {aiStatus.enabled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shadow-2xs"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/40">
              {modalTab === 'visual' ? (
                /* =============================================================
                   VIEW 1: STRUCTURED HUMAN-READABLE OVERVIEW
                   ============================================================= */
                <div className="space-y-6">
                  {/* Top Executive Verdict Banner */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                        selectedRecord.passed_dmarc
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {selectedRecord.passed_dmarc ? (
                          <ShieldCheck className="w-8 h-8" />
                        ) : (
                          <ShieldAlert className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            selectedRecord.passed_dmarc
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {selectedRecord.passed_dmarc ? 'DMARC Passed' : 'DMARC Failed'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            selectedRecord.disposition === 'reject'
                              ? 'bg-rose-500/20 text-rose-300'
                              : selectedRecord.disposition === 'quarantine'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            Policy: {selectedRecord.disposition || 'none'}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold text-slate-200 mt-1">
                          {selectedRecord.header_from}
                        </h4>
                        <p className="text-xs text-slate-400">
                          Envelope From: <span className="font-semibold text-slate-200">{selectedRecord.envelope_from || 'None'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Message Volume</span>
                        <div className="text-2xl font-black font-mono text-slate-200">
                          {selectedRecord.message_count?.toLocaleString() || 1}
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-mono text-slate-400 mt-1">
                        {new Date(selectedRecord.date_begin).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* AI Forensic RCA Callout Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/30 border border-cyan-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 border border-cyan-500/30">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">AI Forensic Root-Cause Analysis</span>
                          {aiStatus.enabled && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-medium border border-cyan-500/30">
                              {aiStatus.provider} • {aiStatus.model}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {selectedRecord.passed_dmarc
                            ? 'Run deep cryptographic inspection & selector verification report.'
                            : 'Instantly diagnose why SPF or DKIM failed alignment and get ready-to-deploy DNS fixes.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRunAiAnalysis(selectedRecord)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiAnalysisMap[selectedRecord.id] ? 'View Forensic Report' : 'Analyze with AI'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 4 Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Sender & Network Identity */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-cyan-400">
                        <Server className="w-3.5 h-3.5" />
                        {t('rawLogs.senderIntelligence', 'Sender & Network Identity')}
                      </h5>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">{t('rawLogs.sourceIp', 'Source IP')}</span>
                          <span className="font-mono font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {selectedRecord.source_ip_address}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">Reverse DNS (PTR)</span>
                          <span className="font-mono text-slate-200 truncate max-w-[200px]" title={selectedRecord.source_reverse_dns}>
                            {selectedRecord.source_reverse_dns || 'No PTR Record'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">ASN & Org</span>
                          <span className="font-semibold text-slate-200">
                            {selectedRecord.source_asn ? `AS${selectedRecord.source_asn} (${selectedRecord.source_as_name || 'Unknown'})` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">Origin Country</span>
                          <span className="font-bold text-slate-200 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {selectedRecord.source_country || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-400">Base Domain / Service</span>
                          <span className="font-medium text-slate-200">
                            {selectedRecord.source_base_domain || selectedRecord.source_name || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Authentication & Alignment Analysis */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {t('rawLogs.authAlignment', 'Authentication & Alignment Analysis')}
                      </h5>

                      <div className="space-y-2.5 text-xs">
                        {/* SPF Status */}
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200 block">SPF Alignment</span>
                            <span className="text-[11px] text-slate-400">
                              Evaluated against envelope domain: {selectedRecord.envelope_from || 'none'}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            selectedRecord.spf_aligned
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {selectedRecord.spf_aligned ? 'Aligned (Pass)' : 'Misaligned (Fail)'}
                          </span>
                        </div>

                        {/* DKIM Status */}
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200 block">DKIM Alignment</span>
                            <span className="text-[11px] text-slate-400">
                              Evaluated against header domain: {selectedRecord.header_from}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            selectedRecord.dkim_aligned
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {selectedRecord.dkim_aligned ? 'Aligned (Pass)' : 'Misaligned (Fail)'}
                          </span>
                        </div>

                        {/* Signatures & Scopes details */}
                        {selectedRecord.dkim_results && selectedRecord.dkim_results.length > 0 && (
                          <div className="text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">DKIM Signatures: </span>
                            {selectedRecord.dkim_results.map((d, i) => (
                              <span key={i} className="inline-block bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded mr-1 mt-1 font-mono">
                                s={d.selector} ({d.domain}) → <strong className={d.result === 'pass' ? 'text-emerald-400' : 'text-rose-400'}>{d.result}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 3: Reporter Metadata */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                        <Mail className="w-3.5 h-3.5" />
                        {t('rawLogs.reportMeta', 'Reporter & Document Metadata')}
                      </h5>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">Reporting Organization</span>
                          <span className="font-bold text-slate-200">{selectedRecord.org_name}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">Reporter Contact</span>
                          <span className="font-mono text-slate-300 truncate max-w-[200px]" title={selectedRecord.org_email}>
                            {selectedRecord.org_email || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">Report ID</span>
                          <span className="font-mono text-slate-300 truncate max-w-[200px]" title={selectedRecord.report_id}>
                            {selectedRecord.report_id || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-400">Timespan</span>
                          <span className="font-mono text-[11px] text-slate-300">
                            {new Date(selectedRecord.date_begin).toISOString().replace('T', ' ').slice(0, 16)} UTC
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Published Policy */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                        <Globe className="w-3.5 h-3.5" />
                        {t('rawLogs.publishedPolicy', 'Published DMARC Policy')}
                      </h5>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Policy (p)</span>
                          <span className="font-black font-mono text-purple-400 uppercase text-sm">
                            {selectedRecord.published_policy?.p || selectedRecord.disposition || 'none'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Subdomain (sp)</span>
                          <span className="font-black font-mono text-purple-400 uppercase text-sm">
                            {selectedRecord.published_policy?.sp || 'same'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Enforcement %</span>
                          <span className="font-black font-mono text-slate-200 text-sm">
                            {selectedRecord.published_policy?.pct !== undefined ? `${selectedRecord.published_policy.pct}%` : '100%'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-400">
                        <span>Alignment Modes:</span>
                        <div className="space-x-2 font-mono text-[11px]">
                          <span>adkim: <strong className="text-slate-200">{selectedRecord.published_policy?.adkim || 'r'}</strong></span>
                          <span>aspf: <strong className="text-slate-200">{selectedRecord.published_policy?.aspf || 'r'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : modalTab === 'json' ? (
                /* =============================================================
                   VIEW 2: RAW JSON CODE INSPECTOR WITH BLACK FONT
                   ============================================================= */
                <div className="space-y-3">
                  {/* JSON Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800 shadow-2xs">
                    {/* In-Log Search */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder={t('rawLogs.searchInLog', 'Search keys & values...')}
                        value={jsonSearch}
                        onChange={(e) => setJsonSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                      {jsonSearch && (
                        <button
                          onClick={() => setJsonSearch('')}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Stats & Tools */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 px-2 hidden sm:inline">
                        {jsonLines.length} lines • {(new Blob([recordJsonString]).size / 1024).toFixed(1)} KB
                      </span>

                      {/* Word Wrap Toggle */}
                      <button
                        onClick={() => setIsWrapped(!isWrapped)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          isWrapped
                            ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                        title="Toggle Word Wrap"
                      >
                        <WrapText className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">{t('rawLogs.wrapText', 'Wrap')}</span>
                      </button>

                      {/* Copy JSON */}
                      <button
                        onClick={handleCopyJson}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        {copiedJson ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">{t('rawLogs.copied', 'Copied!')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t('rawLogs.copyJson', 'Copy JSON')}</span>
                          </>
                        )}
                      </button>

                      {/* Download JSON */}
                      <button
                        onClick={handleDownloadJson}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('rawLogs.downloadJson', 'Download')}</span>
                      </button>
                    </div>
                  </div>

                  {/* High-Contrast Code Canvas with Line Numbers & Pure Black Font */}
                  <div
                    className="rounded-xl overflow-hidden shadow-sm"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    <div className="overflow-x-auto max-h-[55vh]">
                      <table className="w-full text-left font-mono text-[12px] leading-relaxed border-collapse" style={{ backgroundColor: '#ffffff' }}>
                        <tbody>
                          {jsonLines.map((line, idx) => {
                            const isMatch = matchingLineIndices ? matchingLineIndices.has(idx) : false;
                            return (
                              <tr
                                key={idx}
                                style={{
                                  backgroundColor: isMatch ? '#fef9c3' : 'transparent',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isMatch) e.currentTarget.style.backgroundColor = '#f1f5f9';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isMatch) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {/* Line Number Gutter */}
                                <td
                                  className="py-0.5 pl-3 pr-3 select-none text-right text-[11px] font-mono w-12 shrink-0"
                                  style={{
                                    backgroundColor: '#f8fafc',
                                    color: '#64748b',
                                    borderRight: '1px solid #e2e8f0'
                                  }}
                                >
                                  {idx + 1}
                                </td>

                                {/* Highlighted Code Content with PURE BLACK font for strings and values */}
                                <td
                                  className={`py-0.5 px-4 font-mono ${
                                    isWrapped ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                                  }`}
                                  style={{ color: '#000000' }}
                                  dangerouslySetInnerHTML={{
                                    __html: highlightJsonLine(line, jsonSearch)
                                  }}
                                />
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* =============================================================
                   VIEW 3: AI FORENSIC ROOT-CAUSE ANALYSIS (RCA)
                   ============================================================= */
                <div className="space-y-6">
                  {/* If AI is disabled or not configured */}
                  {!aiStatus.enabled ? (
                    <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h4 className="text-base font-bold text-white">AI Intelligence Is Disabled</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Forensic Root-Cause Analysis requires an active AI provider. Enable and configure Google Gemini, OpenAI, Claude, or OpenRouter with an API key from the Admin Control Panel.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <span className="text-[11px] px-3 py-1 rounded-lg bg-slate-800 text-slate-400 font-mono">
                          Admin Tab: AI Intelligence
                        </span>
                      </div>
                    </div>
                  ) : aiLoading ? (
                    /* Futuristic AI Pulse Scanner */
                    <div className="p-12 rounded-2xl bg-slate-900/80 border border-cyan-500/30 text-center space-y-5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
                      <div className="relative flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Sparkles className="w-7 h-7 text-cyan-400 animate-pulse" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">Generating Forensic DMARC Diagnosis</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Analyzing RFC 7489 alignment, SPF mechanisms, DKIM selectors, and sender attribution via <span className="text-cyan-400 font-semibold">{aiStatus.provider} ({aiStatus.model})</span>...
                        </p>
                      </div>
                      <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
                        <div className="w-full h-full bg-cyan-400 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ) : aiError ? (
                    /* Error State */
                    <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>AI Diagnosis Error</span>
                      </div>
                      <p className="text-xs text-rose-200/90 leading-relaxed font-mono bg-rose-950/50 p-3 rounded-lg border border-rose-900/50">
                        {aiError}
                      </p>
                      <button
                        onClick={() => handleRunAiAnalysis(selectedRecord)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Diagnosis</span>
                      </button>
                    </div>
                  ) : aiAnalysisMap[selectedRecord.id] ? (
                    /* Render Detailed Diagnosis */
                    (() => {
                      const report = aiAnalysisMap[selectedRecord.id];
                      const diag = report.diagnosis || {};
                      const meta = report.meta || {};

                      const severityColors = {
                        critical: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
                        high: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
                        medium: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
                        low: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
                        clean: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      };

                      const currentSev = (diag.severity || 'medium').toLowerCase();
                      const sevStyle = severityColors[currentSev] || severityColors.medium;

                      return (
                        <div className="space-y-6">
                          {/* Verdict & Meta Bar */}
                          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${sevStyle}`}>
                                    Severity: {diag.severity || 'Medium'}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 uppercase">
                                    Status: {diag.authStatus || (selectedRecord.passed_dmarc ? 'Pass' : 'Fail')}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold text-white mt-1">
                                  RFC Forensic Analysis Report
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start md:self-center">
                              <span className="text-[11px] font-mono text-cyan-400/90 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/60">
                                ⚡ {meta.latencyMs || 0}ms • {meta.provider || aiStatus.provider} ({meta.model || aiStatus.model})
                              </span>
                              <button
                                onClick={() => handleRunAiAnalysis(selectedRecord)}
                                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                                title="Re-run AI Analysis"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Executive Summary Callout */}
                          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-950 border-l-4 border-l-cyan-400 border border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider mb-1 flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5" />
                              <span>Executive Summary</span>
                            </div>
                            <p className="text-sm text-slate-100 font-medium leading-relaxed">
                              {diag.summary}
                            </p>
                          </div>

                          {/* Forensic Investigation Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card 1: Root Cause Technical Analysis */}
                            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Root-Cause Breakdown</span>
                              </h5>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {diag.rootCause}
                              </p>
                              <div className="space-y-2 pt-2 border-t border-slate-800">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">SPF Alignment:</span>
                                  <p className="text-xs text-slate-300 mt-0.5">{diag.alignmentDetails?.spf || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">DKIM Alignment:</span>
                                  <p className="text-xs text-slate-300 mt-0.5">{diag.alignmentDetails?.dkim || 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Threat & Attribution */}
                            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" />
                                <span>Attribution &amp; Sending Service</span>
                              </h5>
                              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Identified Vendor / Entity:</span>
                                <div className="text-sm font-bold text-white mt-0.5">
                                  {diag.vendorIdentified || 'Unknown Entity'}
                                </div>
                              </div>
                              <div className="space-y-2 text-xs text-slate-300">
                                <div className="flex justify-between py-1 border-b border-slate-800/60">
                                  <span className="text-slate-400">Connecting IP:</span>
                                  <span className="font-mono text-white">{selectedRecord.source_ip_address}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-800/60">
                                  <span className="text-slate-400">PTR Reverse DNS:</span>
                                  <span className="font-mono text-slate-200 truncate max-w-[200px]" title={selectedRecord.source_reverse_dns}>
                                    {selectedRecord.source_reverse_dns || 'None'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-1">
                                  <span className="text-slate-400">ASN / Network:</span>
                                  <span className="text-slate-200">AS{selectedRecord.source_asn || 'N/A'} ({selectedRecord.source_as_name || 'N/A'})</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Suggested Remediation Plan */}
                          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Remediation &amp; Corrective Action</span>
                            </h5>
                            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                              {diag.suggestedFix}
                            </p>
                          </div>

                          {/* DNS Records To Deploy */}
                          {diag.dnsRecordsNeeded && diag.dnsRecordsNeeded.length > 0 && (
                            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                <Code className="w-3.5 h-3.5" />
                                <span>Ready-to-Deploy DNS Configuration</span>
                              </h5>
                              <div className="space-y-2">
                                {diag.dnsRecordsNeeded.map((dnsRecord, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                                    <code className="text-xs font-mono text-cyan-300 break-all select-all">
                                      {dnsRecord}
                                    </code>
                                    <button
                                      onClick={() => handleCopyDns(dnsRecord, idx)}
                                      className="ml-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 transition"
                                    >
                                      {copiedDnsIndex === idx ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400 font-bold">Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* Ready to Diagnose Button */
                    <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h4 className="text-base font-bold text-white">1-Click AI Root-Cause Forensics</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Run an automated forensic audit on this record using <strong className="text-cyan-400">{aiStatus.provider} ({aiStatus.model})</strong>. The model will analyze header-from vs envelope-from, check SPF mechanism matches, evaluate DKIM selector signing domain alignment, and generate precise corrective DNS records.
                        </p>
                      </div>
                      <button
                        onClick={() => handleRunAiAnalysis(selectedRecord)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Forensic Diagnostic Report</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">
                XML Schema {selectedRecord.xml_schema || '1.0'} • OpenSearch Hit ID: {selectedRecord.id}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold cursor-pointer transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
