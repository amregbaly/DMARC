import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  Server,
  Globe,
  Key,
  FileText,
  Layers,
  Radio,
  Terminal,
  ArrowRight,
  Printer,
  Sparkles
} from 'lucide-react';
import { fetchDomainHealth, fetchFilters } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

// Reusable Copyable Box
function CopyableRecord({ record, label = 'Published Record' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!record) return;
    navigator.clipboard.writeText(record);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!record) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-500 italic">
        No record detected.
      </div>
    );
  }

  return (
    <div className="relative group bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 transition-all hover:border-slate-700">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-cyan-400" />
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-cyan-300 transition-colors bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 rounded-md cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="text-xs font-mono text-cyan-200 whitespace-pre-wrap break-all leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
        {record}
      </pre>
    </div>
  );
}

// Reusable Status Pill
function StatusPill({ status }) {
  switch (status) {
    case 'valid':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Valid
        </span>
      );
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" />
          Warning
        </span>
      );
    case 'requires_selector':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Key className="w-3 h-3" />
          Requires Selector
        </span>
      );
    case 'missing':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" />
          Not Found
        </span>
      );
  }
}

// Severity Pill
function SeverityBadge({ severity }) {
  const colors = {
    Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    High: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Low: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase border ${colors[severity] || colors.Medium}`}>
      {severity}
    </span>
  );
}

// Recursive SPF Lookup Tree Node
function SpfTreeNode({ node, isRoot = false }) {
  const [expanded, setExpanded] = useState(true);

  if (!node) return null;

  return (
    <div className={`space-y-2 text-xs font-mono ${isRoot ? '' : 'pl-5 border-l-2 border-slate-800/80 mt-2'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl hover:border-slate-700 transition">
        <div className="flex items-center gap-2">
          {node.children && node.children.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-200">{node.domain}</span>
          <span className="text-[10px] text-slate-500">
            ({node.directLookups} direct {node.directLookups === 1 ? 'lookup' : 'lookups'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            Total Subtree: {node.totalLookups} {node.totalLookups === 1 ? 'lookup' : 'lookups'}
          </span>
        </div>
      </div>

      {node.record && (
        <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-850 break-all leading-normal">
          {node.record}
        </div>
      )}

      {/* Mechanism pills */}
      {node.mechanisms && node.mechanisms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {node.mechanisms.map((m, idx) => {
            let badgeClass = 'bg-slate-800/60 text-slate-300 border-slate-700';
            if (m.type === 'include') badgeClass = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
            else if (m.type === 'ip4') badgeClass = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
            else if (m.type === 'ip6') badgeClass = 'bg-purple-500/10 text-purple-300 border-purple-500/30';
            else if (m.type === 'all') badgeClass = m.raw.startsWith('-') ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30';

            return (
              <span key={idx} className={`px-2 py-0.5 text-[10px] rounded-md border font-mono ${badgeClass}`}>
                {m.raw}
              </span>
            );
          })}
        </div>
      )}

      {/* Children */}
      {expanded && node.children && node.children.length > 0 && (
        <div className="space-y-2 mt-2">
          {node.children.map((child, idx) => (
            <SpfTreeNode key={idx} node={child} isRoot={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DomainHealth({ selectedDomain = '', onSelectDomain, domains = [], currentUser }) {
  const { t, language } = useLanguage();
  const [internalDomains, setInternalDomains] = useState([]);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Combine prop domains and internal fetched domains from OpenSearch
  const opensearchDomains = (domains && domains.length > 0) ? domains : internalDomains;

  // Role-based domain scoping:
  // If admin: all domains returned from OpenSearch
  // If non-admin: strictly domains assigned in currentUser.domains
  const isAdmin = currentUser?.role === 'admin';
  const userAllowedDomains = Array.isArray(currentUser?.domains) ? currentUser.domains : [];

  const effectiveDomains = isAdmin
    ? opensearchDomains
    : (userAllowedDomains.length > 0
        ? userAllowedDomains
        : opensearchDomains);

  // If domains prop is empty on mount, fetch filters from OpenSearch automatically
  useEffect(() => {
    if (!domains || domains.length === 0) {
      fetchFilters().then(data => {
        if (data?.domains) {
          setInternalDomains(data.domains);
        }
      }).catch(err => {
        console.error('Failed to load domains from OpenSearch:', err);
      });
    }
  }, [domains]);

  const [domainInput, setDomainInput] = useState('');
  const [selectorInput, setSelectorInput] = useState('');
  const [activeDomain, setActiveDomain] = useState('');
  const [activeSelector, setActiveSelector] = useState('');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Accordion open states
  const [openSections, setOpenSections] = useState({
    dmarc: true,
    spf: true,
    dkim: true,
    mta: false,
    bimi: false,
    infra: false
  });

  // Observation severity filter
  const [obsFilter, setObsFilter] = useState('all');

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadData = async (domainToFetch, selectorToFetch) => {
    if (!domainToFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDomainHealth(domainToFetch, selectorToFetch);
      setData(res);
      setActiveDomain(res.domain);
      setActiveSelector(res.selector || selectorToFetch);
      if (res.selector && !selectorInput) {
        setSelectorInput(res.selector);
      }
    } catch (err) {
      console.error('Domain health audit failed:', err);
      setError(err.message || 'Failed to analyze domain DNS records.');
    } finally {
      setLoading(false);
    }
  };

  // Sync active domain when selectedDomain or effectiveDomains changes
  useEffect(() => {
    let target = '';
    if (selectedDomain && selectedDomain !== 'all') {
      if (isAdmin || effectiveDomains.includes(selectedDomain)) {
        target = selectedDomain;
      }
    }
    if (!target && effectiveDomains.length > 0) {
      target = effectiveDomains[0];
    }
    if (!target && opensearchDomains.length > 0) {
      target = opensearchDomains[0];
    }

    if (target && target !== activeDomain) {
      setDomainInput(target);
      setActiveDomain(target);
      loadData(target, selectorInput);
    }
  }, [selectedDomain, effectiveDomains.join(',')]);

  const handleDomainSelect = (dom) => {
    if (dom === '__custom__') {
      setIsCustomMode(true);
      return;
    }
    setIsCustomMode(false);
    setDomainInput(dom);
    setActiveDomain(dom);
    if (onSelectDomain) {
      onSelectDomain(dom);
    }
    loadData(dom, selectorInput.trim());
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!domainInput.trim()) return;
    const clean = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    // RBAC check: non-admins cannot audit domains outside their permissions
    if (!isAdmin && userAllowedDomains.length > 0 && !userAllowedDomains.includes(clean)) {
      setError(`Access denied: You do not have permission to audit domain "${clean}".`);
      return;
    }

    setActiveDomain(clean);
    if (onSelectDomain) {
      onSelectDomain(clean);
    }
    loadData(clean, selectorInput.trim());
  };

  const handleTestSelector = (sel) => {
    setSelectorInput(sel);
    loadData(activeDomain, sel);
  };

  const scrollToAccordion = (sectionId) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: true }));
    setTimeout(() => {
      const el = document.getElementById(`accordion-${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Grade color themes
  const getGradeTheme = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          glow: 'shadow-emerald-500/20',
          progress: 'from-emerald-500 to-teal-400'
        };
      case 'B':
        return {
          text: 'text-cyan-400',
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          glow: 'shadow-cyan-500/20',
          progress: 'from-cyan-500 to-blue-500'
        };
      case 'C':
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          glow: 'shadow-amber-500/20',
          progress: 'from-amber-500 to-orange-400'
        };
      case 'D':
      case 'F':
      default:
        return {
          text: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          glow: 'shadow-rose-500/20',
          progress: 'from-rose-500 to-red-600'
        };
    }
  };

  const theme = data ? getGradeTheme(data.grade) : getGradeTheme('C');

  // Filter observations
  const filteredObservations = data?.observations?.filter(obs => {
    if (obsFilter === 'all') return true;
    return obs.severity.toLowerCase() === obsFilter.toLowerCase();
  }) || [];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Interactive Control & Search Bar */}
      <section className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl shadow-black/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  {t('health.title', 'Domain Health & Security Analyzer')}
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-full font-mono uppercase">
                    Live DNS Audit
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  {t('health.subtitle', 'Real-time RFC compliance, cryptographic policy verification, and recursive SPF lookup tree')}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Domain Badges from OpenSearch */}
          {effectiveDomains.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                {t('health.quickSelect', 'Quick select:')}
              </span>
              {effectiveDomains.slice(0, 5).map(dom => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => handleDomainSelect(dom)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-mono transition cursor-pointer flex items-center gap-1.5 ${
                    activeDomain === dom && !isCustomMode
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeDomain === dom && !isCustomMode ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                  <span>{dom}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Domain Selection Dropdown & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          {/* OpenSearch Monitored Domains Dropdown Menu */}
          <div className="md:col-span-6 relative">
            <Globe className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <select
              id="domain-health-select"
              value={isCustomMode ? '__custom__' : (activeDomain || '')}
              onChange={(e) => handleDomainSelect(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-750 hover:border-slate-600 focus:border-cyan-500 text-sm font-semibold text-slate-100 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono cursor-pointer appearance-none shadow-sm"
            >
              {effectiveDomains.length === 0 ? (
                <option value="" disabled>
                  {t('health.noDomainsFound', 'No allowed domains found in OpenSearch')}
                </option>
              ) : (
                effectiveDomains.map((dom) => (
                  <option key={dom} value={dom} className="bg-slate-900 text-slate-100 font-mono py-1">
                    {dom}
                  </option>
                ))
              )}
              {isAdmin && (
                <option value="__custom__" className="bg-slate-900 text-cyan-400 font-sans font-normal">
                  + {t('health.customDomain', 'Audit Another Custom Domain...')}
                </option>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* DKIM Selector input */}
          <div className="md:col-span-3 relative">
            <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="domain-health-selector-input"
              type="text"
              value={selectorInput}
              onChange={(e) => setSelectorInput(e.target.value)}
              placeholder="DKIM Selector (e.g. mail)"
              className="w-full bg-slate-900/90 border border-slate-750 hover:border-slate-600 focus:border-cyan-500 text-sm text-slate-100 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
            />
          </div>

          {/* Actions */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(activeDomain, selectorInput)}
              disabled={loading || !activeDomain}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 h-[42px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? t('health.auditing', 'Auditing...') : t('health.runAudit', 'Analyze Domain')}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="Print / Save PDF Report"
              className="p-2.5 bg-slate-900 border border-slate-750 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition cursor-pointer h-[42px]"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Domain Input for Admin */}
        {isAdmin && isCustomMode && (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder={t('health.enterDomain', 'Enter domain (e.g. example.com)')}
                className="w-full bg-slate-900/95 border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-500 text-xs text-slate-100 rounded-xl pl-10 pr-4 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domainInput.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              {t('health.runAudit', 'Analyze Domain')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                if (effectiveDomains.length > 0) {
                  handleDomainSelect(effectiveDomains[0]);
                }
              }}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </form>
        )}
      </section>

      {/* Error state */}
      {error && (
        <div className="glass-panel border-rose-500/30 bg-rose-500/10 p-4 rounded-2xl flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData(activeDomain, selectorInput)}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-200 font-medium transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 glass-panel rounded-2xl">
          <RefreshCw className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
          <p className="text-sm font-medium">Resolving DNS TXT, MX, NS, and SPF trees for {domainInput}...</p>
        </div>
      )}

      {data && (
        <>
          {/* 2. Executive Score Hero Banner */}
          <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
            {/* Background glowing ambient light */}
            <div className={`absolute -right-20 -top-20 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none ${theme.bg}`} />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Radial Score Gauge & Grade */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center text-center lg:border-r border-slate-800/80 lg:pr-8">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* SVG circular meter */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="text-slate-850 stroke-current"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="stroke-current transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeDashoffset={(2 * Math.PI * 50) * (1 - (data.score / 100))}
                      strokeLinecap="round"
                      fill="transparent"
                      style={{
                        stroke: data.score >= 80 ? '#10b981' : data.score >= 70 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </svg>

                  {/* Centered Score & Grade */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      {data.score}%
                    </span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
                      {data.rating}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-xl text-sm font-bold border shadow-lg ${theme.bg} ${theme.text} ${theme.border} ${theme.glow}`}>
                    Grade {data.grade}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {data.domain}
                  </span>
                </div>
              </div>

              {/* Narrative Analysis & Protocol Status Chips */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Security Posture Assessment
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Audited: {new Date(data.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
                  {data.summary}
                </p>

                {/* Score Breakdown Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Authentication Score Breakdown</span>
                    <span className="font-bold text-slate-200">{data.score} / 100 pts</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                    <div style={{ width: `${(data.scoreBreakdown.dmarc / 100) * 100}%` }} title={`DMARC: ${data.scoreBreakdown.dmarc} pts`} className="bg-emerald-500 transition-all duration-700" />
                    <div style={{ width: `${(data.scoreBreakdown.spf / 100) * 100}%` }} title={`SPF: ${data.scoreBreakdown.spf} pts`} className="bg-cyan-500 transition-all duration-700" />
                    <div style={{ width: `${(data.scoreBreakdown.dkim / 100) * 100}%` }} title={`DKIM: ${data.scoreBreakdown.dkim} pts`} className="bg-blue-500 transition-all duration-700" />
                    <div style={{ width: `${(data.scoreBreakdown.mx / 100) * 100}%` }} title={`MX: ${data.scoreBreakdown.mx} pts`} className="bg-indigo-500 transition-all duration-700" />
                    <div style={{ width: `${(data.scoreBreakdown.mtaSts / 100) * 100}%` }} title={`MTA-STS: ${data.scoreBreakdown.mtaSts} pts`} className="bg-purple-500 transition-all duration-700" />
                    <div style={{ width: `${(data.scoreBreakdown.tlsRpt / 100) * 100}%` }} title={`TLS-RPT: ${data.scoreBreakdown.tlsRpt} pts`} className="bg-amber-500 transition-all duration-700" />
                    <div style={{ width: `${(data.scoreBreakdown.dnssec / 100) * 100}%` }} title={`DNSSEC: ${data.scoreBreakdown.dnssec} pts`} className="bg-teal-500 transition-all duration-700" />
                  </div>
                </div>

                {/* Protocol Metric Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">DMARC Policy</div>
                    <div className="text-xs font-bold text-white mt-0.5 flex items-center justify-between">
                      <span className="capitalize">{data.protocols.dmarc.policy || 'None'}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{data.scoreBreakdown.dmarc}/35</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">SPF Lookups</div>
                    <div className="text-xs font-bold text-white mt-0.5 flex items-center justify-between">
                      <span>{data.protocols.spf.totalLookups}/10</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{data.scoreBreakdown.spf}/25</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">DKIM Key</div>
                    <div className="text-xs font-bold text-white mt-0.5 flex items-center justify-between">
                      <span>{data.protocols.dkim.keyLength ? `${data.protocols.dkim.keyLength}-bit` : 'Unverified'}</span>
                      <span className="text-[10px] text-blue-400 font-mono">{data.scoreBreakdown.dkim}/15</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">MTA Transport</div>
                    <div className="text-xs font-bold text-white mt-0.5 flex items-center justify-between">
                      <span>{data.protocols.mtaSts.status === 'valid' ? 'Enforced' : 'Opportunistic'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{data.scoreBreakdown.mtaSts}/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Status Overview Grid (4 Pillars) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Protocol Status Overview
              </h2>
              <span className="text-xs text-slate-500">Categorized across 4 core domains</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Outgoing Email */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Outgoing Email</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">4 Checks</span>
                </div>
                <div className="space-y-2.5">
                  {data.overviewGrid.outgoing.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.sub}</div>
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Incoming Email */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Incoming Email</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">3 Checks</span>
                </div>
                <div className="space-y-2.5">
                  {data.overviewGrid.incoming.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.sub}</div>
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* DNS Infrastructure */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">DNS Infrastructure</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Active</span>
                </div>
                <div className="space-y-2.5">
                  {data.overviewGrid.infrastructure.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.sub}</div>
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* DNSSEC */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">DNSSEC Integrity</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Cryptographic</span>
                </div>
                <div className="space-y-2.5">
                  {data.overviewGrid.dnssec.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.sub}</div>
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Security Observations & Threat Impact Table */}
          <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Security Observations & Threat Impact
                  <span className="px-2 py-0.5 text-xs font-bold bg-slate-800 text-slate-300 rounded-full font-mono">
                    {data.observations.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actionable risk remediations prioritized by exploitability and spoofing threat
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
                {['all', 'high', 'medium', 'low'].map(f => (
                  <button
                    key={f}
                    onClick={() => setObsFilter(f)}
                    className={`px-3 py-1 rounded-lg font-medium capitalize transition cursor-pointer ${
                      obsFilter === f ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Observations Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Risk / Vulnerability</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                    <th className="px-4 py-3 font-semibold">Threat Impact</th>
                    <th className="px-4 py-3 font-semibold">Recommended Mitigation</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 bg-slate-950/40">
                  {filteredObservations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500 italic">
                        No observations matching selected severity filter.
                      </td>
                    </tr>
                  ) : (
                    filteredObservations.map(obs => (
                      <tr key={obs.id} className="hover:bg-slate-900/50 transition">
                        <td className="px-4 py-3.5 font-semibold text-slate-200 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{obs.risk}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <SeverityBadge severity={obs.severity} />
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 max-w-xs leading-relaxed">
                          {obs.impact}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 max-w-sm leading-relaxed">
                          {obs.mitigation}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => {
                              if (obs.id.includes('dmarc')) scrollToAccordion('dmarc');
                              else if (obs.id.includes('spf')) scrollToAccordion('spf');
                              else if (obs.id.includes('dkim')) scrollToAccordion('dkim');
                              else if (obs.id.includes('mta') || obs.id.includes('tls')) scrollToAccordion('mta');
                              else scrollToAccordion('infra');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition cursor-pointer"
                          >
                            <span>{obs.action || 'Inspect'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. Interactive Protocol Deep-Dives (Accordions) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Interactive Protocol Deep-Dives
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpenSections({ dmarc: true, spf: true, dkim: true, mta: true, bimi: true, infra: true })}
                  className="text-xs text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  Expand All
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  onClick={() => setOpenSections({ dmarc: false, spf: false, dkim: false, mta: false, bimi: false, infra: false })}
                  className="text-xs text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* A. DMARC Accordion */}
            <div id="accordion-dmarc" className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('dmarc')}
                className="w-full p-5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">DMARC (Domain-based Message Authentication)</span>
                      <StatusPill status={data.protocols.dmarc.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Policy: {data.protocols.dmarc.policy?.toUpperCase() || 'NONE'} &bull; Subdomain: {data.protocols.dmarc.subdomainPolicy?.toUpperCase() || 'NONE'} &bull; pct: {data.protocols.dmarc.pct}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-emerald-400 hidden sm:inline">
                    {data.protocols.dmarc.rua ? 'Aggregate Telemetry Active' : 'No RUA'}
                  </span>
                  {openSections.dmarc ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.dmarc && (
                <div className="p-5 border-t border-slate-800/80 space-y-5 bg-slate-950/40">
                  <CopyableRecord record={data.protocols.dmarc.record} label="Published DMARC TXT Record (_dmarc.<domain>)" />

                  {/* Status Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Policy Enforcement</div>
                      <div className="text-xs font-bold text-emerald-400 capitalize mt-0.5">{data.protocols.dmarc.policy}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Subdomain Policy</div>
                      <div className="text-xs font-bold text-emerald-400 capitalize mt-0.5">{data.protocols.dmarc.subdomainPolicy}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Alignment (DKIM / SPF)</div>
                      <div className="text-xs font-bold text-cyan-400 mt-0.5">
                        {data.protocols.dmarc.adkim === 's' ? 'Strict' : 'Relaxed'} / {data.protocols.dmarc.aspf === 's' ? 'Strict' : 'Relaxed'}
                      </div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Reporting (RUA / RUF)</div>
                      <div className="text-xs font-bold text-white mt-0.5 truncate">
                        {data.protocols.dmarc.rua ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>

                  {/* Configured Tags Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Configured DMARC Tags</h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                          <tr>
                            <th className="px-3.5 py-2 font-semibold">Tag</th>
                            <th className="px-3.5 py-2 font-semibold">Value</th>
                            <th className="px-3.5 py-2 font-semibold">Meaning / Purpose</th>
                            <th className="px-3.5 py-2 font-semibold">RFC Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                          {Object.entries(data.protocols.dmarc.tags || {}).map(([tag, val]) => (
                            <tr key={tag} className="hover:bg-slate-900/30">
                              <td className="px-3.5 py-2 font-bold text-cyan-400">{tag}</td>
                              <td className="px-3.5 py-2 text-white break-all">{val}</td>
                              <td className="px-3.5 py-2 text-slate-400 font-sans">
                                {tag === 'v' && 'DMARC Protocol Version'}
                                {tag === 'p' && 'Domain Receiver Policy (reject, quarantine, none)'}
                                {tag === 'sp' && 'Subdomain Receiver Policy'}
                                {tag === 'pct' && 'Percentage of messages subjected to policy'}
                                {tag === 'rua' && 'Destination URI for aggregate XML feedback reports'}
                                {tag === 'ruf' && 'Destination URI for message failure/forensic reports'}
                                {tag === 'fo' && 'Failure reporting options (0, 1, d, s)'}
                                {tag === 'adkim' && 'DKIM alignment mode (r = relaxed, s = strict)'}
                                {tag === 'aspf' && 'SPF alignment mode (r = relaxed, s = strict)'}
                                {tag === 'rf' && 'Forensic reporting format'}
                                {tag === 'ri' && 'Reporting interval in seconds'}
                              </td>
                              <td className="px-3.5 py-2 text-emerald-400 font-sans font-semibold">Compliant</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* B. SPF Accordion */}
            <div id="accordion-spf" className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('spf')}
                className="w-full p-5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">SPF (Sender Policy Framework & Recursive Lookup Tree)</span>
                      <StatusPill status={data.protocols.spf.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      RFC 7208 Lookup Count: <span className="font-bold text-white">{data.protocols.spf.totalLookups} / 10 lookups</span> &bull; Qualifier: <span className="uppercase text-amber-300 font-semibold">{data.protocols.spf.qualifier}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {data.protocols.spf.totalLookups}/10 Lookups
                    </span>
                  </div>
                  {openSections.spf ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.spf && (
                <div className="p-5 border-t border-slate-800/80 space-y-6 bg-slate-950/40">
                  <CopyableRecord record={data.protocols.spf.record} label="Published SPF TXT Record (Apex)" />

                  {/* Visual DNS Lookup Progress Meter */}
                  <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        RFC 7208 DNS Lookup Capacity Limit (10 Max)
                      </span>
                      <span className="font-mono text-cyan-300 font-semibold">
                        {data.protocols.spf.totalLookups} / 10 lookups used ({Math.round((data.protocols.spf.totalLookups / 10) * 100)}%)
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        style={{ width: `${Math.min(100, (data.protocols.spf.totalLookups / 10) * 100)}%` }}
                        className={`h-full transition-all duration-700 ${
                          data.protocols.spf.totalLookups <= 7
                            ? 'bg-emerald-500'
                            : data.protocols.spf.totalLookups <= 10
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Direct lookups from <code className="text-cyan-300">{data.domain}</code> plus recursively evaluated includes from third-party services.
                    </p>
                  </div>

                  {/* 5-Point Verification Checklist */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">5-Point RFC Verification Checklist</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-white">Syntax & Prefix</div>
                          <div className="text-[11px] text-slate-400">Valid SPF1 declaration at record origin.</div>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-white">Termination Qualifier</div>
                          <div className="text-[11px] text-slate-400">Ends with explicit mechanism ({data.protocols.spf.qualifier}).</div>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-white">Lookup Boundaries</div>
                          <div className="text-[11px] text-slate-400">Evaluates under the 10 DNS lookup limit.</div>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-white">Sender Authorization Scope</div>
                          <div className="text-[11px] text-slate-400">Authorized third parties and IP ranges defined.</div>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-white">Third-Party Resolution</div>
                          <div className="text-[11px] text-slate-400">All nested includes successfully resolve.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recursive Lookup Tree */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Recursive SPF Lookup Tree</span>
                      <span className="text-[11px] text-cyan-400 font-mono normal-case">Tree depth: {data.protocols.spf.tree?.children?.length || 0} branches</span>
                    </h3>
                    <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                      <SpfTreeNode node={data.protocols.spf.tree} isRoot={true} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* C. DKIM Accordion */}
            <div id="accordion-dkim" className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('dkim')}
                className="w-full p-5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">DKIM (DomainKeys Identified Mail & Selector Validator)</span>
                      <StatusPill status={data.protocols.dkim.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Selector: <code className="text-cyan-300 font-mono">{data.protocols.dkim.selector || 'none'}</code> &bull; Key Length: {data.protocols.dkim.keyLength ? `${data.protocols.dkim.keyLength}-bit RSA` : 'Selector required'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-blue-400 hidden sm:inline">
                    {data.protocols.dkim.status === 'valid' ? 'Key Verified' : 'Prompt Selector'}
                  </span>
                  {openSections.dkim ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.dkim && (
                <div className="p-5 border-t border-slate-800/80 space-y-5 bg-slate-950/40">
                  {/* Selector Tester Form */}
                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-cyan-400" />
                      Test Specific DKIM Selector
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        value={selectorInput}
                        onChange={(e) => setSelectorInput(e.target.value)}
                        placeholder="Enter selector (e.g. mail, google, zoho, default)"
                        className="w-full sm:flex-1 bg-slate-950 border border-slate-750 text-xs text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                      />
                      <button
                        onClick={() => handleTestSelector(selectorInput.trim())}
                        className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                      >
                        Test Selector
                      </button>
                    </div>

                    {/* Common Selector Quick Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500">Quick selectors:</span>
                      {['mail', 'google', 'zoho', 'default', 's1', 'k1'].map(sel => (
                        <button
                          key={sel}
                          onClick={() => handleTestSelector(sel)}
                          className="px-2 py-0.5 text-[10px] font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition cursor-pointer"
                        >
                          {sel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {data.protocols.dkim.record ? (
                    <>
                      <CopyableRecord
                        record={data.protocols.dkim.record}
                        label={`Published DKIM TXT Record (${data.protocols.dkim.selector}._domainkey.${data.domain})`}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                          <div className="text-[10px] uppercase text-slate-500 font-bold">Key Algorithm</div>
                          <div className="text-xs font-bold text-white uppercase mt-0.5">{data.protocols.dkim.keyType || 'RSA'}</div>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                          <div className="text-[10px] uppercase text-slate-500 font-bold">Key Modulus Length</div>
                          <div className="text-xs font-bold text-white mt-0.5 flex items-center justify-between">
                            <span>{data.protocols.dkim.keyLength}-bit</span>
                            {data.protocols.dkim.keyLength >= 2048 ? (
                              <span className="text-[10px] text-emerald-400 font-semibold">Strong</span>
                            ) : (
                              <span className="text-[10px] text-amber-400 font-semibold">2048-bit Recommended</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                          <div className="text-[10px] uppercase text-slate-500 font-bold">Selector Record Host</div>
                          <div className="text-xs font-mono text-cyan-300 mt-0.5 truncate">
                            {data.protocols.dkim.selector}._domainkey.{data.domain}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
                      <p>
                        DKIM records are stored on designated subdomains called selectors (e.g. <code className="text-cyan-300">selector._domainkey.{data.domain}</code>).
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Apex TXT records do not publish DKIM public keys by design (RFC 6376). Enter your email service provider selector above to inspect cryptographic key strength.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* D. MTA-STS & TLS-RPT Accordion */}
            <div id="accordion-mta" className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('mta')}
                className="w-full p-5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">MTA-STS & TLS Reporting (Transport Security)</span>
                      <StatusPill status={data.protocols.mtaSts.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      RFC 8461 (MTA-STS Enforced Encryption) &bull; RFC 8460 (SMTP TLS-RPT Delivery Telemetry)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-purple-400 hidden sm:inline">
                    {data.protocols.mtaSts.status === 'valid' ? 'Enforced' : 'Opportunistic TLS'}
                  </span>
                  {openSections.mta ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.mta && (
                <div className="p-5 border-t border-slate-800/80 space-y-5 bg-slate-950/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MTA-STS Box */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-purple-400" />
                          MTA-STS Record (_mta-sts.{data.domain})
                        </span>
                        <StatusPill status={data.protocols.mtaSts.status} />
                      </div>
                      <CopyableRecord record={data.protocols.mtaSts.record} label="TXT Record" />
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        MTA-STS prevents man-in-the-middle attacks by allowing domain owners to declare that incoming SMTP connections must negotiate TLS encryption with valid trusted certificates.
                      </div>
                    </div>

                    {/* TLS-RPT Box */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          TLS-RPT Record (_smtp._tls.{data.domain})
                        </span>
                        <StatusPill status={data.protocols.tlsRpt.status} />
                      </div>
                      <CopyableRecord record={data.protocols.tlsRpt.record} label="TXT Record" />
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        TLS Reporting enables sending MTAs to report deliverability failures, expired TLS certificates, or cipher mismatch issues back to your SOC for rapid incident investigation.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* E. BIMI Accordion */}
            <div id="accordion-bimi" className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('bimi')}
                className="w-full p-5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">BIMI (Brand Indicators for Message Identification)</span>
                      <StatusPill status={data.protocols.bimi.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Visual inbox verification badge & verified trademark SVG logo indicator
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {openSections.bimi ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.bimi && (
                <div className="p-5 border-t border-slate-800/80 space-y-4 bg-slate-950/40">
                  <CopyableRecord record={data.protocols.bimi.record} label="Published BIMI TXT Record (default._bimi.<domain>)" />
                  <div className="text-xs text-slate-400 leading-relaxed">
                    BIMI allows organizations that have deployed DMARC in strict enforcement (<code className="text-cyan-300">p=quarantine</code> or <code className="text-cyan-300">p=reject</code>) to display verified brand logos beside authenticated emails in Google, Apple, and Yahoo inboxes.
                  </div>
                </div>
              )}
            </div>

            {/* F. DNS Infrastructure & DNSSEC Accordion */}
            <div id="accordion-infra" className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('infra')}
                className="w-full p-5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">DNS Infrastructure, MX Mail Routing & DNSSEC</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {data.protocols.mx.records.length} MX Servers
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Nameservers: {data.protocols.ns.records.slice(0, 2).join(', ')} &bull; DNSSEC: {data.protocols.dnssec.active ? 'Active' : 'Unsigned'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {openSections.infra ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.infra && (
                <div className="p-5 border-t border-slate-800/80 space-y-6 bg-slate-950/40">
                  {/* MX Priority Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Mail Exchange (MX) Priority Table</span>
                      <span className="text-[11px] text-cyan-400 font-mono normal-case">Cluster: {data.protocols.mx.records[0]?.host?.split('.')?.slice(-2)?.join('.') || 'Standard'}</span>
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Priority</th>
                            <th className="px-4 py-2 font-semibold">Exchange Host</th>
                            <th className="px-4 py-2 font-semibold">Resolved IPv4</th>
                            <th className="px-4 py-2 font-semibold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 font-mono text-xs">
                          {data.protocols.mx.records.map((mx, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/30">
                              <td className="px-4 py-2.5 font-bold text-amber-400">{mx.priority}</td>
                              <td className="px-4 py-2.5 text-white font-semibold">{mx.host}</td>
                              <td className="px-4 py-2.5 text-cyan-300">
                                {mx.ips && mx.ips.length > 0 ? mx.ips.join(', ') : 'Resolving...'}
                              </td>
                              <td className="px-4 py-2.5 text-right font-sans font-semibold text-emerald-400">
                                Operational
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Nameservers and A/AAAA Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-indigo-400" />
                        Authoritative Nameservers (NS)
                      </div>
                      <div className="space-y-1 font-mono text-xs text-slate-300">
                        {data.protocols.ns.records.map((ns, idx) => (
                          <div key={idx} className="bg-slate-950/60 p-2 rounded border border-slate-850">
                            {ns}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        Edge IP Addresses (A & AAAA)
                      </div>
                      <div className="space-y-1 font-mono text-xs text-slate-300">
                        {data.protocols.ips.a.map((ip, idx) => (
                          <div key={idx} className="bg-slate-950/60 p-1.5 rounded border border-slate-850 flex items-center justify-between">
                            <span>{ip}</span>
                            <span className="text-[10px] text-cyan-400">IPv4</span>
                          </div>
                        ))}
                        {data.protocols.ips.aaaa.map((ip, idx) => (
                          <div key={idx} className="bg-slate-950/60 p-1.5 rounded border border-slate-850 flex items-center justify-between">
                            <span className="truncate max-w-[200px]">{ip}</span>
                            <span className="text-[10px] text-purple-400">IPv6</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
