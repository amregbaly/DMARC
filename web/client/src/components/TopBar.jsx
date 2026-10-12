import React, { useState } from 'react';
import {
  Menu,
  Shield,
  Activity,
  HeartPulse,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  FileText,
  Search,
  Users,
  RefreshCw,
  Filter,
  Globe,
  Key,
  LogOut,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Palette,
  Compass
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

export default function TopBar({
  domains = [],
  selectedDomain,
  onSelectDomain,
  activeTab,
  onRefresh,
  isLoading,
  currentUser,
  onLogout,
  onChangePasswordClick,
  onOpenProfileModal,
  onOpenMobileSidebar
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, isDark, themes } = useTheme();

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const canManageUsers = isAdmin || isManager;

  const tabMeta = {
    overview: { label: t('nav.overview', 'Overview'), icon: Activity },
    health: { label: t('nav.health', 'Domain Health'), icon: HeartPulse },
    alignment: { label: t('nav.alignment', 'Auth & Alignment'), icon: CheckCircle2 },
    threats: { label: t('nav.threats', 'Threat Intel & SOC'), icon: ShieldAlert },
    policies: { label: t('nav.policies', 'Policies & Readiness'), icon: Sliders },
    reports: { label: t('nav.reports', 'Reports'), icon: FileText },
    records: { label: t('nav.records', 'Log Explorer'), icon: Search },
    users: { label: t('nav.users', 'User Access'), icon: Users }
  };

  const currentTab = tabMeta[activeTab] || { label: activeTab, icon: Shield };
  const CurrentIcon = currentTab.icon;

  function cycleTheme() {
    const order = ['dark', 'light', 'nordic', 'emerald'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next, true);
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & Page Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          id="mobile-sidebar-toggle"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Info */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-semibold text-slate-300">DMARC Sentinel</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <CurrentIcon className="w-4 h-4" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {currentTab.label}
            </h1>
          </div>
        </div>
      </div>

      {/* Right Controls: Filter, Language, Theme, Refresh, User */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Domain Filter Dropdown */}
        {activeTab !== 'users' && (
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              id="domain-filter"
              value={selectedDomain}
              onChange={(e) => onSelectDomain(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-xl pl-8 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer max-w-[130px] sm:max-w-[200px] truncate"
            >
              <option value="all">
                {isAdmin
                  ? `${t('nav.allDomains', 'All Domains')} (${domains.length})`
                  : `${t('nav.allDomains', 'All Monitored Domains')} (${domains.length})`}
              </option>
              {domains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Theme Toggle Pill */}
        <button
          id="theme-toggle-btn"
          onClick={cycleTheme}
          title={`Active theme: ${theme}. Click to switch theme.`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition cursor-pointer font-medium"
        >
          {theme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
          ) : theme === 'nordic' ? (
            <Compass className="w-3.5 h-3.5 text-blue-500" />
          ) : theme === 'emerald' ? (
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="hidden sm:inline font-semibold text-[11px] capitalize">
            {theme === 'dark' ? 'Dark' : theme === 'nordic' ? 'Nordic' : theme === 'emerald' ? 'Emerald' : 'Light'}
          </span>
        </button>

        {/* Quick Language Toggle Pill */}
        <button
          id="language-toggle-btn"
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          title={language === 'en' ? t('nav.switchLanguage', 'Switch to Spanish') : t('nav.switchLanguage', 'Cambiar a Inglés')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition cursor-pointer font-medium"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-[11px]">{language === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}</span>
        </button>

        {/* Refresh Button */}
        {activeTab !== 'users' && (
          <button
            id="refresh-button"
            onClick={onRefresh}
            disabled={isLoading}
            title={t('nav.refresh', 'Refresh Data')}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-400 hover:text-cyan-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-4 h-4 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden md:inline text-[11px] font-semibold text-slate-300">
              {t('common.refresh', 'Refresh')}
            </span>
          </button>
        )}

        {/* User Profile Badge & Menu */}
        {currentUser && (
          <div className="relative">
            <button
              id="user-profile-button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition cursor-pointer text-xs"
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${
                  currentUser.role === 'admin'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : currentUser.role === 'manager'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {(currentUser.email || currentUser.username).substring(0, 2)}
              </div>
              <div className="text-left hidden md:block max-w-[120px]">
                <span className="font-semibold text-slate-200 block leading-tight truncate">
                  {currentUser.username || currentUser.email}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight capitalize">
                  {currentUser.role === 'admin'
                    ? t('nav.roleAdmin', 'Super Admin')
                    : currentUser.role === 'manager'
                    ? t('nav.roleManager', 'Manager')
                    : t('nav.roleViewer', 'Viewer')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-60 rounded-2xl glass-panel bg-slate-900/95 border border-slate-800 shadow-2xl z-40 py-1.5 text-xs">
                  {/* User Info Header */}
                  <div className="px-3.5 py-2.5 border-b border-slate-800">
                    <div className="font-semibold text-white truncate">
                      {currentUser.username}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {currentUser.email || 'No email registered'}
                    </div>
                    {currentUser.organization_name && (
                      <div className="text-[10px] text-cyan-400 truncate mt-0.5 font-medium">
                        {currentUser.organization_name}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          currentUser.role === 'admin'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : currentUser.role === 'manager'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {currentUser.role === 'admin'
                          ? t('nav.roleAdmin', 'Super Admin')
                          : currentUser.role === 'manager'
                          ? t('nav.roleManager', 'Manager')
                          : t('nav.roleViewer', 'Viewer')}
                      </span>
                    </div>
                  </div>

                  {/* Profile & Preferences */}
                  <button
                    id="menu-user-profile"
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onOpenProfileModal) onOpenProfileModal();
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 flex items-center gap-2 transition cursor-pointer font-medium"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('nav.profile', 'Profile & Preferences')}</span>
                  </button>

                  {/* Language Switcher in Dropdown */}
                  <div className="px-3.5 py-2 flex items-center justify-between text-slate-300 border-t border-slate-800/60 my-0.5 bg-slate-950/40">
                    <span className="flex items-center gap-2 text-xs">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('nav.language', 'Language')}</span>
                    </span>
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setLanguage('en')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          language === 'en'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🇺🇸 EN
                      </button>
                      <button
                        onClick={() => setLanguage('es')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          language === 'es'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🇪🇸 ES
                      </button>
                    </div>
                  </div>

                  {/* Theme Switcher in Dropdown */}
                  <div className="px-3.5 py-2 flex items-center justify-between text-slate-300 border-t border-b border-slate-800/60 my-0.5 bg-slate-950/40">
                    <span className="flex items-center gap-2 text-xs">
                      <Palette className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'es' ? 'Tema' : 'Theme'}</span>
                    </span>
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      {themes.map((th) => (
                        <button
                          key={th.id}
                          onClick={() => setTheme(th.id, true)}
                          title={th.name}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            theme === th.id
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {th.id === 'dark' ? '🌙' : th.id === 'nordic' ? '❄️' : th.id === 'emerald' ? '🌿' : '☀️'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Password */}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onChangePasswordClick();
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('nav.changePassword', 'Change Password')}</span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  {/* Logout */}
                  <button
                    id="btn-logout"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t('nav.signOut', 'Sign Out')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
