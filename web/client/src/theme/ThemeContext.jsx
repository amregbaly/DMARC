import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { updateProfile } from '../services/api';

const ThemeContext = createContext();

export const THEME_CONFIGS = [
  {
    id: 'dark',
    name: 'Cyber Dark',
    desc: 'Sentinel SOC classic midnight & cyan',
    category: 'dark',
    badge: 'Classic SOC',
    preview: {
      bg: '#030712',
      card: '#0f172a',
      border: '#1e293b',
      accent: '#06b6d4',
      text: '#f8fafc'
    }
  },
  {
    id: 'light',
    name: 'Executive Light',
    desc: 'Crisp corporate slate & brilliant white',
    category: 'light',
    badge: 'Executive',
    preview: {
      bg: '#f8fafc',
      card: '#ffffff',
      border: '#e2e8f0',
      accent: '#0284c7',
      text: '#0f172a'
    }
  },
  {
    id: 'nordic',
    name: 'Nordic Frost',
    desc: 'Cool ice-blue with arctic azure accents',
    category: 'light',
    badge: 'Arctic Blue',
    preview: {
      bg: '#f0f4f8',
      card: '#ffffff',
      border: '#d0e0f0',
      accent: '#2563eb',
      text: '#081830'
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Sentinel',
    desc: 'High-trust sage & forest green security',
    category: 'light',
    badge: 'Compliance',
    preview: {
      bg: '#f2f7f4',
      card: '#ffffff',
      border: '#d4e4da',
      accent: '#059669',
      text: '#081c10'
    }
  }
];

export function ThemeProvider({ children, currentUser, onUserUpdated }) {
  const [theme, setThemeState] = useState(() => {
    if (currentUser?.theme && ['dark', 'light', 'nordic', 'emerald'].includes(currentUser.theme)) {
      return currentUser.theme;
    }
    const saved = localStorage.getItem('dmarc_theme');
    if (saved && ['dark', 'light', 'nordic', 'emerald'].includes(saved)) {
      return saved;
    }
    return 'dark';
  });

  // Apply DOM attributes on theme change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dmarc_theme', theme);
  }, [theme]);

  // Sync with currentUser's theme from backend
  useEffect(() => {
    if (currentUser?.theme && ['dark', 'light', 'nordic', 'emerald'].includes(currentUser.theme)) {
      setThemeState(currentUser.theme);
    }
  }, [currentUser?.theme]);

  const setTheme = useCallback(async (newTheme, saveToBackend = true) => {
    if (!['dark', 'light', 'nordic', 'emerald'].includes(newTheme)) return;
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  const isDark = theme === 'dark';
  const isLight = !isDark;

  // Precomputed chart visual tokens for Recharts
  const chartTokens = useMemo(() => {
    if (isDark) {
      return {
        grid: '#1e293b',
        axis: '#64748b',
        axisLine: '#334155',
        tooltipBg: 'rgba(15, 23, 42, 0.95)',
        tooltipBorder: 'rgba(51, 65, 85, 0.8)',
        tooltipText: '#f8fafc',
        mapTiles: 'dark'
      };
    }
    if (theme === 'nordic') {
      return {
        grid: '#dbeafe',
        axis: '#64748b',
        axisLine: '#cbd5e1',
        tooltipBg: 'rgba(255, 255, 255, 0.98)',
        tooltipBorder: 'rgba(191, 219, 254, 0.9)',
        tooltipText: '#081830',
        mapTiles: 'light'
      };
    }
    if (theme === 'emerald') {
      return {
        grid: '#d1fae5',
        axis: '#475569',
        axisLine: '#cbd5e1',
        tooltipBg: 'rgba(255, 255, 255, 0.98)',
        tooltipBorder: 'rgba(167, 243, 208, 0.9)',
        tooltipText: '#081c10',
        mapTiles: 'light'
      };
    }
    // Executive Light default
    return {
      grid: '#e2e8f0',
      axis: '#64748b',
      axisLine: '#cbd5e1',
      tooltipBg: 'rgba(255, 255, 255, 0.98)',
      tooltipBorder: 'rgba(226, 232, 240, 0.9)',
      tooltipText: '#0f172a',
      mapTiles: 'light'
    };
  }, [theme, isDark]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        isLight,
        themes: THEME_CONFIGS,
        chartTokens
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
      theme: 'dark',
      setTheme: () => {},
      isDark: true,
      isLight: false,
      themes: THEME_CONFIGS,
      chartTokens: {
        grid: '#1e293b',
        axis: '#64748b',
        axisLine: '#334155',
        tooltipBg: 'rgba(15, 23, 42, 0.95)',
        tooltipBorder: 'rgba(51, 65, 85, 0.8)',
        tooltipText: '#f8fafc',
        mapTiles: 'dark'
      }
    };
  }
  return context;
}
