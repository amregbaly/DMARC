import React, { useState, useEffect } from 'react';
import {
  Radar,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Cloud,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Server,
  Globe,
  HelpCircle,
  ChevronRight,
  X,
  Sparkles,
  Building2,
  Terminal,
  Zap,
  Info
} from 'lucide-react';
import { fetchShadowItAnalysis } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

export default function ShadowItDiscovery({ selectedDomain = 'all', domains = [], currentUser }) {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Filters & Search
  const [scopeDomain, setScopeDomain] = useState(selectedDomain || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'shadow_it', 'authorized', 'rogue'

  // Modal State for Vendor Authorization & DNS Setup
  const [selectedVendorForAuth, setSelectedVendorForAuth] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (selectedDomain) {
      setScopeDomain(selectedDomain);
    }
  }, [selectedDomain]);

  useEffect(() => {
    loadAnalysis();
  }, [scopeDomain]);

  async function loadAnalysis(isManualRefresh = false) {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchShadowItAnalysis({ domain: scopeDomain });
      setData(res);
    } catch (err) {
      console.error('Failed to load Shadow IT analysis:', err);
      setError(err.message || 'Failed to aggregate sender telemetry for Shadow IT discovery.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleCopy(text, key) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  }

  const vendors = data?.vendors || [];
  const summary = data?.summary || {
    totalSources: 0,
    knownSaaSVendors: 0,
    authorizedCount: 0,
    shadowItCount: 0,
    rogueCount: 0,
    totalVolume: 0,
    shadowItVolume: 0,
    atRiskVolume: 0
  };

  // Filter vendors based on active tab and search query
  const filteredVendors = vendors.filter(v => {
    // Classification filter
    if (activeFilter === 'shadow_it' && v.classification !== 'shadow_it') return false;
    if (activeFilter === 'authorized' && v.classification !== 'authorized_saas') return false;
    if (activeFilter === 'rogue' && v.classification !== 'malicious_spoof' && v.classification !== 'unauthorized_relay') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name?.toLowerCase().includes(q);
      const matchCategory = v.category?.toLowerCase().includes(q);
      const matchSpf = v.spfInclude?.toLowerCase().includes(q);
      const matchHosts = (v.hosts || []).some(h => (h.ip && h.ip.includes(q)) || (h.hostname && h.hostname.toLowerCase().includes(q)));
      return matchName || matchCategory || matchSpf || matchHosts;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              {t('shadowIt.title', 'Shadow IT & SaaS Vendor Discovery')}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-mono tracking-wider">
                Phase 2 AI Engine
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            {t(
              'shadowIt.subtitle',
              'Continuously analyzes outbound telemetry to classify SaaS platforms (Google, M365, SendGrid, Salesforce, HubSpot), pinpoint unauthorized marketing/sales tools, and surface rogue spoofing infrastructure.'
            )}
          </p>
        </div>

        {/* Scope Dropdown & Refresh */}
        <div className="flex items-center gap-2">
          <select
            value={scopeDomain}
            onChange={(e) => setScopeDomain(e.target.value)}
            className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            <option value="all">Global Scope (All Domains)</option>
            {domains.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <button
            onClick={() => loadAnalysis(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Refresh sender telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Senders */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('shadowIt.kpiTotalSources', 'Total Senders')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {summary.totalSources}
            </span>
            <span className="text-xs text-slate-400">
              ({(summary.totalVolume || 0).toLocaleString()} {t('shadowIt.msgs', 'msgs')})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.knownSaaSVendors} {t('shadowIt.matchedSaaS', 'identified SaaS applications')}
          </p>
        </div>

        {/* Authorized SaaS */}
        <div className="glass-panel border border-emerald-500/20 bg-emerald-950/10 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {t('shadowIt.kpiAuthorized', 'Authorized SaaS')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-300 tracking-tight">
              {summary.authorizedCount}
            </span>
            <span className="text-xs text-emerald-500 font-medium">
              Passing RFC Alignment
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Legitimate corporate tooling with valid SPF / DKIM
          </p>
        </div>

        {/* Shadow IT Detected */}
        <div className="glass-panel border border-amber-500/30 bg-amber-950/15 rounded-2xl p-4 relative overflow-hidden group hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>{t('shadowIt.kpiShadowIt', 'Shadow IT Detected')}</span>
              {summary.shadowItCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-300 tracking-tight">
              {summary.shadowItCount}
            </span>
            <span className="text-xs text-amber-400 font-semibold">
              Action Required
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {(summary.shadowItVolume || 0).toLocaleString()} msgs at risk of rejection
          </p>
        </div>

        {/* Rogue / Threats */}
        <div className="glass-panel border border-rose-500/20 bg-rose-950/10 rounded-2xl p-4 relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              {t('shadowIt.kpiRogue', 'Rogue Spoofers')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-300 tracking-tight">
              {summary.rogueCount}
            </span>
            <span className="text-xs text-rose-400 font-medium">
              Malicious / Unsanctioned
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Hostile attempts blocked by your DMARC policy
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Senders ({vendors.length})
          </button>

          <button
            onClick={() => setActiveFilter('shadow_it')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeFilter === 'shadow_it'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>Shadow IT ({summary.shadowItCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('authorized')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeFilter === 'authorized'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authorized SaaS ({summary.authorizedCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('rogue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeFilter === 'rogue'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Rogue / Threats ({summary.rogueCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('shadowIt.searchPlaceholder', 'Search vendor, IP, SPF record...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Vendor List / Grid */}
      {loading ? (
        <div className="glass-panel border border-slate-800 rounded-2xl p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-white">{t('shadowIt.analyzing', 'Classifying sending sources & discovering Shadow IT...')}</p>
          <p className="text-xs text-slate-500 mt-1">Cross-referencing reverse DNS, ASNs, and RFC alignment rates</p>
        </div>
      ) : error ? (
        <div className="glass-panel border border-rose-500/30 bg-rose-950/10 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-white">{t('shadowIt.errorTitle', 'Discovery Scan Failed')}</h4>
          <p className="text-xs text-rose-300/80 mt-1 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => loadAnalysis(false)}
            className="mt-4 px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition"
          >
            Retry Scan
          </button>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="glass-panel border border-slate-800 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">{t('shadowIt.noVendors', 'No Senders Found')}</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No senders matched your search query "${searchQuery}".`
              : 'No senders found in this category for the selected domain scope.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredVendors.map((vendor, idx) => {
            const isShadow = vendor.classification === 'shadow_it';
            const isAuth = vendor.classification === 'authorized_saas';
            const isRogue = vendor.classification === 'malicious_spoof';

            return (
              <div
                key={vendor.id + '-' + idx}
                className={`glass-panel border rounded-2xl p-5 transition-all duration-200 relative overflow-hidden ${
                  isShadow
                    ? 'border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900/50 to-slate-900/80 hover:border-amber-500/50'
                    : isAuth
                    ? 'border-slate-800 bg-slate-900/40 hover:border-emerald-500/30'
                    : 'border-rose-500/20 bg-gradient-to-r from-rose-950/15 via-slate-900/50 to-slate-900/80 hover:border-rose-500/30'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Vendor Brand & Category */}
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-lg shrink-0 border"
                      style={{
                        backgroundColor: vendor.badgeColor ? `${vendor.badgeColor}20` : '#334155',
                        borderColor: vendor.badgeColor ? `${vendor.badgeColor}40` : '#475569',
                        color: vendor.badgeColor || '#94A3B8'
                      }}
                    >
                      {vendor.isKnownSaaS ? (
                        <Building2 className="w-6 h-6" />
                      ) : (
                        <Server className="w-6 h-6" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {vendor.name}
                        </h3>

                        {/* Classification Badge */}
                        {isShadow && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Cloud className="w-3 h-3 text-amber-400" />
                            <span>Shadow IT (Needs Auth)</span>
                          </span>
                        )}
                        {isAuth && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Authorized SaaS</span>
                          </span>
                        )}
                        {isRogue && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            <span>Rogue Spoofer</span>
                          </span>
                        )}
                        {!isShadow && !isAuth && !isRogue && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            Unclassified Relay
                          </span>
                        )}

                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400 font-medium">
                          {vendor.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        {vendor.explanation}
                      </p>

                      {/* Detected IP Count and Sample Host */}
                      <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Globe className="w-3.5 h-3.5 text-cyan-500" />
                          <span>{vendor.hosts?.length || 0} Gateway IPs Detected</span>
                        </span>
                        {vendor.hosts?.[0] && (
                          <span>
                            Primary IP: <strong className="text-slate-300">{vendor.hosts[0].ip}</strong> ({vendor.hosts[0].hostname || 'No PTR'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 self-stretch lg:self-center justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    {/* Compliance Progress & Volume */}
                    <div className="w-full sm:w-44 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Alignment Rate</span>
                        <span
                          className={`font-bold ${
                            vendor.complianceRate >= 95
                              ? 'text-emerald-400'
                              : vendor.complianceRate >= 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {vendor.complianceRate}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            vendor.complianceRate >= 95
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : vendor.complianceRate >= 50
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-rose-500 to-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, vendor.complianceRate))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{(vendor.totalVolume || 0).toLocaleString()} messages</span>
                        <span>{(vendor.compliantVolume || 0).toLocaleString()} pass</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      {isShadow ? (
                        <button
                          onClick={() => setSelectedVendorForAuth(vendor)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95"
                        >
                          <Zap className="w-4 h-4 fill-slate-950" />
                          <span>Authorize Vendor</span>
                        </button>
                      ) : isAuth ? (
                        <button
                          onClick={() => setSelectedVendorForAuth(vendor)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>View DNS Setup</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedVendorForAuth(vendor)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium transition cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Host Diagnostics</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1-Click Authorize Vendor & DNS Setup Modal */}
      {selectedVendorForAuth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedVendorForAuth(null)}
        >
          <div
            className="glass-panel border border-slate-800 bg-slate-900/95 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{
                    backgroundColor: selectedVendorForAuth.badgeColor ? `${selectedVendorForAuth.badgeColor}20` : '#334155',
                    color: selectedVendorForAuth.badgeColor || '#94A3B8'
                  }}
                >
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedVendorForAuth.name}
                    <span className="text-xs font-normal text-slate-400">
                      ({selectedVendorForAuth.category})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedVendorForAuth.classification === 'shadow_it'
                      ? 'Authorize this SaaS application to achieve 100% DMARC compliance and prevent email rejections.'
                      : selectedVendorForAuth.classification === 'authorized_saas'
                      ? 'Verified SaaS configuration currently authorized in your DNS.'
                      : 'Security forensics and gateway host addresses for this relay.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVendorForAuth(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Status Alert */}
              {selectedVendorForAuth.classification === 'shadow_it' ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Shadow IT Action Needed:</span> This service transmitted{' '}
                    <strong>{selectedVendorForAuth.totalVolume.toLocaleString()} messages</strong> on behalf of your domain, but only{' '}
                    <strong>{selectedVendorForAuth.complianceRate}%</strong> passed authentication. Publish the DNS records below to authorize it.
                  </div>
                </div>
              ) : selectedVendorForAuth.classification === 'authorized_saas' ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Healthy SaaS Integration:</span> This vendor has achieved{' '}
                    <strong>{selectedVendorForAuth.complianceRate}% alignment</strong> across{' '}
                    <strong>{selectedVendorForAuth.totalVolume.toLocaleString()} messages</strong>.
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Hostile / Unregistered Source:</span> This sender exhibits a failure rate of{' '}
                    <strong>{(100 - selectedVendorForAuth.complianceRate).toFixed(1)}%</strong>. Do NOT authorize unless verified as an internal legacy system.
                  </div>
                </div>
              )}

              {/* Ready-to-Copy SPF TXT Record */}
              {selectedVendorForAuth.spfInclude && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Recommended SPF TXT Mechanism</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">RFC 7208</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300">
                    <code className="select-all overflow-x-auto">{selectedVendorForAuth.spfInclude}</code>
                    <button
                      onClick={() => handleCopy(selectedVendorForAuth.spfInclude, 'spf')}
                      className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-sans transition cursor-pointer"
                    >
                      {copiedKey === 'spf' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Add this mechanism inside your root domain's SPF record before <code className="text-slate-400">~all</code> or <code className="text-slate-400">-all</code>.
                  </p>
                </div>
              )}

              {/* DKIM Guide */}
              {selectedVendorForAuth.dkimGuide && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>DKIM Selector Configuration Guide</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">RFC 6376</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    {selectedVendorForAuth.dkimGuide}
                  </div>
                </div>
              )}

              {/* Detected Gateway IPs Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Observed Transmitting Gateways ({selectedVendorForAuth.hosts?.length || 0})</span>
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60 max-h-40 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2">IP Address</th>
                        <th className="px-3 py-2">Reverse DNS (PTR)</th>
                        <th className="px-3 py-2 text-right">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                      {(selectedVendorForAuth.hosts || []).map((h, i) => (
                        <tr key={h.ip + i} className="hover:bg-slate-800/30">
                          <td className="px-3 py-1.5 text-cyan-400">{h.ip}</td>
                          <td className="px-3 py-1.5 text-slate-400 truncate max-w-[200px]" title={h.hostname}>
                            {h.hostname}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-300">
                            {(h.volume || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedVendorForAuth(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
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
