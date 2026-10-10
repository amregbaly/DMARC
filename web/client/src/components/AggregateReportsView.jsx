import React, { useState, useEffect } from 'react';
import {
  Server,
  Network,
  PieChart,
  Building2,
  Globe2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Sliders,
  FileText,
  Radio,
  Check,
  Download
} from 'lucide-react';
import { fetchAggregateViews } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

export default function AggregateReportsView({
  domains = [],
  selectedDomain,
  currentUser,
  onSwitchToGenerate
}) {
  const { language, t } = useLanguage();
  const [subView, setSubView] = useState('sources'); // 'sources' | 'results' | 'orgs' | 'hosts' | 'threats'
  const [domainFilter, setDomainFilter] = useState(selectedDomain || 'all');
  const [timePreset, setTimePreset] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (selectedDomain) {
      setDomainFilter(selectedDomain);
    }
  }, [selectedDomain]);

  useEffect(() => {
    loadData();
  }, [domainFilter, timePreset]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      let dateFrom = null;
      const now = new Date();
      if (timePreset === '7d') {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        dateFrom = d.toISOString();
      } else if (timePreset === '30d') {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        dateFrom = d.toISOString();
      } else if (timePreset === '90d') {
        const d = new Date();
        d.setDate(now.getDate() - 90);
        dateFrom = d.toISOString();
      }

      const res = await fetchAggregateViews({
        domain: domainFilter,
        date_from: dateFrom
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load aggregate views:', err);
      setError(err.message || 'Failed to fetch aggregate analytics from OpenSearch');
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.summary || {
    totalVolume: 0,
    passedVolume: 0,
    failedVolume: 0,
    compliantVolume: 0,
    nonCompliantVolume: 0,
    forwardedVolume: 0,
    threatVolume: 0,
    complianceRate: 100
  };

  const results = data?.resultsBreakdown || {
    compliant: { count: 0, pct: 0 },
    nonCompliant: { count: 0, pct: 0 },
    forwarded: { count: 0, pct: 0 },
    threats: { count: 0, pct: 0 }
  };

  const sources = data?.sources || [];
  const organizations = data?.organizations || [];
  const hosts = data?.hosts || [];
  const geoThreats = data?.geoThreats || [];

  // Filtered lists based on search input
  const filteredSources = sources.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.sourceName && s.sourceName.toLowerCase().includes(q)) ||
      (s.baseDomain && s.baseDomain.toLowerCase().includes(q)) ||
      (s.asName && s.asName.toLowerCase().includes(q))
    );
  });

  const filteredOrgs = organizations.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.orgName && o.orgName.toLowerCase().includes(q);
  });

  const filteredHosts = hosts.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (h.ip && h.ip.toLowerCase().includes(q)) ||
      (h.ptr && h.ptr.toLowerCase().includes(q)) ||
      (h.country && h.country.toLowerCase().includes(q)) ||
      (h.asName && h.asName.toLowerCase().includes(q))
    );
  });

  const filteredThreats = geoThreats.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return g.country && g.country.toLowerCase().includes(q);
  });

  const subNavItems = [
    { id: 'sources', label: t('reports.viewPerSource', 'Per Sending Source'), icon: Server, count: sources.length },
    { id: 'results', label: t('reports.viewPerResult', 'Per Result'), icon: PieChart },
    { id: 'orgs', label: t('reports.viewPerOrg', 'Per Organization'), icon: Building2, count: organizations.length },
    { id: 'hosts', label: t('reports.viewPerHost', 'Per Host'), icon: Network, count: hosts.length },
    { id: 'threats', label: t('reports.viewDetailedThreats', 'Detailed & Geo Threats'), icon: Globe2, count: geoThreats.length }
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Domain Scope */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">{t('reports.domainLabel', 'Domain')}:</span>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">{t('filters.allDomains', 'All Permitted Domains')}</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Presets */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: 'all', label: 'ALL' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTimePreset(p.id)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  timePreset === p.id
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition cursor-pointer"
            title={t('reports.refreshViews', 'Refresh Analytics')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Action: Jump to Full Report Generation */}
        {onSwitchToGenerate && (
          <button
            onClick={() => onSwitchToGenerate({ domain: domainFilter, preset: timePreset })}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('reports.exportCurrentView', 'Generate Full Report with Current Filters')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        )}
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards (PowerDMARC style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Volume</span>
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {summary.totalVolume ? summary.totalVolume.toLocaleString() : '0'}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Aggregated messages in range</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">DMARC Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {summary.complianceRate}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, summary.complianceRate))}%` }}
            />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Compliant Aligned</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300 mt-1">
            {summary.compliantVolume ? summary.compliantVolume.toLocaleString() : '0'}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Passing SPF and/or DKIM alignment</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Blocked Threats</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">
            {summary.threatVolume ? summary.threatVolume.toLocaleString() : '0'}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Quarantined or rejected spoofing</p>
        </div>
      </div>

      {/* 5-Perspective Subview Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = subView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSubView(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 text-[9px] rounded-full ${
                      isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search input for table views */}
        {subView !== 'results' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors, IPs, domains..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SUB-VIEW 1: PER SENDING SOURCE */}
      {/* ======================================================== */}
      {subView === 'sources' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Sending Sources & Vendor Inventory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Identification of authorized SaaS platforms, ESP mail services, forwarders, and shadow infrastructure.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Showing {filteredSources.length} of {sources.length} sources
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Sending Vendor / Service</th>
                    <th className="py-3 px-4">Source Type</th>
                    <th className="py-3 px-4">Base Domain & ISP</th>
                    <th className="py-3 px-4 text-right">Volume</th>
                    <th className="py-3 px-4 text-center">Compliance</th>
                    <th className="py-3 px-4 text-center">SPF Aligned</th>
                    <th className="py-3 px-4 text-center">DKIM Aligned</th>
                    <th className="py-3 px-4">Dispositions</th>
                    <th className="py-3 px-4 text-right">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredSources.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-500">
                        No sending sources detected matching the current scope.
                      </td>
                    </tr>
                  ) : (
                    filteredSources.map((s, idx) => {
                      const isHighCompliance = s.complianceRate >= 95;
                      const isMidCompliance = s.complianceRate >= 50 && s.complianceRate < 95;
                      const isLowCompliance = s.complianceRate < 50;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            {s.sourceName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                              {s.sourceType || 'SaaS / Mailer'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-slate-200">{s.baseDomain || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500">{s.asName || 'Direct'}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {s.totalVolume.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isHighCompliance
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : isMidCompliance
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}
                              >
                                {s.complianceRate}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[11px]">
                            {s.spfAlignedVolume ? (
                              <span className="text-emerald-400 font-semibold">{s.spfAlignedVolume.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[11px]">
                            {s.dkimAlignedVolume ? (
                              <span className="text-emerald-400 font-semibold">{s.dkimAlignedVolume.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              {s.dispositions.none > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                  none: {s.dispositions.none}
                                </span>
                              )}
                              {s.dispositions.quarantine > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                                  quar: {s.dispositions.quarantine}
                                </span>
                              )}
                              {s.dispositions.reject > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800">
                                  rej: {s.dispositions.reject}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isHighCompliance ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Fully Aligned
                              </span>
                            ) : isMidCompliance ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Add DKIM / SPF
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Block or Investigate
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-VIEW 2: PER RESULT */}
      {/* ======================================================== */}
      {subView === 'results' && (
        <div className="space-y-6">
          {/* Interactive Result Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. DMARC Compliant */}
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/80 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  RFC 7489 PASS
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white mt-3">DMARC Compliant</h4>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {results.compliant.count.toLocaleString()}
              </div>
              <p className="text-xs font-semibold text-emerald-300/80 mt-0.5">
                {results.compliant.pct}% of total traffic
              </p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Legitimate corporate email aligned with either SPF or DKIM identifier. Guaranteed inbox delivery.
              </p>
            </div>

            {/* 2. Non-Compliant */}
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/80 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  FAILED ALIGNMENT
                </span>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-white mt-3">Non-Compliant</h4>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {results.nonCompliant.count.toLocaleString()}
              </div>
              <p className="text-xs font-semibold text-amber-300/80 mt-0.5">
                {results.nonCompliant.pct}% of total traffic
              </p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Messages from known or unknown senders failing domain alignment. Delivered under p=none or flagged.
              </p>
            </div>

            {/* 3. Forwarded / Indirect */}
            <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-slate-900/60 to-slate-900/80 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  INDIRECT RELAYS
                </span>
                <Network className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-sm font-bold text-white mt-3">Forwarded / Indirect</h4>
              <div className="text-2xl font-black text-blue-400 mt-1">
                {results.forwarded.count.toLocaleString()}
              </div>
              <p className="text-xs font-semibold text-blue-300/80 mt-0.5">
                {results.forwarded.pct}% of total traffic
              </p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                SPF failed because of intermediate forwarder IP, but DKIM signature survived intact. Protected.
              </p>
            </div>

            {/* 4. Blocked Threats */}
            <div className="glass-panel p-5 rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/20 via-slate-900/60 to-slate-900/80 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  SPOOFING BLOCKED
                </span>
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <h4 className="text-sm font-bold text-white mt-3">Threats / Blocked</h4>
              <div className="text-2xl font-black text-red-400 mt-1">
                {results.threats.count.toLocaleString()}
              </div>
              <p className="text-xs font-semibold text-red-300/80 mt-0.5">
                {results.threats.pct}% of total traffic
              </p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Fraudulent spoofing attempts quarantined or rejected at mail gateways by receiver enforcement.
              </p>
            </div>
          </div>

          {/* Proportional Distribution Visual Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Aggregate Authentication Result Proportions
            </h3>
            <div className="h-4 rounded-xl overflow-hidden flex bg-slate-950 border border-slate-800">
              <div
                style={{ width: `${results.compliant.pct}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Compliant: ${results.compliant.pct}%`}
              />
              <div
                style={{ width: `${results.nonCompliant.pct}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Non-Compliant: ${results.nonCompliant.pct}%`}
              />
              <div
                style={{ width: `${results.forwarded.pct}%` }}
                className="bg-blue-500 h-full transition-all duration-500"
                title={`Forwarded: ${results.forwarded.pct}%`}
              />
              <div
                style={{ width: `${results.threats.pct}%` }}
                className="bg-red-500 h-full transition-all duration-500"
                title={`Threats Blocked: ${results.threats.pct}%`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Compliant ({results.compliant.pct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Non-Compliant ({results.nonCompliant.pct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Forwarded ({results.forwarded.pct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span>Threats Blocked ({results.threats.pct}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-VIEW 3: PER ORGANIZATION */}
      {/* ======================================================== */}
      {subView === 'orgs' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Receiver Mailbox Organizations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reporting providers (Google, Microsoft 365, Yahoo, Comcast, etc.) evaluating authentication.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {organizations.length} reporting organizations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Reporting Organization</th>
                    <th className="py-3 px-4 text-right">Reported Volume</th>
                    <th className="py-3 px-4 text-right">Passed Messages</th>
                    <th className="py-3 px-4 text-center">Compliance Rate</th>
                    <th className="py-3 px-4 text-center">Unique Sending IPs</th>
                    <th className="py-3 px-4">Applied Dispositions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
                        No organization reports found for current scope.
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-cyan-400" />
                          {org.orgName}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {org.totalVolume.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">
                          {org.passedVolume.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              org.complianceRate >= 95
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : org.complianceRate >= 70
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {org.complianceRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            {org.uniqueIps} IPs
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            {org.dispositions.none > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                none: {org.dispositions.none}
                              </span>
                            )}
                            {org.dispositions.quarantine > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                                quar: {org.dispositions.quarantine}
                              </span>
                            )}
                            {org.dispositions.reject > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800">
                                rej: {org.dispositions.reject}
                              </span>
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
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-VIEW 4: PER HOST */}
      {/* ======================================================== */}
      {subView === 'hosts' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  Sending Host IP Addresses & PTR Records
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Granular server level inspection including reverse DNS, ASN telecom providers, and alignment flags.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {filteredHosts.length} hosts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Sending IP Address</th>
                    <th className="py-3 px-4">Reverse DNS (PTR Hostname)</th>
                    <th className="py-3 px-4">Country & Network (ASN)</th>
                    <th className="py-3 px-4 text-right">Messages</th>
                    <th className="py-3 px-4 text-center">Compliance</th>
                    <th className="py-3 px-4 text-center">SPF Aligned</th>
                    <th className="py-3 px-4 text-center">DKIM Aligned</th>
                    <th className="py-3 px-4 text-right">Receiver Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredHosts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500">
                        No sending hosts match the current search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredHosts.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                          {h.ip}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                          {h.ptr || 'No PTR Record'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-200">{h.country}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">• {h.asName}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {h.totalVolume.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.complianceRate === 100
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : h.complianceRate === 0
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {h.complianceRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {h.spfAligned ? (
                            <span className="text-emerald-400 font-bold">PASS</span>
                          ) : (
                            <span className="text-red-400 font-bold">FAIL</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {h.dkimAligned ? (
                            <span className="text-emerald-400 font-bold">PASS</span>
                          ) : (
                            <span className="text-red-400 font-bold">FAIL</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.disposition === 'reject'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : h.disposition === 'quarantine'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            }`}
                          >
                            p={h.disposition}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-VIEW 5: DETAILED & GEO THREAT MAP */}
      {/* ======================================================== */}
      {subView === 'threats' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-cyan-400" />
                  Geographic Threat Vectors & Origin Distribution
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Correlation of countries originating unauthorized or failed authentication messages.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {geoThreats.length} countries observed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Origin Country</th>
                    <th className="py-3 px-4 text-right">Total Messages</th>
                    <th className="py-3 px-4 text-right">Threat / Spoofed Volume</th>
                    <th className="py-3 px-4">Threat Rate Proportion</th>
                    <th className="py-3 px-4 text-right">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredThreats.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
                        No geographic threat data available for current selection.
                      </td>
                    </tr>
                  ) : (
                    filteredThreats.map((g, idx) => {
                      const isHighRisk = g.threatRate >= 20 && g.threatVolume > 0;
                      const isMidRisk = g.threatRate > 0 && g.threatRate < 20;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-6 py-0.5 text-center rounded bg-slate-800 font-mono text-[10px] text-cyan-300 border border-slate-700">
                              {g.country}
                            </span>
                            <span>{g.country === 'Unknown' ? 'Unresolved Geo' : g.country}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {g.totalVolume.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-red-400">
                            {g.threatVolume.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-full max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden flex">
                              <div
                                style={{ width: `${g.threatRate}%` }}
                                className={`h-full ${isHighRisk ? 'bg-red-500' : isMidRisk ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              {g.threatRate}% spoofed
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isHighRisk ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                High Risk
                              </span>
                            ) : isMidRisk ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Moderate Risk
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Low Risk
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
