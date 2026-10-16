import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
  HelpCircle,
  Shield,
  Server,
  Sliders,
  MessageSquare,
  CornerDownLeft
} from 'lucide-react';
import {
  fetchAiStatus,
  fetchCopilotSessions,
  createCopilotSession,
  fetchCopilotMessages,
  deleteCopilotSession,
  queryTelemetryCopilot
} from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

export default function TelemetryCopilot({ selectedDomain = 'all', domains = [], currentUser }) {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // AI Status
  const [aiStatus, setAiStatus] = useState(null);
  
  // Sessions & Chat
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [scopeDomain, setScopeDomain] = useState(selectedDomain || 'all');
  const [showSessionsList, setShowSessionsList] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (selectedDomain) {
      setScopeDomain(selectedDomain);
    }
  }, [selectedDomain]);

  useEffect(() => {
    fetchAiStatus()
      .then((data) => setAiStatus(data))
      .catch((err) => console.warn('Copilot AI status check error:', err));

    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  async function loadSessions() {
    try {
      const data = await fetchCopilotSessions();
      const list = data.sessions || [];
      setSessions(list);
      if (list.length > 0 && !currentSessionId) {
        setCurrentSessionId(list[0].id);
      }
    } catch (err) {
      console.warn('Could not load Copilot sessions:', err);
    }
  }

  async function loadMessages(sessionId) {
    try {
      const data = await fetchCopilotMessages(sessionId);
      setMessages(data.messages || []);
    } catch (err) {
      console.warn('Could not load messages for session:', err);
    }
  }

  async function handleNewSession() {
    try {
      const newSession = await createCopilotSession({
        title: `Investigation (${scopeDomain})`,
        domain_scope: scopeDomain
      });
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setShowSessionsList(false);
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  }

  async function handleDeleteSession(sessionId, e) {
    if (e) e.stopPropagation();
    try {
      await deleteCopilotSession(sessionId);
      const remaining = sessions.filter(s => s.id !== sessionId);
      setSessions(remaining);
      if (currentSessionId === sessionId) {
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }

  async function handleSendQuery(customPrompt = null) {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || loadingQuery) return;

    setErrorMsg(null);
    setInputPrompt('');

    // Optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoadingQuery(true);

    try {
      const res = await queryTelemetryCopilot({
        prompt: textToSend,
        session_id: currentSessionId,
        domain: scopeDomain,
        time_window: 'last_30_days'
      });

      if (res.sessionId && res.sessionId !== currentSessionId) {
        setCurrentSessionId(res.sessionId);
        loadSessions();
      }

      const assistantMsg = {
        id: res.messageId || `res-${Date.now()}`,
        role: 'assistant',
        content: res.text,
        meta: {
          model: res.meta?.model,
          provider: res.meta?.provider,
          latencyMs: res.meta?.latencyMs,
          suggestedQueries: res.suggestedQueries,
          dataSummary: res.dataSummary
        },
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Copilot query error:', err);
      setErrorMsg(err.message || 'Failed to complete AI query. Please verify AI configuration in Admin Settings.');
    } finally {
      setLoadingQuery(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  }

  function copyToClipboard(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  const starterQuestions = [
    `Analyze ${scopeDomain !== 'all' ? scopeDomain : 'monitored domains'} authentication health`,
    `Find rogue IPs and active spoofing attempts`,
    `Which sending services are identified as Shadow IT?`,
    `Are we ready to transition to p=reject enforcement?`
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          id="dmarc-copilot-trigger"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-400/60 transition-all duration-300 hover:scale-105 cursor-pointer ring-2 ring-cyan-400/30 backdrop-blur-md"
          title="Open DMARC Telemetry Copilot"
        >
          <div className="relative">
            <Bot className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
          </div>
          <span className="tracking-wide">AI Copilot</span>
          {aiStatus?.provider && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-black/30 text-cyan-200 border border-white/10">
              {aiStatus.provider}
            </span>
          )}
        </button>
      )}

      {/* Slide-over Copilot Drawer / Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-in-out flex flex-col bg-slate-950/95 border border-cyan-500/40 shadow-2xl shadow-cyan-950/80 backdrop-blur-2xl ${
            isExpanded
              ? 'inset-4 sm:inset-8 rounded-3xl'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[460px] md:w-[500px] h-[640px] max-h-[calc(100vh-2rem)] rounded-2xl'
          }`}
        >
          {/* Top Ambient Glow Line */}
          <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-t-2xl" />

          {/* Copilot Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-900/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-wide truncate">
                    DMARC Copilot
                  </h2>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {aiStatus?.provider || 'AI READY'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400 truncate">
                    Scope: <strong className="text-cyan-400 font-mono">{scopeDomain}</strong>
                  </span>
                  {aiStatus?.model && (
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      &bull; {aiStatus.model}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleNewSession}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="New Chat Session"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowSessionsList(!showSessionsList)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  showSessionsList ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Chat History"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer hidden sm:block"
                title={isExpanded ? 'Restore Size' : 'Maximize'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Secondary Filter & Domain Ribbon */}
          <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Domain:</span>
              <select
                value={scopeDomain}
                onChange={(e) => setScopeDomain(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-cyan-300 rounded-lg px-2 py-0.5 text-xs font-mono focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="all">All Domains</option>
                {domains.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="text-[10px] text-slate-500 font-mono">
              RFC 7489 &bull; Live Telemetry
            </div>
          </div>

          {/* Sessions Drawer Overlay (if toggled) */}
          {showSessionsList && (
            <div className="p-3 bg-slate-900/95 border-b border-slate-800 max-h-48 overflow-y-auto space-y-1.5 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center justify-between">
                <span>Recent Investigations</span>
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px] lowercase"
                >
                  <Plus className="w-3 h-3" /> new session
                </button>
              </div>
              {sessions.length === 0 ? (
                <div className="text-xs text-slate-500 italic px-2 py-1">No prior sessions recorded.</div>
              ) : (
                sessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setCurrentSessionId(s.id);
                      setShowSessionsList(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      s.id === currentSessionId ? 'bg-cyan-500/20 text-cyan-200 font-semibold' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="truncate flex-1">{s.title || 'Investigation'}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 ml-2 p-1"
                      title="Delete session"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome banner if no messages */}
            {messages.length === 0 && (
              <div className="py-6 px-4 text-center space-y-4 animate-in fade-in">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-lg shadow-cyan-500/10">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">How can I assist your email perimeter?</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Ask questions about DMARC compliance, rogue IP relays, SPF/DKIM gaps, or Shadow IT SaaS vendors.
                  </p>
                </div>

                {/* Starter Prompts */}
                <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                  {starterQuestions.map((sq, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendQuery(sq)}
                      className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-cyan-200 transition text-left flex items-center justify-between group cursor-pointer"
                    >
                      <span>{sq}</span>
                      <CornerDownLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Messages */}
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id || idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-sm shadow-lg'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                          <Bot className="w-3 h-3" /> Sentinel Copilot
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          {m.meta?.latencyMs && (
                            <span>⚡ {m.meta.latencyMs} ms</span>
                          )}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(m.content, idx)}
                            className="hover:text-cyan-400 p-0.5 cursor-pointer"
                            title="Copy response"
                          >
                            {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content text */}
                    <div className="whitespace-pre-wrap font-sans">
                      {m.content}
                    </div>

                    {/* Telemetry Summary Pill if returned */}
                    {!isUser && m.meta?.dataSummary && m.meta.dataSummary.totalMessages > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          Messages: {m.meta.dataSummary.totalMessages.toLocaleString()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                          Pass Rate: {m.meta.dataSummary.passRate}%
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-rose-400 border border-slate-800">
                          Threats: {m.meta.dataSummary.failedMessages.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Suggested Follow-up Questions Chips */}
                  {!isUser && m.meta?.suggestedQueries && m.meta.suggestedQueries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 max-w-[90%]">
                      {m.meta.suggestedQueries.map((sq, sqIdx) => (
                        <button
                          key={sqIdx}
                          type="button"
                          onClick={() => handleSendQuery(sq)}
                          className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950/40 text-[11px] text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                          <span>{sq}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Query Loading State */}
            {loadingQuery && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 text-xs text-cyan-300 animate-pulse max-w-[80%]">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                <span>Synthesizing OpenSearch telemetry and RFC rules...</span>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Copilot Input Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/70 shrink-0 space-y-2">
            <div className="relative flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask Copilot about ${scopeDomain}... (Press Enter to send)`}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none font-sans"
              />
              <button
                type="button"
                onClick={() => handleSendQuery()}
                disabled={!inputPrompt.trim() || loadingQuery}
                className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
              <span>Shift+Enter for newline</span>
              <span>Grounding: OpenSearch Telemetry</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
