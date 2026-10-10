import React, { useState } from 'react';
import {
  Shield,
  RefreshCw,
  Filter,
  Users,
  LogOut,
  Key,
  ChevronDown,
  User as UserIcon,
  Briefcase,
  Eye,
  FileText,
  Globe,
  Settings
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Navbar({
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
  onOpenProfileModal
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const canManageUsers = isAdmin || isManager;

  const tabs = [
    { id: 'overview', label: t('nav.overview', 'Overview') },
    { id: 'health', label: t('nav.health', 'Domain Health') },
    { id: 'alignment', label: t('nav.alignment', 'Auth & Alignment') },
    { id: 'threats', label: t('nav.threats', 'Threat Intel & SOC') },
    { id: 'policies', label: t('nav.policies', 'Policies & Readiness') },
    { id: 'reports', label: t('nav.reports', 'Reports') },
    { id: 'records', label: t('nav.records', 'Log Explorer') },
    ...(canManageUsers ? [{ id: 'users', label: t('nav.users', 'User Access') }] : [])
  ];

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onSelectTab('overview')}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  DMARC<span className="text-cyan-400">Sentinel</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-md">
                  {t('nav.live', 'LIVE')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {t('nav.tagline', 'Enterprise Email Authentication & Access Control')}
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.id === 'users' && <Users className="w-3.5 h-3.5" />}
                  {tab.id === 'reports' && <FileText className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Filters, Language Toggle, User Profile & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick Language Toggle Pill */}
            <button
              id="language-toggle-btn"
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              title={language === 'en' ? t('nav.switchLanguage', 'Switch to Spanish (Español)') : t('nav.switchLanguage', 'Cambiar a Inglés (English)')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition cursor-pointer font-medium"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-[11px]">{language === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}</span>
            </button>

            {/* Domain Filter (hidden on user management tab) */}
            {activeTab !== 'users' && (
              <div className="relative flex items-center">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <select
                  id="domain-filter"
                  value={selectedDomain}
                  onChange={(e) => onSelectDomain(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700/80 hover:border-slate-600 text-xs text-slate-200 rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all cursor-pointer max-w-[170px] truncate"
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

            {/* Refresh Button */}
            {activeTab !== 'users' && (
              <button
                id="refresh-button"
                onClick={onRefresh}
                disabled={isLoading}
                title={t('nav.refresh', 'Refresh Data')}
                className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`}
                />
              </button>
            )}

            {/* User Profile Badge & Menu */}
            {currentUser && (
              <div className="relative">
                <button
                  id="user-profile-button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition cursor-pointer text-xs"
                >
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : currentUser.role === 'manager'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {(currentUser.email || currentUser.username).substring(0, 2)}
                  </div>
                  <div className="text-left hidden sm:block max-w-[150px]">
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
                        <div className="font-semibold text-white">
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
                              : t('nav.roleViewer', 'Sub-User / Viewer')}
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
                      <div className="px-3.5 py-2 flex items-center justify-between text-slate-300 border-t border-b border-slate-800/60 my-1 bg-slate-950/40">
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

                      {/* User Management shortcut (if privileged) */}
                      {canManageUsers && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onSelectTab('users');
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
        </div>
      </div>

      {/* Mobile Nav Tabs */}
      <div className="lg:hidden flex overflow-x-auto border-t border-slate-800 px-4 py-2 gap-1 bg-slate-950">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`whitespace-nowrap px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400'
            }`}
          >
            {tab.id === 'users' && <Users className="w-3 h-3" />}
            {tab.id === 'reports' && <FileText className="w-3 h-3" />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
