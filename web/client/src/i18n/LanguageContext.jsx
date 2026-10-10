import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';
import { updateProfile } from '../services/api';

const LanguageContext = createContext();

export function LanguageProvider({ children, currentUser, onUserUpdated }) {
  const [language, setLanguageState] = useState(() => {
    if (currentUser?.language && ['en', 'es'].includes(currentUser.language)) {
      return currentUser.language;
    }
    const saved = localStorage.getItem('dmarc_language');
    if (saved && ['en', 'es'].includes(saved)) {
      return saved;
    }
    return 'en';
  });

  // Sync if currentUser's language changes from backend
  useEffect(() => {
    if (currentUser?.language && ['en', 'es'].includes(currentUser.language)) {
      setLanguageState(currentUser.language);
      localStorage.setItem('dmarc_language', currentUser.language);
    }
  }, [currentUser?.language]);

  const setLanguage = useCallback(async (newLang, saveToBackend = true) => {
    if (!['en', 'es'].includes(newLang)) return;
    setLanguageState(newLang);
    localStorage.setItem('dmarc_language', newLang);

    if (saveToBackend && currentUser) {
      try {
        const res = await updateProfile({ language: newLang });
        if (res && res.user && onUserUpdated) {
          onUserUpdated(res.user);
        }
      } catch (err) {
        console.error('Failed to sync language to user profile:', err);
      }
    }
  }, [currentUser, onUserUpdated]);

  // Nested translation helper: t('nav.overview') or t('kpi.totalMessages')
  const t = useCallback((path, fallback = '') => {
    if (!path) return fallback;
    const keys = path.split('.');
    let current = translations[language] || translations.en;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to English if key missing in Spanish
        let enFallback = translations.en;
        for (const ek of keys) {
          if (enFallback && typeof enFallback === 'object' && ek in enFallback) {
            enFallback = enFallback[ek];
          } else {
            return fallback || path;
          }
        }
        return typeof enFallback === 'string' ? enFallback : (fallback || path);
      }
    }
    return typeof current === 'string' ? current : (fallback || path);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isSpanish: language === 'es' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key, fallback = '') => fallback || key,
      isSpanish: false
    };
  }
  return context;
}
