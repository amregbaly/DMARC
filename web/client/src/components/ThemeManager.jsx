import React, { useState, useEffect, useMemo } from 'react';
import {
  Palette,
  Plus,
  RotateCcw,
  Check,
  Trash2,
  Eye,
  Sparkles,
  Sliders,
  Shield,
  Activity,
  AlertCircle,
  Info,
  CheckCircle2,
  Sun,
  Moon,
  Save,
  X,
  Layers,
  ArrowRight,
  HeartPulse,
  ShieldAlert
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { createTheme, updateTheme, deleteTheme, resetTheme } from '../services/api';

// Template presets for fast new theme bootstrapping
const THEME_PRESETS = [
  {
    id: 'cyber-dark-base',
    name: 'Cyber Dark Base',
    category: 'dark',
    badge: 'Classic SOC',
    colors: {
      bg: '#030712',
      card: '#0f172a',
      cardHover: '#1e293b',
      border: '#1e293b',
      borderSubtle: '#334155',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      textSubtle: '#64748b',
      accent: '#06b6d4',
      accentHover: '#0891b2',
      glassBg: 'rgba(15, 23, 42, 0.65)',
      glassBorder: 'rgba(255, 255, 255, 0.07)',
      sidebarBg: '#030712',
      sidebarBorder: '#1e293b',
      sidebarText: '#94a3b8',
      sidebarTextHover: '#f8fafc',
      sidebarActiveText: '#06b6d4',
      sidebarActiveBg: 'rgba(6, 182, 212, 0.15)',
      sidebarHeaderText: '#64748b',
      chartGrid: '#1e293b',
      chartAxis: '#64748b',
      chartTooltipBg: 'rgba(15, 23, 42, 0.95)',
      chartTooltipBorder: 'rgba(51, 65, 85, 0.8)',
      chartTooltipText: '#f8fafc',
      mapTiles: 'dark'
    }
  },
  {
    id: 'neon-violet',
    name: 'Neon Violet SOC',
    category: 'dark',
    badge: 'High Threat',
    colors: {
      bg: '#0a0518',
      card: '#140c2e',
      cardHover: '#21144a',
      border: '#2c1a60',
      borderSubtle: '#3d2582',
      text: '#faf5ff',
      textMuted: '#c084fc',
      textSubtle: '#9333ea',
      accent: '#a855f7',
      accentHover: '#9333ea',
      glassBg: 'rgba(20, 12, 46, 0.70)',
      glassBorder: 'rgba(168, 85, 247, 0.20)',
      sidebarBg: '#0a0518',
      sidebarBorder: '#2c1a60',
      sidebarText: '#c084fc',
      sidebarTextHover: '#faf5ff',
      sidebarActiveText: '#c084fc',
      sidebarActiveBg: 'rgba(168, 85, 247, 0.20)',
      sidebarHeaderText: '#9333ea',
      chartGrid: '#2c1a60',
      chartAxis: '#c084fc',
      chartTooltipBg: 'rgba(20, 12, 46, 0.95)',
      chartTooltipBorder: 'rgba(168, 85, 247, 0.5)',
      chartTooltipText: '#faf5ff',
      mapTiles: 'dark'
    }
  },
  {
    id: 'solar-amber',
    name: 'Obsidian & Gold',
    category: 'dark',
    badge: 'Security Operations',
    colors: {
      bg: '#0c0a06',
      card: '#1c170c',
      cardHover: '#2a2212',
      border: '#382f18',
      borderSubtle: '#4d4022',
      text: '#fef3c7',
      textMuted: '#fcd34d',
      textSubtle: '#b45309',
      accent: '#f59e0b',
      accentHover: '#d97706',
      glassBg: 'rgba(28, 23, 12, 0.75)',
      glassBorder: 'rgba(245, 158, 11, 0.20)',
      sidebarBg: '#0c0a06',
      sidebarBorder: '#382f18',
      sidebarText: '#fcd34d',
      sidebarTextHover: '#fef3c7',
      sidebarActiveText: '#f59e0b',
      sidebarActiveBg: 'rgba(245, 158, 11, 0.20)',
      sidebarHeaderText: '#b45309',
      chartGrid: '#382f18',
      chartAxis: '#fcd34d',
      chartTooltipBg: 'rgba(28, 23, 12, 0.95)',
      chartTooltipBorder: 'rgba(245, 158, 11, 0.5)',
      chartTooltipText: '#fef3c7',
      mapTiles: 'dark'
    }
  },
  {
    id: 'executive-light-base',
    name: 'Executive Light Base',
    category: 'light',
    badge: 'Executive',
    colors: {
      bg: '#f8fafc',
      card: '#ffffff',
      cardHover: '#f1f5f9',
      border: '#e2e8f0',
      borderSubtle: '#cbd5e1',
      text: '#0f172a',
      textMuted: '#475569',
      textSubtle: '#64748b',
      accent: '#0284c7',
      accentHover: '#0369a1',
      glassBg: 'rgba(255, 255, 255, 0.90)',
      glassBorder: 'rgba(226, 232, 240, 0.85)',
      sidebarBg: '#ffffff',
      sidebarBorder: '#e2e8f0',
      sidebarText: '#475569',
      sidebarTextHover: '#0f172a',
      sidebarActiveText: '#0284c7',
      sidebarActiveBg: 'rgba(2, 132, 199, 0.12)',
      sidebarHeaderText: '#64748b',
      chartGrid: '#e2e8f0',
      chartAxis: '#64748b',
      chartTooltipBg: 'rgba(255, 255, 255, 0.98)',
      chartTooltipBorder: 'rgba(226, 232, 240, 0.9)',
      chartTooltipText: '#0f172a',
      mapTiles: 'light'
    }
  },
  {
    id: 'crimson-sentinel',
    name: 'Crimson Threat Red',
    category: 'dark',
    badge: 'Zero Trust',
    colors: {
      bg: '#0f0507',
      card: '#1f0d11',
      cardHover: '#2e141a',
      border: '#451a24',
      borderSubtle: '#5e2331',
      text: '#fff1f2',
      textMuted: '#fda4af',
      textSubtle: '#e11d48',
      accent: '#f43f5e',
      accentHover: '#e11d48',
      glassBg: 'rgba(31, 13, 17, 0.70)',
      glassBorder: 'rgba(244, 63, 94, 0.25)',
      sidebarBg: '#0f0507',
      sidebarBorder: '#451a24',
      sidebarText: '#fda4af',
      sidebarTextHover: '#fff1f2',
      sidebarActiveText: '#f43f5e',
      sidebarActiveBg: 'rgba(244, 63, 94, 0.20)',
      sidebarHeaderText: '#e11d48',
      chartGrid: '#451a24',
      chartAxis: '#fda4af',
      chartTooltipBg: 'rgba(31, 13, 17, 0.95)',
      chartTooltipBorder: 'rgba(244, 63, 94, 0.5)',
      chartTooltipText: '#fff1f2',
      mapTiles: 'dark'
    }
  }
];

export default function ThemeManager({ currentUser }) {
  const { t } = useLanguage();
  const { theme: activeThemeId, setTheme, themes, refreshThemes } = useTheme();

  // Currently selected theme for editing in the studio
  const [selectedThemeId, setSelectedThemeId] = useState(() => activeThemeId || 'light');
  const [editingForm, setEditingForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createPresetId, setCreatePresetId] = useState('cyber-dark-base');
  const [createName, setCreateName] = useState('');
  const [createId, setCreateId] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createBadge, setCreateBadge] = useState('');
  const [createCategory, setCreateCategory] = useState('dark');
  const [createColors, setCreateColors] = useState({ ...THEME_PRESETS[0].colors });

  // Sync selected theme into editing form
  useEffect(() => {
    const current = themes.find(th => th.id === selectedThemeId) || themes[0];
    if (current) {
      setSelectedThemeId(current.id);
      setEditingForm({
        id: current.id,
        name: current.name,
        desc: current.desc || '',
        category: current.category || 'dark',
        badge: current.badge || '',
        isDefault: Boolean(current.isDefault),
        colors: {
          bg: current.colors?.bg || current.preview?.bg || '#030712',
          card: current.colors?.card || current.preview?.card || '#0f172a',
          cardHover: current.colors?.cardHover || '#1e293b',
          border: current.colors?.border || current.preview?.border || '#1e293b',
          borderSubtle: current.colors?.borderSubtle || '#334155',
          text: current.colors?.text || current.preview?.text || '#f8fafc',
          textMuted: current.colors?.textMuted || '#94a3b8',
          textSubtle: current.colors?.textSubtle || '#64748b',
          accent: current.colors?.accent || current.preview?.accent || '#06b6d4',
          accentHover: current.colors?.accentHover || '#0891b2',
          glassBg: current.colors?.glassBg || 'rgba(15, 23, 42, 0.65)',
          glassBorder: current.colors?.glassBorder || 'rgba(255, 255, 255, 0.07)',
          // Left Menu & Sidebar tokens
          sidebarActiveText: current.colors?.sidebarActiveText || current.colors?.accent || (current.category === 'dark' ? '#22d3ee' : '#0284c7'),
          sidebarText: current.colors?.sidebarText || (current.category === 'dark' ? '#94a3b8' : '#475569'),
          sidebarTextHover: current.colors?.sidebarTextHover || (current.category === 'dark' ? '#f8fafc' : '#0f172a'),
          sidebarActiveBg: current.colors?.sidebarActiveBg || (current.category === 'dark' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(2, 132, 199, 0.12)'),
          sidebarHeaderText: current.colors?.sidebarHeaderText || '#64748b',
          sidebarBg: current.colors?.sidebarBg || (current.category === 'dark' ? '#030712' : '#ffffff'),
          sidebarBorder: current.colors?.sidebarBorder || (current.category === 'dark' ? '#1e293b' : '#e2e8f0'),
          chartGrid: current.colors?.chartGrid || '#1e293b',
          chartAxis: current.colors?.chartAxis || '#64748b',
          chartTooltipBg: current.colors?.chartTooltipBg || 'rgba(15, 23, 42, 0.95)',
          chartTooltipBorder: current.colors?.chartTooltipBorder || 'rgba(51, 65, 85, 0.8)',
          chartTooltipText: current.colors?.chartTooltipText || '#f8fafc',
          mapTiles: current.colors?.mapTiles || (current.category === 'dark' ? 'dark' : 'light')
        }
      });
    }
  }, [selectedThemeId, themes]);

  // Color modification helper with instant live-update for active session
  const handleColorChange = (key, val) => {
    setEditingForm(prev => {
      if (!prev) return null;
      return {
        ...prev,
        colors: {
          ...prev.colors,
          [key]: val
        }
      };
    });

    // If currently editing the session's active theme, immediately reflect the change on the page!
    if (selectedThemeId === activeThemeId) {
      const cssVarMap = {
        bg: '--color-slate-950',
        card: '--color-slate-900',
        cardHover: '--color-slate-850',
        border: '--color-slate-800',
        borderSubtle: '--color-slate-700',
        text: '--color-slate-100',
        textMuted: '--color-slate-400',
        textSubtle: '--color-slate-500',
        accent: '--theme-accent',
        accentHover: '--theme-accent-hover',
        sidebarBg: '--sidebar-bg',
        sidebarBorder: '--sidebar-border',
        sidebarText: '--sidebar-text',
        sidebarTextHover: '--sidebar-text-hover',
        sidebarActiveText: '--sidebar-active-text',
        sidebarActiveBg: '--sidebar-active-bg',
        sidebarHeaderText: '--sidebar-header-text'
      };
      if (cssVarMap[key]) {
        document.documentElement.style.setProperty(cssVarMap[key], val);
      }
    }
  };

  // Preset selector for modal
  const handlePresetSelect = (presetId) => {
    setCreatePresetId(presetId);
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setCreateCategory(preset.category);
      setCreateBadge(preset.badge);
      setCreateColors({ ...preset.colors });
    }
  };

  // Save changes to current theme
  const handleSaveTheme = async () => {
    if (!editingForm) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateTheme(editingForm.id, {
        name: editingForm.name,
        desc: editingForm.desc,
        category: editingForm.category,
        badge: editingForm.badge,
        colors: editingForm.colors
      });
      await refreshThemes();
      setFeedback({ type: 'success', message: t('themeManager.savedSuccess', 'Theme saved successfully!') });

      // If this theme is currently active, re-apply it live
      if (activeThemeId === editingForm.id) {
        setTheme(editingForm.id, false);
      }
    } catch (err) {
      console.error('Failed to update theme:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to update theme' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset default theme
  const handleResetTheme = async () => {
    if (!editingForm) return;
    if (!window.confirm(t('themeManager.confirmReset', 'Reset theme colors to factory default settings?'))) {
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await resetTheme(editingForm.id);
      await refreshThemes();
      setFeedback({ type: 'success', message: t('themeManager.resetSuccess', 'Theme reset to factory defaults!') });
      if (activeThemeId === editingForm.id) {
        setTheme(editingForm.id, false);
      }
    } catch (err) {
      console.error('Failed to reset theme:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to reset theme' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete custom theme
  const handleDeleteTheme = async () => {
    if (!editingForm) return;
    if (!window.confirm(t('themeManager.confirmDelete', 'Are you sure you want to delete this custom theme? Users using this theme will revert to Cyber Dark.'))) {
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await deleteTheme(editingForm.id);
      await refreshThemes();
      setSelectedThemeId('dark');
      setFeedback({ type: 'success', message: t('themeManager.deletedSuccess', 'Theme deleted successfully!') });
      if (activeThemeId === editingForm.id) {
        setTheme('dark', true);
      }
    } catch (err) {
      console.error('Failed to delete theme:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to delete theme' });
    } finally {
      setIsSaving(false);
    }
  };

  // Create new theme
  const handleCreateTheme = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;

    let slug = createId.trim().toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) {
      slug = createName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    setIsSaving(true);
    try {
      const res = await createTheme({
        id: slug,
        name: createName.trim(),
        desc: createDesc.trim(),
        category: createCategory,
        badge: createBadge.trim(),
        colors: createColors
      });

      await refreshThemes();
      setIsCreateModalOpen(false);
      setCreateName('');
      setCreateId('');
      setCreateDesc('');
      setCreateBadge('');
      if (res?.theme?.id) {
        setSelectedThemeId(res.theme.id);
      }
      setFeedback({ type: 'success', message: t('themeManager.createdSuccess', 'New theme created successfully!') });
    } catch (err) {
      console.error('Failed to create theme:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to create theme' });
    } finally {
      setIsSaving(false);
    }
  };

  // Quick palette colors helper for swatch circles
  const getThemeSwatches = (th) => {
    const c = th.colors || th.preview || {};
    return [
      { name: 'Bg', color: c.bg || (th.category === 'dark' ? '#030712' : '#ffffff') },
      { name: 'Card', color: c.card || (th.category === 'dark' ? '#0f172a' : '#f8fafc') },
      { name: 'Border', color: c.border || (th.category === 'dark' ? '#1e293b' : '#e2e8f0') },
      { name: 'Accent', color: c.accent || '#06b6d4' },
      { name: 'Text', color: c.text || (th.category === 'dark' ? '#f8fafc' : '#0f172a') }
    ];
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/15 via-blue-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('themeManager.badge', 'Admin Control Panel')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Palette className="w-8 h-8 text-cyan-400" />
              <span>{t('themeManager.title', 'Theme Studio & Color Customization')}</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              {t(
                'themeManager.subtitle',
                'Customize interface color palettes, modify themes, and create new custom themes for your SOC environment.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('themeManager.btnNewTheme', 'Create New Theme')}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs flex items-center justify-between transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-white/10 transition cursor-pointer text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Theme Selection Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Available Themes ({themes.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            Click any theme card to edit its colors in the studio below
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {themes.map((th) => {
            const isCurrentSelected = selectedThemeId === th.id;
            const isActiveInSession = activeThemeId === th.id;
            const swatches = getThemeSwatches(th);

            return (
              <div
                key={th.id}
                onClick={() => setSelectedThemeId(th.id)}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isCurrentSelected
                    ? 'border-cyan-500 shadow-xl shadow-cyan-500/15 bg-cyan-950/20 ring-2 ring-cyan-500/50'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                {/* Top Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        th.category === 'dark'
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {th.category === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </span>
                    {th.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                        {th.badge}
                      </span>
                    )}
                  </div>

                  {isActiveInSession && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm shadow-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Name & Desc */}
                <div className="mb-4">
                  <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {th.name}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-2 mt-0.5 font-normal">
                    {th.desc || 'Custom SOC security theme'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    id: {th.id} {th.isDefault ? '• system' : '• custom'}
                  </div>
                </div>

                {/* Palette Swatch Bar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    {swatches.map((sw, idx) => (
                      <div
                        key={idx}
                        className="flex-1 h-5 rounded-md border border-white/10 shadow-xs transition-transform hover:scale-110"
                        style={{ backgroundColor: sw.color }}
                        title={`${sw.name}: ${sw.color}`}
                      />
                    ))}
                  </div>

                  {/* Card Action footer */}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-cyan-400 font-medium flex items-center gap-1">
                      {isCurrentSelected ? (
                        <>
                          <Sliders className="w-3 h-3" />
                          <span>Editing</span>
                        </>
                      ) : (
                        <span>Click to edit</span>
                      )}
                    </span>

                    {!isActiveInSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTheme(th.id, true);
                          setFeedback({ type: 'success', message: `${th.name} is now your active theme!` });
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 transition cursor-pointer text-[10px] font-semibold"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Editor & Live Sandbox Preview */}
      {editingForm && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column: Theme Settings & Palette Tuning Form */}
          <div className="xl:col-span-7 glass-panel rounded-3xl p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  <span>
                    {t('themeManager.editTitle', 'Theme Editor')}: {editingForm.name}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Modify color tokens, brand accents, and visual attributes for this theme.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {editingForm.isDefault ? (
                  <button
                    onClick={handleResetTheme}
                    disabled={isSaving}
                    title="Reset to factory defaults"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('themeManager.btnResetDefault', 'Reset Defaults')}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleDeleteTheme}
                    disabled={isSaving}
                    title="Delete custom theme"
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('themeManager.btnDelete', 'Delete')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* General Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.themeName', 'Theme Name')}
                </label>
                <input
                  type="text"
                  value={editingForm.name}
                  onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.themeBadge', 'Badge Label')}
                </label>
                <input
                  type="text"
                  value={editingForm.badge}
                  onChange={(e) => setEditingForm({ ...editingForm, badge: e.target.value })}
                  placeholder="e.g. Classic SOC, Executive"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.themeDesc', 'Description')}
                </label>
                <input
                  type="text"
                  value={editingForm.desc}
                  onChange={(e) => setEditingForm({ ...editingForm, desc: e.target.value })}
                  placeholder="Short description of this theme"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.category', 'Theme Mode')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingForm({ ...editingForm, category: 'dark' })}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                      editingForm.category === 'dark'
                        ? 'bg-slate-800 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{t('themeManager.darkMode', 'Dark Mode')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingForm({ ...editingForm, category: 'light' })}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                      editingForm.category === 'light'
                        ? 'bg-slate-800 text-amber-300 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{t('themeManager.lightMode', 'Light Mode')}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.mapTiles', 'Leaflet Map Style')}
                </label>
                <select
                  value={editingForm.colors?.mapTiles || 'dark'}
                  onChange={(e) => handleColorChange('mapTiles', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="dark">CartoDB Dark Matter (Dark Tiles)</option>
                  <option value="light">CartoDB Positron (Light Tiles)</option>
                </select>
              </div>
            </div>

            {/* Color Palette Tokens Grid */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>{t('themeManager.colorsSection', 'Color Palette Tokens')}</span>
                <span className="text-[10px] text-slate-400 normal-case">HEX & Live Color Picker</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Page Background */}
                <ColorInputRow
                  label={t('themeManager.pageBg', 'Page Background')}
                  description="Root canvas background color (--color-slate-950)"
                  value={editingForm.colors.bg}
                  onChange={(v) => handleColorChange('bg', v)}
                />

                {/* 2. Card Surface */}
                <ColorInputRow
                  label={t('themeManager.cardSurface', 'Card / Panel Surface')}
                  description="Primary dashboard cards & tables (--color-slate-900)"
                  value={editingForm.colors.card}
                  onChange={(v) => handleColorChange('card', v)}
                />

                {/* 3. Card Hover */}
                <ColorInputRow
                  label={t('themeManager.surfaceHover', 'Subtle Surface / Hover')}
                  description="Card hover state & table row highlight (--color-slate-850)"
                  value={editingForm.colors.cardHover}
                  onChange={(v) => handleColorChange('cardHover', v)}
                />

                {/* 4. Border */}
                <ColorInputRow
                  label={t('themeManager.border', 'Border & Dividers')}
                  description="Card boundaries & line dividers (--color-slate-800)"
                  value={editingForm.colors.border}
                  onChange={(v) => handleColorChange('border', v)}
                />

                {/* 5. Primary Text */}
                <ColorInputRow
                  label={t('themeManager.primaryText', 'Primary Text')}
                  description="Headings, metric numbers & titles (--color-slate-100)"
                  value={editingForm.colors.text}
                  onChange={(v) => handleColorChange('text', v)}
                />

                {/* 6. Muted Text */}
                <ColorInputRow
                  label={t('themeManager.mutedText', 'Muted Text')}
                  description="Labels, secondary captions & subtitles (--color-slate-400)"
                  value={editingForm.colors.textMuted}
                  onChange={(v) => handleColorChange('textMuted', v)}
                />

                {/* 7. Brand Accent */}
                <ColorInputRow
                  label={t('themeManager.brandAccent', 'Brand / Accent Color')}
                  description="Primary CTA buttons, active pills & charts"
                  value={editingForm.colors.accent}
                  onChange={(v) => handleColorChange('accent', v)}
                />

                {/* 8. Accent Hover */}
                <ColorInputRow
                  label={t('themeManager.accentHover', 'Accent Hover')}
                  description="Hover state for primary action buttons"
                  value={editingForm.colors.accentHover}
                  onChange={(v) => handleColorChange('accentHover', v)}
                />

                {/* 9. Chart Grid */}
                <ColorInputRow
                  label={t('themeManager.chartGrid', 'Chart Grid Lines')}
                  description="Recharts CartesianGrid stroke color"
                  value={editingForm.colors.chartGrid}
                  onChange={(v) => handleColorChange('chartGrid', v)}
                />

                {/* 10. Chart Tooltip Background */}
                <ColorInputRow
                  label={t('themeManager.chartTooltipBg', 'Chart Tooltip Background')}
                  description="Tooltip container fill on chart hover"
                  value={editingForm.colors.chartTooltipBg}
                  onChange={(v) => handleColorChange('chartTooltipBg', v)}
                />
              </div>
            </div>

            {/* Left Menu & Sidebar Color Controls */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>{t('themeManager.sidebarSection', 'Left Menu & Sidebar Styling')}</span>
                </span>
                <span className="text-[10px] text-cyan-400/80 normal-case font-mono">Live Navigation Theme</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Active Menu Text Color */}
                <ColorInputRow
                  label={t('themeManager.sidebarActiveText', 'Active Menu Text Color')}
                  description="Selected tab text, icon & indicator dot (--sidebar-active-text)"
                  value={editingForm.colors.sidebarActiveText}
                  onChange={(v) => handleColorChange('sidebarActiveText', v)}
                />

                {/* 2. Inactive Menu Text Color */}
                <ColorInputRow
                  label={t('themeManager.sidebarText', 'Inactive Menu Text Color')}
                  description="Unselected tab text & secondary labels (--sidebar-text)"
                  value={editingForm.colors.sidebarText}
                  onChange={(v) => handleColorChange('sidebarText', v)}
                />

                {/* 3. Menu Hover Text Color */}
                <ColorInputRow
                  label={t('themeManager.sidebarTextHover', 'Menu Hover Text Color')}
                  description="Text color when hovering over menu items (--sidebar-text-hover)"
                  value={editingForm.colors.sidebarTextHover}
                  onChange={(v) => handleColorChange('sidebarTextHover', v)}
                />

                {/* 4. Active Item Background Tint */}
                <ColorInputRow
                  label={t('themeManager.sidebarActiveBg', 'Active Menu Background Tint')}
                  description="Highlight pill behind the active tab (--sidebar-active-bg)"
                  value={editingForm.colors.sidebarActiveBg}
                  onChange={(v) => handleColorChange('sidebarActiveBg', v)}
                />

                {/* 5. Section Headers Text */}
                <ColorInputRow
                  label={t('themeManager.sidebarHeaderText', 'Section Headers Text')}
                  description="Subheadings like Monitored Scope & Navigation (--sidebar-header-text)"
                  value={editingForm.colors.sidebarHeaderText}
                  onChange={(v) => handleColorChange('sidebarHeaderText', v)}
                />

                {/* 6. Sidebar Canvas Background */}
                <ColorInputRow
                  label={t('themeManager.sidebarBg', 'Sidebar Canvas Background')}
                  description="Left navigation panel background fill (--sidebar-bg)"
                  value={editingForm.colors.sidebarBg}
                  onChange={(v) => handleColorChange('sidebarBg', v)}
                />

                {/* 7. Sidebar Border & Divider */}
                <ColorInputRow
                  label={t('themeManager.sidebarBorder', 'Sidebar Border & Divider')}
                  description="Right boundary border and internal dividers (--sidebar-border)"
                  value={editingForm.colors.sidebarBorder}
                  onChange={(v) => handleColorChange('sidebarBorder', v)}
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTheme(editingForm.id, true);
                    setFeedback({ type: 'success', message: `${editingForm.name} is now your active theme!` });
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('themeManager.btnApply', 'Apply & Activate Now')}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : t('themeManager.btnSave', 'Save Theme Changes')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Preview Sandbox Container */}
          <div className="xl:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>{t('themeManager.previewTitle', 'Live Preview Sandbox')}</span>
              </h3>
              <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25">
                Simulated Canvas
              </span>
            </div>

            {/* Sandbox Card with live applied colors */}
            <div
              className="rounded-3xl p-6 border shadow-2xl transition-all duration-300 relative overflow-hidden space-y-6"
              style={{
                backgroundColor: editingForm.colors.bg,
                borderColor: editingForm.colors.border,
                color: editingForm.colors.text
              }}
            >
              {/* Simulated Left Menu Navigation Bar */}
              <div
                className="p-3.5 rounded-2xl border space-y-2.5 transition-colors shadow-inner"
                style={{
                  backgroundColor: editingForm.colors.sidebarBg || editingForm.colors.bg,
                  borderColor: editingForm.colors.sidebarBorder || editingForm.colors.border
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <span
                    className="text-[10px] font-bold tracking-wider uppercase"
                    style={{ color: editingForm.colors.sidebarHeaderText || '#64748b' }}
                  >
                    Simulated Left Menu
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono border"
                    style={{
                      borderColor: editingForm.colors.sidebarBorder || editingForm.colors.border,
                      color: editingForm.colors.sidebarText || '#94a3b8'
                    }}
                  >
                    8 Monitored
                  </span>
                </div>

                {/* Active Tab Preview */}
                <div
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-xs"
                  style={{
                    color: editingForm.colors.sidebarActiveText || '#22d3ee',
                    backgroundColor: editingForm.colors.sidebarActiveBg || 'rgba(6, 182, 212, 0.15)',
                    borderColor: editingForm.colors.sidebarActiveText || '#22d3ee'
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-1 rounded-md"
                      style={{
                        backgroundColor: editingForm.colors.sidebarActiveBg || 'rgba(6, 182, 212, 0.25)',
                        color: editingForm.colors.sidebarActiveText || '#22d3ee'
                      }}
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <span>Overview (Active Tab)</span>
                  </div>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: editingForm.colors.sidebarActiveText || '#22d3ee',
                      boxShadow: `0 0 6px ${editingForm.colors.sidebarActiveText || '#22d3ee'}`
                    }}
                  />
                </div>

                {/* Inactive Tab Preview */}
                <div
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border border-transparent transition-all"
                  style={{
                    color: editingForm.colors.sidebarText || '#94a3b8'
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-1 rounded-md"
                      style={{
                        backgroundColor: 'rgba(128, 128, 128, 0.1)',
                        color: editingForm.colors.sidebarText || '#94a3b8'
                      }}
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                    </div>
                    <span>Domain Health (Inactive)</span>
                  </div>
                </div>

                {/* Hover Tab Simulation */}
                <div
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border border-transparent transition-all"
                  style={{
                    color: editingForm.colors.sidebarTextHover || '#ffffff',
                    backgroundColor: 'rgba(128, 128, 128, 0.08)'
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-1 rounded-md"
                      style={{
                        backgroundColor: 'rgba(128, 128, 128, 0.15)',
                        color: editingForm.colors.sidebarTextHover || '#ffffff'
                      }}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <span>Threat Intel & SOC (Hover)</span>
                  </div>
                </div>
              </div>

              {/* Simulated Navigation Header */}
              <div
                className="flex items-center justify-between p-3.5 rounded-2xl border"
                style={{
                  backgroundColor: editingForm.colors.card,
                  borderColor: editingForm.colors.border
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: editingForm.colors.accent }}
                  >
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: editingForm.colors.text }}>
                      DMARC Sentinel SOC
                    </div>
                    <div className="text-[10px]" style={{ color: editingForm.colors.textMuted }}>
                      Enterprise Compliance
                    </div>
                  </div>
                </div>

                <div
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border"
                  style={{
                    backgroundColor: `${editingForm.colors.accent}15`,
                    borderColor: `${editingForm.colors.accent}40`,
                    color: editingForm.colors.accent
                  }}
                >
                  p=reject 100%
                </div>
              </div>

              {/* Simulated Metric KPI Card */}
              <div
                className="p-5 rounded-2xl border shadow-sm space-y-3"
                style={{
                  backgroundColor: editingForm.colors.card,
                  borderColor: editingForm.colors.border
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: editingForm.colors.textMuted }}>
                    SPF & DKIM Strict Alignment
                  </span>
                  <div
                    className="p-1 rounded-lg"
                    style={{
                      backgroundColor: `${editingForm.colors.accent}20`,
                      color: editingForm.colors.accent
                    }}
                  >
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight" style={{ color: editingForm.colors.text }}>
                    99.8%
                  </span>
                  <span className="text-xs font-bold text-emerald-500">+1.2%</span>
                </div>

                <div
                  className="h-2 w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: editingForm.colors.border }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: '85%', backgroundColor: editingForm.colors.accent }}
                  />
                </div>
              </div>

              {/* Simulated Threat Intel & Table Row */}
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: editingForm.colors.card,
                  borderColor: editingForm.colors.border
                }}
              >
                <div className="text-xs font-bold" style={{ color: editingForm.colors.text }}>
                  Recent Security Events
                </div>

                <div className="space-y-1.5 text-xs">
                  <div
                    className="flex items-center justify-between p-2 rounded-xl transition-colors"
                    style={{ backgroundColor: editingForm.colors.cardHover }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-mono text-[11px]" style={{ color: editingForm.colors.text }}>
                        mail.google.com
                      </span>
                    </div>
                    <span className="font-bold text-emerald-500 text-[10px]">PASS</span>
                  </div>

                  <div
                    className="flex items-center justify-between p-2 rounded-xl transition-colors"
                    style={{ backgroundColor: editingForm.colors.cardHover }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="font-mono text-[11px]" style={{ color: editingForm.colors.text }}>
                        198.51.100.24 (Spoof)
                      </span>
                    </div>
                    <span className="font-bold text-rose-500 text-[10px]">REJECTED</span>
                  </div>
                </div>
              </div>

              {/* Simulated Button Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-md transition text-center cursor-pointer"
                  style={{ backgroundColor: editingForm.colors.accent }}
                >
                  Generate SOC Report
                </button>
                <button
                  type="button"
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-center cursor-pointer"
                  style={{
                    borderColor: editingForm.colors.border,
                    color: editingForm.colors.text,
                    backgroundColor: editingForm.colors.cardHover
                  }}
                >
                  Filter Scope
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Theme */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t('themeManager.btnNewTheme', 'Create New Theme')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Design a custom color scheme tailored to your security console
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTheme} className="space-y-4">
              {/* Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.basePreset', 'Start from Template Preset')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {THEME_PRESETS.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handlePresetSelect(p.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        createPresetId === p.id
                          ? 'bg-cyan-950/30 border-cyan-500 shadow-xs ring-1 ring-cyan-500/40 text-white'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{p.name}</div>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: p.colors.bg }}
                        />
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: p.colors.accent }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.themeName', 'Theme Name')} *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    if (!createId) {
                      setCreateId(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, '-')
                          .replace(/-+/g, '-')
                      );
                    }
                  }}
                  placeholder="e.g. Cobalt Midnight, Solar Flare"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Theme ID / Slug */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.themeId', 'Theme Identifier / Slug')} *
                </label>
                <input
                  type="text"
                  required
                  value={createId}
                  onChange={(e) => setCreateId(e.target.value)}
                  placeholder="e.g. cobalt-midnight"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Description & Badge */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('themeManager.themeBadge', 'Badge')}
                  </label>
                  <input
                    type="text"
                    value={createBadge}
                    onChange={(e) => setCreateBadge(e.target.value)}
                    placeholder="e.g. Night Ops"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('themeManager.category', 'Mode')}
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="dark">Dark Mode</option>
                    <option value="light">Light Mode</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t('themeManager.themeDesc', 'Description')}
                </label>
                <input
                  type="text"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="e.g. Deep indigo security operations center style"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Color previews */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Initial Palette Preview
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px]">
                  <div className="space-y-1">
                    <span className="text-slate-400">Background</span>
                    <input
                      type="color"
                      value={createColors.bg || '#030712'}
                      onChange={(e) => setCreateColors({ ...createColors, bg: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Card</span>
                    <input
                      type="color"
                      value={createColors.card || '#0f172a'}
                      onChange={(e) => setCreateColors({ ...createColors, card: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Accent</span>
                    <input
                      type="color"
                      value={createColors.accent || '#06b6d4'}
                      onChange={(e) => setCreateColors({ ...createColors, accent: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Text</span>
                    <input
                      type="color"
                      value={createColors.text || '#f8fafc'}
                      onChange={(e) => setCreateColors({ ...createColors, text: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Menu Active</span>
                    <input
                      type="color"
                      value={createColors.sidebarActiveText || createColors.accent || '#22d3ee'}
                      onChange={(e) => setCreateColors({ ...createColors, sidebarActiveText: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Menu Inactive</span>
                    <input
                      type="color"
                      value={createColors.sidebarText || '#94a3b8'}
                      onChange={(e) => setCreateColors({ ...createColors, sidebarText: e.target.value })}
                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Creating...' : 'Create Theme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Color Input Row with native picker + hex input + quick swatch shortcuts
function ColorInputRow({ label, description, value = '#000000', onChange }) {
  // Pre-formatted hex value for type="color"
  const safeHex = useMemo(() => {
    if (!value || typeof value !== 'string') return '#000000';
    if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
      return value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value;
    }
    return '#000000';
  }, [value]);

  return (
    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-200">{label}</label>
        <span className="text-[10px] font-mono text-slate-400 uppercase">{value}</span>
      </div>
      <p className="text-[10.5px] text-slate-400 leading-tight">{description}</p>

      <div className="flex items-center gap-2 pt-1">
        {/* Color picker swatch button */}
        <div className="relative w-8 h-8 rounded-xl border border-white/20 shadow-xs overflow-hidden shrink-0">
          <input
            type="color"
            value={safeHex}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer bg-transparent border-0"
          />
        </div>

        {/* Text HEX input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff or rgba(...)"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>
    </div>
  );
}
