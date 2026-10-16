import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Info,
  Zap,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Sliders,
  Globe,
  Server,
  Terminal,
  Lock,
  Play,
  ChevronDown,
  ChevronRight,
  Activity,
  Radar,
  Building2,
  Flame,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  simulatePolicyImpact,
  fetchPredictiveAnomalies,
  analyzeSpfBimi
} from '../services/api';

export default function PolicyReadiness({ policies = [], selectedDomain = 'all', domains = [] }) {
  const { t, language } = useLanguage();
  const isEs = language === 'es';

  // Domain Scope & Target Policy Selection
  const [scopeDomain, setScopeDomain] = useState(selectedDomain || 'all');
  const [targetPolicy, setTargetPolicy] = useState('reject'); // 'quarantine', 'reject'
  const [targetPct, setTargetPct] = useState(100); // 25, 50, 100

  // Simulator State
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [simError, setSimError] = useState(null);

  // Predictive Anomalies State
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);
  const [anomaliesData, setAnomaliesData] = useState(null);

  // SPF & BIMI Optimizer State
  const [spfBimiOpen, setSpfBimiOpen] = useState(false);
  const [optimizerData, setOptimizerData] = useState(null);
  const [optimizerLoading, setOptimizerLoading] = useState(false);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (selectedDomain) {
      setScopeDomain(selectedDomain);
    }
  }, [selectedDomain]);

  useEffect(() => {
    runSimulator();
    loadAnomalies();
  }, [scopeDomain, targetPolicy, targetPct]);

  async function runSimulator() {
    setSimulationLoading(true);
    setSimError(null);
    try {
      const res = await simulatePolicyImpact({
        domain: scopeDomain,
        targetPolicy,
        targetPct
      });
      setSimulationData(res?.simulation || null);
    } catch (err) {
      console.error('Policy simulator error:', err);
      setSimError(err.message || 'Failed to simulate policy enforcement.');
    } finally {
      setSimulationLoading(false);
    }
  }

  async function loadAnomalies() {
    setAnomaliesLoading(true);
    try {
      const res = await fetchPredictiveAnomalies({ domain: scopeDomain });
      setAnomaliesData(res?.anomalies || []);
    } catch (err) {
      console.warn('Predictive anomalies fetch error:', err);
    } finally {
      setAnomaliesLoading(false);
    }
  }

  async function loadSpfBimi() {
    setOptimizerLoading(true);
    try {
      const activeDomain = scopeDomain !== 'all' ? scopeDomain : (domains[0] || 'voxera.net');
      const res = await analyzeSpfBimi({ domain: activeDomain });
      setOptimizerData(res);
      setSpfBimiOpen(true);
    } catch (err) {
      console.error('SPF/BIMI optimizer error:', err);
    } finally {
      setOptimizerLoading(false);
    }
  }

  function handleCopy(text, key) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function formatReadiness(val) {
    if (val === 'Ready') return isEs ? 'Listo' : 'Ready';
    if (val === 'In Review') return isEs ? 'En Revisión' : 'In Review';
    return isEs ? 'No Preparado' : val;
  }

  return (
    <div className="space-y-8">
      {/* Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              {t('policies.title', 'DMARC Policy & Enforcement Readiness')}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-mono tracking-wider">
                Phase 3 Deep Security
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            {t(
              'policies.subtitle',
              'Audit published DNS records, simulate the security and delivery impact before transitioning to full rejection (`p=reject`), and evaluate predictive configuration drift.'
            )}
          </p>
        </div>

        {/* Scope Dropdown, Optimizer Button & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={loadSpfBimi}
            disabled={optimizerLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm shadow-cyan-950/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>SPF & BIMI Optimizer</span>
          </button>

          <button
            onClick={() => { runSimulator(); loadAnomalies(); }}
            disabled={simulationLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Re-run policy impact simulation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${simulationLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Simulate')}</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. AI Policy Enforcement Advisor ("What-If" Impact Simulator) */}
      {/* ========================================================= */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  AI Policy Enforcement Advisor & "What-If" Simulator
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 uppercase">
                  Live Model
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulates real delivery consequences across recipient gateways before modifying public DNS records.
              </p>
            </div>
          </div>

          {/* Interactive Policy Target Selector */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-xl self-start lg:self-center">
            <span className="text-[11px] font-semibold text-slate-400 pl-2 pr-1">Target Policy:</span>
            
            <button
              onClick={() => { setTargetPolicy('quarantine'); setTargetPct(25); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                targetPolicy === 'quarantine' && targetPct === 25
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              p=quarantine (pct=25)
            </button>

            <button
              onClick={() => { setTargetPolicy('quarantine'); setTargetPct(100); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                targetPolicy === 'quarantine' && targetPct === 100
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              p=quarantine (pct=100)
            </button>

            <button
              onClick={() => { setTargetPolicy('reject'); setTargetPct(100); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                targetPolicy === 'reject' && targetPct === 100
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              p=reject (pct=100)
            </button>
          </div>
        </div>

        {/* Simulator Results */}
        {simulationLoading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-white">Evaluating RFC alignment impact against live telemetry...</p>
            <p className="text-xs text-slate-500 mt-1">Cross-referencing sender profiles, DKIM signatures, and SPF mechanisms</p>
          </div>
        ) : simError ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 text-center">
            {simError}
          </div>
        ) : simulationData ? (
          <div className="space-y-6">
            {/* Top Row: Readiness Score Gauge & 3 Impact KPI Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Readiness Confidence Meter */}
              <div className="glass-panel border border-slate-800 bg-slate-950/60 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider">
                      Readiness Score
                    </span>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      {simulationData.readinessScore}
                    </span>
                    <span className="text-base text-slate-500 font-bold">/ 100</span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${
                        simulationData.readinessScore >= 90
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : simulationData.readinessScore >= 75
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-rose-500 to-red-500'
                      }`}
                      style={{ width: `${simulationData.readinessScore}%` }}
                    />
                  </div>

                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      simulationData.readinessBadgeColor === 'emerald'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : simulationData.readinessBadgeColor === 'amber'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {simulationData.readinessLabel}
                  </span>
                </div>
              </div>

              {/* KPI 1: Safe Protected Volume */}
              <div className="glass-panel border border-emerald-500/20 bg-emerald-950/10 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Safe Deliveries
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white tracking-tight">
                    {(simulationData.safeVolume || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    ({simulationData.safePercentage}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Corporate email guaranteed to land safely in inboxes without disruption.
                </p>
              </div>

              {/* KPI 2: At-Risk Legitimate Traffic */}
              <div className={`glass-panel rounded-2xl p-5 border ${
                simulationData.atRiskLegitimateVolume > 0
                  ? 'border-amber-500/30 bg-amber-950/15'
                  : 'border-slate-800 bg-slate-900/40'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    At-Risk Legitimate Mail
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-300 tracking-tight">
                    {(simulationData.atRiskLegitimateVolume || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    ({simulationData.atRiskVendors?.length || 0} tools)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {simulationData.atRiskLegitimateVolume > 0
                    ? `Legitimate business messages that will be ${targetPolicy === 'reject' ? 'rejected' : 'quarantined'} due to unaligned SPF/DKIM.`
                    : 'Zero legitimate business tools will be disrupted by this transition.'}
                </p>
              </div>

              {/* KPI 3: Neutralized Malicious Traffic */}
              <div className="glass-panel border border-rose-500/20 bg-rose-950/10 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    Neutralized Threats
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-rose-300 tracking-tight">
                    {(simulationData.projectedNeutralizedSpoofs || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-rose-400 font-medium">
                    Spoofs Blocked
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Hostile phishing and brand impersonation attempts neutralized at boundary.
                </p>
              </div>
            </div>

            {/* AI CISO Executive Assessment Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-xs text-slate-300 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white uppercase font-mono tracking-wider text-[11px]">
                    Executive CISO Impact Assessment
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">• Automated Simulation</span>
                </div>
                <p className="leading-relaxed text-slate-300">
                  {simulationData.executiveAssessment}
                </p>
              </div>
            </div>

            {/* At-Risk Senders Warning Table (if any legitimate vendor would fail) */}
            {simulationData.atRiskVendors && simulationData.atRiskVendors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Identified Legitimate Senders Requiring DNS Authorization ({simulationData.atRiskVendors.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Fix before advancing to p=reject to prevent business bounce complaints
                  </span>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-amber-950/30 text-slate-400 border-b border-amber-500/20 text-[11px]">
                      <tr>
                        <th className="px-4 py-2.5">SaaS Business Tool</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5 text-right">Total Volume</th>
                        <th className="px-4 py-2.5 text-right">At-Risk Disruption</th>
                        <th className="px-4 py-2.5">Compliance</th>
                        <th className="px-4 py-2.5">Required DNS Remediation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-500/15 font-mono text-[11px]">
                      {simulationData.atRiskVendors.map((v, i) => (
                        <tr key={v.id + i} className="hover:bg-amber-950/20">
                          <td className="px-4 py-2 text-white font-sans font-bold flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>{v.name}</span>
                          </td>
                          <td className="px-4 py-2 text-slate-400 font-sans">{v.category}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{(v.totalVolume || 0).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-amber-400 font-bold">{(v.atRiskVolume || 0).toLocaleString()}</td>
                          <td className="px-4 py-2 font-bold text-amber-400">{v.complianceRate}%</td>
                          <td className="px-4 py-2 text-cyan-300 font-sans text-xs">{v.recommendedFix}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Target DMARC Record & Staged Implementation Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Ready-to-Publish Target DMARC TXT Record */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Target DMARC DNS Record</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">_dmarc.{scopeDomain !== 'all' ? scopeDomain : 'yourdomain.com'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center justify-between gap-3">
                  <code className="select-all overflow-x-auto leading-relaxed">{simulationData.targetDmarcRecord}</code>
                  <button
                    onClick={() => handleCopy(simulationData.targetDmarcRecord, 'target_dmarc')}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-sans transition cursor-pointer"
                  >
                    {copiedKey === 'target_dmarc' ? (
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
                  Publish this TXT record at host <code className="text-slate-400">_dmarc.{scopeDomain !== 'all' ? scopeDomain : 'yourdomain.com'}</code> in your authoritative DNS zone.
                </p>
              </div>

              {/* 5-Step Staged Implementation Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safe Transition Roadmap Checklist</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">Zero-Disruption Path</span>
                </div>

                <div className="space-y-1.5">
                  {(simulationData.stagedChecklist || []).map((step) => {
                    const isDone = step.status === 'completed';
                    const isCurrent = step.status === 'in_progress';
                    return (
                      <div
                        key={step.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                          isDone
                            ? 'bg-emerald-950/10 border-emerald-500/20 text-slate-300'
                            : isCurrent
                            ? 'bg-cyan-950/20 border-cyan-500/40 text-white'
                            : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isCurrent ? (
                            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-500">
                              {step.step}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200">{step.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{step.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ========================================================= */}
      {/* 2. Predictive Anomaly Detection Radar                     */}
      {/* ========================================================= */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Radar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Predictive Anomaly Detection Radar
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 uppercase font-mono">
                  Time-Series ML
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Surfaces subtle configuration drift, legitimate vendor dropouts, and stealth spoofing campaigns.
              </p>
            </div>
          </div>

          <button
            onClick={loadAnomalies}
            disabled={anomaliesLoading}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            title="Refresh predictive anomalies"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${anomaliesLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>

        {anomaliesLoading ? (
          <div className="py-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            <p className="text-xs">Evaluating statistical deviations across 30-day telemetry baseline...</p>
          </div>
        ) : !anomaliesData || anomaliesData.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
            No active anomalies detected across active domain traffic.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomaliesData.map((anom) => {
              const isCrit = anom.severity === 'critical';
              const isHigh = anom.severity === 'high';
              const isMed = anom.severity === 'medium';

              return (
                <div
                  key={anom.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCrit
                      ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                      : isHigh
                      ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                      : isMed
                      ? 'bg-purple-950/15 border-purple-500/30 hover:border-purple-500/50'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCrit
                            ? 'bg-rose-400 animate-ping'
                            : isHigh
                            ? 'bg-amber-400'
                            : isMed
                            ? 'bg-purple-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <h4 className="text-xs font-bold text-white tracking-tight">{anom.title}</h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isCrit
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isMed
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {anom.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {anom.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400 font-mono">
                      Deviation: <strong className="text-slate-200">{anom.deviationMetric}</strong>
                    </span>
                    <span className="text-cyan-400 font-sans font-medium text-right">
                      {anom.recommendedAction}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. Existing Domain DMARC Policies & Alignment Table       */}
      {/* ========================================================= */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            {isEs ? 'Políticas DMARC y Modos de Alineación' : 'Domain DMARC Policies & Alignment Modes'}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {isEs ? 'Registros DNS Evaluados' : 'DNS Records Evaluated'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-sans font-medium">
              <tr>
                <th className="px-6 py-3">{isEs ? 'Dominio' : 'Domain'}</th>
                <th className="px-6 py-3">{isEs ? 'Política (p=)' : 'Policy (p=)'}</th>
                <th className="px-6 py-3">{isEs ? 'Subdominio (sp=)' : 'Subdomain (sp=)'}</th>
                <th className="px-6 py-3">{isEs ? 'Aplicación (pct=)' : 'Enforcement (pct=)'}</th>
                <th className="px-6 py-3">{isEs ? 'Alineación (adkim/aspf)' : 'Alignment (adkim/aspf)'}</th>
                <th className="px-6 py-3 text-right">{isEs ? 'Total Mensajes' : 'Total Msgs'}</th>
                <th className="px-6 py-3">{isEs ? 'Tasa de Aprobación' : 'Pass Rate'}</th>
                <th className="px-6 py-3 font-sans">{isEs ? 'Preparación' : 'Readiness'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {policies.map((pol, idx) => {
                const isReady = pol.enforcementReadiness === 'Ready';
                const isInReview = pol.enforcementReadiness === 'In Review';
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white font-sans text-sm">
                      {pol.domain}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                          pol.policy === 'reject'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : pol.policy === 'quarantine'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            : 'bg-slate-800 border border-slate-700 text-slate-300'
                        }`}
                      >
                        {pol.policy}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {pol.subdomainPolicy}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {pol.percentage}%
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      DKIM: <span className="text-cyan-400 font-semibold">{pol.adkim}</span> / SPF: <span className="text-cyan-400 font-semibold">{pol.aspf}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {pol.totalMessages.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            pol.passRate >= 95
                              ? 'text-emerald-400'
                              : pol.passRate >= 80
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {pol.passRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-sans">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isReady
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : isInReview
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {formatReadiness(pol.enforcementReadiness)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phased Rollout Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-5 border-l-4 border-slate-600">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h4 className="font-semibold text-slate-200 text-sm">
              p=none ({isEs ? 'Monitoreo' : 'Monitoring'})
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEs
              ? 'Supervise informes agregados DMARC sin afectar la entrega. Identifique todos los proveedores de correo legítimos.'
              : 'Monitor incoming DMARC aggregate reports without affecting deliverability. Discover all legitimate sending services (e.g. Salesforce, SendGrid, Google Workspace).'}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <h4 className="font-semibold text-amber-300 text-sm">
              p=quarantine ({isEs ? 'Carpeta de Spam' : 'Spam Folder'})
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEs
              ? 'Los correos no autenticados se entregan en la carpeta de correo no deseado. Comience con pct=25 y aumente progresivamente hasta pct=100.'
              : 'Unauthenticated messages are delivered to the recipient\'s spam folder. Begin with `pct=25` and gradually ramp up to `pct=100` once legitimate senders are aligned.'}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <h4 className="font-semibold text-emerald-300 text-sm">
              p=reject ({isEs ? 'Protección Total' : 'Full Protection'})
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEs
              ? 'Los servidores de correo rechazan de plano cualquier correo no autorizado en el límite SMTP. Defensa total contra suplantación y phishing.'
              : 'Receiving servers completely reject unauthorized emails at the SMTP boundary. Total defense against brand impersonation and spoofing phishing attacks.'}
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. SPF & BIMI Smart Optimizer Modal                       */}
      {/* ========================================================= */}
      {spfBimiOpen && optimizerData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSpfBimiOpen(false)}
        >
          <div
            className="glass-panel border border-slate-800 bg-slate-900/95 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    SPF & BIMI Smart Optimizer
                    <span className="text-xs text-slate-400 font-mono">({optimizerData.domain})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluates RFC 7208 10-lookup limits and formats RFC 8953 BIMI records for brand inbox avatars.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSpfBimiOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SPF 10-Lookup Budget Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>RFC 7208 DNS Lookup Budget</span>
                </span>
                <span className={`font-mono font-bold ${
                  optimizerData.spfOptimizer.lookupCount > 10
                    ? 'text-rose-400'
                    : optimizerData.spfOptimizer.lookupCount >= 8
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}>
                  {optimizerData.spfOptimizer.lookupCount} / 10 Lookups Used
                </span>
              </div>

              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    optimizerData.spfOptimizer.lookupCount > 10
                      ? 'bg-rose-500'
                      : optimizerData.spfOptimizer.lookupCount >= 8
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (optimizerData.spfOptimizer.lookupCount / 10) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {optimizerData.spfOptimizer.recommendation}
              </p>

              {/* Current SPF Record */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center justify-between">
                <code className="select-all overflow-x-auto">{optimizerData.spfOptimizer.currentSpf}</code>
                <button
                  onClick={() => handleCopy(optimizerData.spfOptimizer.currentSpf, 'spf_opt')}
                  className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-sans transition cursor-pointer"
                >
                  {copiedKey === 'spf_opt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'spf_opt' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* BIMI Record Generator */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>RFC 8953 BIMI Brand Indicator Record</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">{optimizerData.bimiOptimizer.selector}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 flex items-center justify-between">
                <code className="select-all overflow-x-auto">{optimizerData.bimiOptimizer.bimiRecord}</code>
                <button
                  onClick={() => handleCopy(optimizerData.bimiOptimizer.bimiRecord, 'bimi_opt')}
                  className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-sans transition cursor-pointer"
                >
                  {copiedKey === 'bimi_opt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'bimi_opt' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                {optimizerData.bimiOptimizer.instructions}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSpfBimiOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
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
