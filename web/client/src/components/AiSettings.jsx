import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Key,
  Cpu,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Zap,
  ShieldCheck,
  Server,
  Globe,
  ExternalLink,
  Info
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { fetchAiSettings, saveAiSettings, testAiSettings } from '../services/api';

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google Gemini',
    badge: 'Recommended • Fast',
    description: 'High throughput, fast latency, and extensive context length for aggregate analytics.',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    docUrl: 'https://aistudio.google.com/app/apikey',
    color: 'from-blue-500/20 to-cyan-500/10 border-cyan-500/30 text-cyan-400'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'Industry Standard',
    description: 'Structured JSON schemas and deterministic reasoning (GPT-4o & GPT-4o-mini).',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    docUrl: 'https://platform.openai.com/api-keys',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    badge: 'Forensic Precision',
    description: 'Deep technical reasoning, nuanced RFC 7489 policy analysis, and strict adherence.',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    docUrl: 'https://console.anthropic.com/settings/keys',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Unified Multi-Model Gateway',
    description: 'Route across 200+ models (Claude, Llama 3, DeepSeek, Gemini, Mistral) with a single API key.',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: ['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-8b-instruct', 'google/gemini-flash-1.5'],
    docUrl: 'https://openrouter.ai/keys',
    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400'
  },
  {
    id: 'custom',
    name: 'Self-Hosted / Custom',
    badge: 'Air-Gapped & Local',
    description: 'Connect to on-premise Ollama, vLLM, or enterprise OpenAI-compatible proxy.',
    defaultModel: 'llama3.1:8b',
    models: ['llama3.1:8b', 'mistral-nemo', 'custom'],
    docUrl: 'https://ollama.ai',
    color: 'from-slate-500/20 to-slate-700/10 border-slate-500/30 text-slate-300'
  }
];

export default function AiSettings({ currentUser }) {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState('google');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [providersData, setProvidersData] = useState({});

  // Features
  const [featureLogRca, setFeatureLogRca] = useState(true);
  const [featureExecutiveSummary, setFeatureExecutiveSummary] = useState(true);
  const [featureCopilot, setFeatureCopilot] = useState(true);

  // Test / Save Feedback
  const [statusMessage, setStatusMessage] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await fetchAiSettings();
      setEnabled(Boolean(data.enabled));
      setProvider(data.provider || 'google');
      setModel(data.model || 'gemini-1.5-flash');
      setApiKey(data.apiKey || '');
      setHasApiKey(Boolean(data.hasApiKey));
      setBaseUrl(data.baseUrl || '');
      setTemperature(typeof data.temperature === 'number' ? data.temperature : 0.2);
      setMaxTokens(data.maxTokens || 2048);
      setProvidersData(data.providers || {});
      setFeatureLogRca(data.featureLogRca !== false);
      setFeatureExecutiveSummary(data.featureExecutiveSummary !== false);
      setFeatureCopilot(data.featureCopilot !== false);
    } catch (err) {
      console.error('Failed to load AI settings:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load AI settings.' });
    } finally {
      setLoading(false);
    }
  }

  function handleProviderSelect(pId) {
    setProvider(pId);
    const p = PROVIDERS.find(x => x.id === pId);
    const savedForProvider = providersData[pId];
    if (savedForProvider?.hasKey) {
      setHasApiKey(true);
      setApiKey(savedForProvider.apiKey || '');
      setModel(savedForProvider.model || p?.defaultModel || '');
      setBaseUrl(savedForProvider.baseUrl || (pId === 'custom' ? 'http://localhost:11434/v1' : ''));
    } else {
      setHasApiKey(false);
      setApiKey('');
      if (p) setModel(p.defaultModel);
      setBaseUrl(pId === 'custom' ? 'http://localhost:11434/v1' : '');
    }
    setTestResult(null);
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const payload = {
        enabled,
        provider,
        model,
        apiKey,
        baseUrl,
        temperature,
        maxTokens,
        featureLogRca,
        featureExecutiveSummary,
        featureCopilot
      };
      const res = await saveAiSettings(payload);
      const updated = await fetchAiSettings();
      setProvidersData(updated.providers || {});
      setHasApiKey(Boolean(updated.providers?.[provider]?.hasKey || updated.hasApiKey));
      setStatusMessage({ type: 'success', text: t('ai.saveSuccess', 'AI configuration saved and encrypted successfully!') });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save AI configuration.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    setStatusMessage(null);
    try {
      const payload = {
        provider,
        model,
        apiKey,
        baseUrl
      };
      const res = await testAiSettings(payload);
      setTestResult({
        success: true,
        message: res.message,
        latencyMs: res.latencyMs,
        model: res.model,
        provider: res.provider
      });
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message || 'Connection test probe failed.'
      });
    } finally {
      setTesting(false);
    }
  }

  const activeProviderObj = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm">Loading AI Control Panel &amp; Security Keys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/90 shadow-2xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>{t('ai.title', 'AI Intelligence Control Panel')}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                    Enterprise
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {t('ai.subtitle', 'Configure multi-provider LLMs (Google Gemini, OpenAI, Claude, OpenRouter) for automated RCA, executive narratives, and smart triage.')}
                </p>
              </div>
            </div>
          </div>

          {/* Master Enable / Disable Toggle Switch */}
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl shrink-0 shadow-lg">
            <span className="text-xs font-bold text-slate-300">
              {enabled ? t('ai.statusEnabled', 'AI Active') : t('ai.statusDisabled', 'AI Disabled')}
            </span>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs transition animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold transition ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Step 1: Provider Selection */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>1. {t('ai.selectProvider', 'Select LLM Provider')}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('ai.selectProviderDesc', 'Choose which foundation model infrastructure powers your DMARC intelligence.')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {PROVIDERS.map((p) => {
              const isSelected = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderSelect(p.id)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-cyan-400/90 font-medium mb-1.5">{p.badge}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{p.description}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-mono truncate max-w-[90px]">{p.defaultModel}</span>
                    {providersData[p.id]?.hasKey || (p.id === 'custom' && baseUrl) ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Ready
                      </span>
                    ) : (
                      <span className="text-slate-500">Unset</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Credentials & Model Configuration */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>2. {t('ai.credentialsTitle', 'API Key & Model Selection')}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('ai.credentialsDesc', 'Your API key is securely encrypted at rest using AES-256-GCM and never logged.')}
              </p>
            </div>
            {activeProviderObj.docUrl && (
              <a
                href={activeProviderObj.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
              >
                <span>{t('ai.getKeyLink', 'Get API Key')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Key Input */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                <span>{t('ai.apiKeyLabel', 'API Key / Secret Token')}</span>
                {hasApiKey && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-normal">
                    <ShieldCheck className="w-3 h-3" /> Key encrypted at rest
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? '•••••••• (Stored securely. Enter new key to replace)' : 'sk-... or AIza...'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  title={showApiKey ? 'Hide key' : 'Show key'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                {t('ai.apiKeyHelp', 'Never leaves your server except for direct TLS requests to the chosen AI provider.')}
              </p>
            </div>

            {/* Model Name Input & Quick Select Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                {t('ai.modelLabel', 'Model Identifier')}
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gemini-1.5-flash or gpt-4o-mini"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
              />
              {/* Quick Model Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-slate-500 self-center mr-1">Recommended:</span>
                {activeProviderObj.models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      model === m
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Base URL (Useful for OpenRouter custom gateways or Local Ollama/vLLM) */}
          {(provider === 'custom' || provider === 'openrouter' || baseUrl) && (
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('ai.baseUrlLabel', 'Custom Base URL / Endpoint (Optional)')}</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={provider === 'custom' ? 'http://localhost:11434/v1' : 'https://openrouter.ai/api/v1'}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {t('ai.baseUrlHelp', 'Leave empty to use the provider standard official cloud endpoint.')}
              </p>
            </div>
          )}

          {/* Advanced Parameters: Temperature & Max Tokens */}
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200">
                  {t('ai.tempLabel', 'Inference Temperature')}: <span className="text-cyan-400 font-mono">{temperature}</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  {temperature <= 0.2 ? 'Deterministic / Forensics' : 'Balanced'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                {t('ai.maxTokensLabel', 'Max Output Tokens')}
              </label>
              <input
                type="number"
                min="256"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 2048)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Feature Enablement Toggles */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>3. {t('ai.featuresTitle', 'Active AI Feature Toggles')}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {t('ai.featuresDesc', 'Control which modules throughout DMARC Sentinel expose AI-assisted capabilities.')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Feature 1: Log Explorer RCA */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">1-Click Forensic RCA</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Adds an "Analyze with AI" button in the Raw Log Explorer modal for instant RFC failure explanations and DNS remediation commands.
                </p>
              </div>
              <input
                type="checkbox"
                checked={featureLogRca}
                onChange={(e) => setFeatureLogRca(e.target.checked)}
                className="h-4 w-4 mt-1 accent-cyan-400 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Feature 2: Executive Report Summaries */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Executive AI Narratives</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Generates professional CISO security assessment briefings embedded in PDF, Excel, and automated email reports.
                </p>
              </div>
              <input
                type="checkbox"
                checked={featureExecutiveSummary}
                onChange={(e) => setFeatureExecutiveSummary(e.target.checked)}
                className="h-4 w-4 mt-1 accent-cyan-400 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Feature 3: Copilot Telemetry Assistant */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Telemetry Copilot</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Enables conversational natural-language querying across your OpenSearch aggregate indices.
                </p>
              </div>
              <input
                type="checkbox"
                checked={featureCopilot}
                onChange={(e) => setFeatureCopilot(e.target.checked)}
                className="h-4 w-4 mt-1 accent-cyan-400 rounded cursor-pointer shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Live Test Probe Output Card */}
        {testResult && (
          <div
            className={`p-5 rounded-2xl border transition animate-fadeIn ${
              testResult.success
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {testResult.success ? 'Probe Succeeded' : 'Probe Failed'}
                  </span>
                  {testResult.latencyMs && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Latency: <strong className="text-white">{testResult.latencyMs} ms</strong>
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/5 break-all">
                  {testResult.success ? testResult.message : testResult.error}
                </p>
                {testResult.model && (
                  <div className="text-[10px] text-slate-400">
                    Verified model response: <span className="font-bold text-white">{testResult.model}</span> via{' '}
                    <span className="uppercase text-cyan-300 font-bold">{testResult.provider}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {hasApiKey ? 'API Key is active and encrypted.' : 'Enter an API Key to activate AI features.'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Test Connection Button */}
            <button
              type="button"
              disabled={testing || (!apiKey && !hasApiKey && provider !== 'custom')}
              onClick={handleTestConnection}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>{t('ai.testingBtn', 'Testing Probe...')}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('ai.testBtn', 'Test Connection')}</span>
                </>
              )}
            </button>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('ai.savingBtn', 'Saving Settings...')}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('ai.saveBtn', 'Save AI Configuration')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
