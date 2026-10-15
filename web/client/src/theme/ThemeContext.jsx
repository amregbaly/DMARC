import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { updateProfile, fetchThemes } from '../services/api';

const ThemeContext = createContext();

export const THEME_CONFIGS = [
  {
    id: 'dark',
    name: 'Cyber Dark',
    desc: 'Sentinel SOC classic midnight & cyan',
    category: 'dark',
    badge: 'Classic SOC',
    isDefault: false,
    preview: {
      bg: '#030712',
      card: '#0f172a',
      border: '#1e293b',
      accent: '#06b6d4',
      text: '#f8fafc'
    },
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
      sidebarActiveText: '#22d3ee',
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
    id: 'light',
    name: 'Executive Light',
    desc: 'Crisp corporate slate & brilliant white',
    category: 'light',
    badge: 'Executive',
    isDefault: true,
    preview: {
      bg: '#f8fafc',
      card: '#ffffff',
      border: '#e2e8f0',
      accent: '#0284c7',
      text: '#0f172a'
    },
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
    id: 'nordic',
    name: 'Nordic Frost',
    desc: 'Cool ice-blue with arctic azure accents',
    category: 'light',
    badge: 'Arctic Blue',
    isDefault: true,
    preview: {
      bg: '#f0f4f8',
      card: '#ffffff',
      border: '#d0e0f0',
      accent: '#2563eb',
      text: '#081830'
    },
    colors: {
      bg: '#f0f4f8',
      card: '#ffffff',
      cardHover: '#e8f0f8',
      border: '#d0e0f0',
      borderSubtle: '#b8d0e8',
      text: '#081830',
      textMuted: '#385878',
      textSubtle: '#507090',
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      glassBg: 'rgba(255, 255, 255, 0.92)',
      glassBorder: 'rgba(208, 224, 240, 0.85)',
      sidebarBg: '#ffffff',
      sidebarBorder: '#d0e0f0',
      sidebarText: '#385878',
      sidebarTextHover: '#081830',
      sidebarActiveText: '#2563eb',
      sidebarActiveBg: 'rgba(37, 99, 235, 0.12)',
      sidebarHeaderText: '#507090',
      chartGrid: '#dbeafe',
      chartAxis: '#64748b',
      chartTooltipBg: 'rgba(255, 255, 255, 0.98)',
      chartTooltipBorder: 'rgba(191, 219, 254, 0.9)',
      chartTooltipText: '#081830',
      mapTiles: 'light'
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Sentinel',
    desc: 'High-trust sage & forest green security',
    category: 'light',
    badge: 'Compliance',
    isDefault: true,
    preview: {
      bg: '#f2f7f4',
      card: '#ffffff',
      border: '#d4e4da',
      accent: '#059669',
      text: '#081c10'
    },
    colors: {
      bg: '#f2f7f4',
      card: '#ffffff',
      cardHover: '#e8f2ec',
      border: '#d4e4da',
      borderSubtle: '#b8d0c2',
      text: '#081c10',
      textMuted: '#3a5c48',
      textSubtle: '#527460',
      accent: '#059669',
      accentHover: '#047857',
      glassBg: 'rgba(255, 255, 255, 0.92)',
      glassBorder: 'rgba(212, 228, 218, 0.85)',
      sidebarBg: '#ffffff',
      sidebarBorder: '#d4e4da',
      sidebarText: '#3a5c48',
      sidebarTextHover: '#081c10',
      sidebarActiveText: '#059669',
      sidebarActiveBg: 'rgba(5, 150, 105, 0.12)',
      sidebarHeaderText: '#527460',
      chartGrid: '#d1fae5',
      chartAxis: '#475569',
      chartTooltipBg: 'rgba(255, 255, 255, 0.98)',
      chartTooltipBorder: 'rgba(167, 243, 208, 0.9)',
      chartTooltipText: '#081c10',
      mapTiles: 'light'
    }
  }
];

export function ThemeProvider({ children, currentUser, onUserUpdated }) {
  const [themes, setThemes] = useState(THEME_CONFIGS);

  const [theme, setThemeState] = useState(() => {
    if (currentUser?.theme) {
      return currentUser.theme;
    }
    const saved = localStorage.getItem('dmarc_theme');
    if (saved) {
      return saved;
    }
    return 'light';
  });

  // Load themes from backend API
  const refreshThemes = useCallback(async () => {
    try {
      const data = await fetchThemes();
      if (Array.isArray(data) && data.length > 0) {
        setThemes(data);
      }
    } catch (err) {
      console.warn('Could not load themes from server, using local configs:', err.message);
    }
  }, []);

  useEffect(() => {
    refreshThemes();
  }, [refreshThemes]);

  // Determine active theme configuration
  const activeThemeConfig = useMemo(() => {
    const found = themes.find(t => t.id === theme);
    if (found) return found;
    return themes.find(t => t.id === 'light') || themes[0] || THEME_CONFIGS[1];
  }, [themes, theme]);

  const isDark = activeThemeConfig.category === 'dark';
  const isLight = !isDark;

  // Apply DOM attributes and inject dynamic CSS variables whenever active theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dmarc_theme', theme);

    // Dynamic CSS property injection
    const c = activeThemeConfig.colors || activeThemeConfig.preview || {};
    const bg = c.bg || (isDark ? '#030712' : '#ffffff');
    const card = c.card || (isDark ? '#0f172a' : '#f8fafc');
    const cardHover = c.cardHover || (isDark ? '#1e293b' : '#f1f5f9');
    const border = c.border || (isDark ? '#1e293b' : '#e2e8f0');
    const borderSubtle = c.borderSubtle || (isDark ? '#334155' : '#cbd5e1');
    const text = c.text || (isDark ? '#f8fafc' : '#0f172a');
    const textMuted = c.textMuted || (isDark ? '#94a3b8' : '#475569');
    const textSubtle = c.textSubtle || '#64748b';
    const accent = c.accent || (isDark ? '#06b6d4' : '#0284c7');
    const accentHover = c.accentHover || accent;
    const glassBg = c.glassBg || (isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.90)');
    const glassBorder = c.glassBorder || (isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(226, 232, 240, 0.85)');

    // Left Menu & Sidebar tokens
    const sidebarBg = c.sidebarBg || (isDark ? '#030712' : '#ffffff');
    const sidebarBorder = c.sidebarBorder || (isDark ? '#1e293b' : '#e2e8f0');
    const sidebarText = c.sidebarText || (isDark ? '#94a3b8' : '#475569');
    const sidebarTextHover = c.sidebarTextHover || (isDark ? '#f8fafc' : '#0f172a');
    const sidebarActiveText = c.sidebarActiveText || c.accent || (isDark ? '#22d3ee' : '#0284c7');
    const sidebarActiveBg = c.sidebarActiveBg || (isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(2, 132, 199, 0.12)');
    const sidebarHeaderText = c.sidebarHeaderText || '#64748b';

    let styleEl = document.getElementById('sentinel-dynamic-theme-vars');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'sentinel-dynamic-theme-vars';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      :root,
      html[data-theme="${theme}"],
      [data-theme="${theme}"] {
        --color-slate-950: ${bg};
        --color-slate-900: ${card};
        --color-slate-850: ${cardHover};
        --color-slate-800: ${border};
        --color-slate-700: ${borderSubtle};
        --color-slate-500: ${textSubtle};
        --color-slate-400: ${textMuted};
        --color-slate-300: ${textMuted};
        --color-slate-200: ${text};
        --color-slate-100: ${text};
        --theme-accent: ${accent};
        --theme-accent-hover: ${accentHover};
        --sidebar-bg: ${sidebarBg};
        --sidebar-border: ${sidebarBorder};
        --sidebar-text: ${sidebarText};
        --sidebar-text-hover: ${sidebarTextHover};
        --sidebar-active-text: ${sidebarActiveText};
        --sidebar-active-bg: ${sidebarActiveBg};
        --sidebar-header-text: ${sidebarHeaderText};
      }
      aside#app-left-sidebar {
        background-color: ${sidebarBg} !important;
        border-color: ${sidebarBorder} !important;
      }
      html[data-theme="${theme}"] .glass-panel,
      [data-theme="${theme}"] .glass-panel {
        background: ${glassBg} !important;
        border-color: ${glassBorder} !important;
      }
    `;
  }, [theme, activeThemeConfig, isDark]);

  // Sync with currentUser's theme from backend
  useEffect(() => {
    if (currentUser?.theme && currentUser.theme !== theme) {
      setThemeState(currentUser.theme);
    }
  }, [currentUser?.theme]);

  const setTheme = useCallback(async (newTheme, saveToBackend = true) => {
    if (!newTheme || typeof newTheme !== 'string') return;
    setThemeState(newTheme);
    localStorage.setItem('dmarc_theme', newTheme);

    if (saveToBackend && currentUser) {
      try {
        const res = await updateProfile({ theme: newTheme });
        if (res && res.user && onUserUpdated) {
          onUserUpdated(res.user);
        }
      } catch (err) {
        console.error('Failed to sync theme preference to user profile:', err);
      }
    }
  }, [currentUser, onUserUpdated]);

  // Dynamic Recharts chart visual tokens
  const chartTokens = useMemo(() => {
    const c = activeThemeConfig.colors || {};
    return {
      grid: c.chartGrid || (isDark ? '#1e293b' : '#e2e8f0'),
      axis: c.chartAxis || '#64748b',
      axisLine: c.chartGrid || (isDark ? '#334155' : '#cbd5e1'),
      tooltipBg: c.chartTooltipBg || (isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)'),
      tooltipBorder: c.chartTooltipBorder || (isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.9)'),
      tooltipText: c.chartTooltipText || (isDark ? '#f8fafc' : '#0f172a'),
      mapTiles: c.mapTiles || (isDark ? 'dark' : 'light')
    };
  }, [activeThemeConfig, isDark]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        isLight,
        themes,
        activeThemeConfig,
        chartTokens,
        refreshThemes
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      setTheme: () => {},
      isDark: false,
      isLight: true,
      themes: THEME_CONFIGS,
      activeThemeConfig: THEME_CONFIGS[1],
      chartTokens: {
        grid: '#e2e8f0',
        axis: '#64748b',
        axisLine: '#cbd5e1',
        tooltipBg: 'rgba(255, 255, 255, 0.98)',
        tooltipBorder: 'rgba(226, 232, 240, 0.9)',
        tooltipText: '#0f172a',
        mapTiles: 'light'
      },
      refreshThemes: async () => {}
    };
  }
  return context;
}
