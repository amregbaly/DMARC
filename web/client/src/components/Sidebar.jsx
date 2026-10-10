import React, { useState } from 'react';
import {
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
  X,
  Settings
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Sidebar({
  domains = [],
  selectedDomain,
  onSelectDomain,
  activeTab,
  onSelectTab,
  onRefresh,
  isLoading,
  currentUser,
  onLogout,
  onChangePasswordClick,
  onOpenProfileModal,
  mobileOpen = false,
  onCloseMobile
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const canManageUsers = isAdmin || isManager;

  const tabs = [
    { id: 'overview', label: t('nav.overview', 'Overview'), icon: Activity },
    { id: 'health', label: t('nav.health', 'Domain Health'), icon: HeartPulse },
    { id: 'alignment', label: t('nav.alignment', 'Auth & Alignment'), icon: CheckCircle2 },
    { id: 'threats', label: t('nav.threats', 'Threat Intel & SOC'), icon: ShieldAlert },
    { id: 'policies', label: t('nav.policies', 'Policies & Readiness'), icon: Sliders },
    { id: 'reports', label: t('nav.reports', 'Reports'), icon: FileText },
    { id: 'records', label: t('nav.records', 'Log Explorer'), icon: Search },
    ...(canManageUsers ? [{ id: 'users', label: t('nav.users', 'User Access'), icon: Users }] : [])
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Panel */}
      <aside
        id="app-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 xl:w-72 bg-slate-950/95 lg:bg-slate-950/80 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl shadow-cyan-950/50' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => {
              onSelectTab('overview');
              if (onCloseMobile) onCloseMobile();
            }}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-white/20 shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">
                  DMARC<span className="text-cyan-400">Sentinel</span>
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-md animate-pulse">
                  {t('nav.live', 'LIVE')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                {t('nav.tagline', 'Enterprise Email Security')}
              </p>
            </div>
          </div>

          {/* Close Button on Mobile Drawer */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Monitored Scope / Domain Filter */}
        {activeTab !== 'users' && (
          <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
            <div className="flex items-center justify-between mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              <span>{t('nav.monitoredDomain', 'Monitored Scope')}</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] font-mono">
                {domains.length}
              </span>
            </div>
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                id="sidebar-domain-filter"
                value={selectedDomain}
                onChange={(e) => onSelectDomain(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-xl pl-8 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer truncate"
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
          </div>
        )}

        {/* Navigation List - Horizontal Item Rows on Left Side */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            {t('nav.navigation', 'Navigation')}
          </div>

          <nav className="space-y-1" aria-label="Main Navigation">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => {
                    onSelectTab(tab.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent text-cyan-300 border border-cyan-500/35 shadow-md shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        isActive
                          ? 'bg-cyan-500/25 text-cyan-300'
                          : 'bg-slate-900/80 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    <span className="truncate">{tab.label}</span>
                  </div>

                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Controls Section: Language & Refresh */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Language Switcher Pill */}
            <button
              id="sidebar-language-toggle-btn"
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              title={language === 'en' ? t('nav.switchLanguage', 'Switch to Spanish') : t('nav.switchLanguage', 'Cambiar a Inglés')}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer font-medium"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-semibold text-[11px]">{language === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}</span>
            </button>

            {/* Refresh Button */}
            <button
              id="sidebar-refresh-button"
              onClick={onRefresh}
              disabled={isLoading}
              title={t('nav.refresh', 'Refresh Data')}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer font-medium disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 shrink-0 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span className="text-[11px] font-semibold">{t('common.refresh', 'Refresh')}</span>
            </button>
          </div>

          {/* User Profile Card & Action Dropdown */}
          {currentUser && (
            <div className="relative pt-1">
              <button
                id="sidebar-user-profile-button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[11px] uppercase shrink-0 ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : currentUser.role === 'manager'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {(currentUser.email || currentUser.username).substring(0, 2)}
                  </div>
                  <div className="text-left min-w-0 truncate">
                    <span className="font-semibold text-slate-200 block leading-tight truncate">
                      {currentUser.username || currentUser.email}
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-tight capitalize truncate">
                      {currentUser.role === 'admin'
                        ? t('nav.roleAdmin', 'Super Admin')
                        : currentUser.role === 'manager'
                        ? t('nav.roleManager', 'Manager')
                        : t('nav.roleViewer', 'Viewer')}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute left-0 right-0 bottom-full mb-2 rounded-2xl glass-panel bg-slate-900/95 border border-slate-800 shadow-2xl z-40 py-1.5 text-xs">
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
                    </div>

                    {/* Profile & Preferences */}
                    <button
                      id="sidebar-menu-user-profile"
                      onClick={() => {
                        setUserMenuOpen(false);
                        if (onOpenProfileModal) onOpenProfileModal();
                      }}
                      className="w-full text-left px-3.5 py-2 text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 flex items-center gap-2 transition cursor-pointer font-medium"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('nav.profile', 'Profile & Preferences')}</span>
                    </button>

                    {/* User Management shortcut (if privileged) */}
                    {canManageUsers && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onSelectTab('users');
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className="w-full text-left px-3.5 py-2 text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t('nav.manageUsers', 'Manage Users & Access')}</span>
                      </button>
                    )}

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
                      id="sidebar-btn-logout"
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
      </aside>
    </>
  );
}
