import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Image,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Mail,
  Lock
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { updateProfile } from '../services/api';

export default function UserProfileModal({ isOpen, onClose, currentUser, onUserUpdated, onChangePasswordClick }) {
  const { language, setLanguage, t } = useLanguage();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [orgName, setOrgName] = useState(currentUser?.organization_name || '');
  const [logoUrl, setLogoUrl] = useState(currentUser?.logo_url || '');
  const [selectedLang, setSelectedLang] = useState(currentUser?.language || language || 'en');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setOrgName(currentUser.organization_name || '');
      setLogoUrl(currentUser.logo_url || '');
      setSelectedLang(currentUser.language || language || 'en');
    }
  }, [currentUser, language]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const res = await updateProfile({
        username: username.trim(),
        organization_name: orgName.trim(),
        logo_url: logoUrl.trim(),
        language: selectedLang
      });

      if (res && res.user) {
        if (onUserUpdated) onUserUpdated(res.user);
      }
      // Apply language immediately
      setLanguage(selectedLang, false);

      setStatus({
        type: 'success',
        message: t('profileModal.successMsg', 'Profile and preferences successfully saved!')
      });

      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 1200);
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || t('profileModal.errorMsg', 'Failed to update user profile.')
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-950 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {t('profileModal.title', 'User Profile & Preferences')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('profileModal.subtitle', 'Manage your account logon, organization identity, and system language')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status notification */}
        {status && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
              status.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {/* Account Info Read-only Badge */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm">
              {(currentUser?.email || currentUser?.username || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 capitalize">
                  {currentUser?.role || 'viewer'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {currentUser?.domains?.length > 0
                    ? `${currentUser.domains.length} ${t('common.domain', 'domain')}(s)`
                    : t('nav.allDomains', 'All Domains')}
                </span>
              </div>
            </div>
          </div>

          {onChangePasswordClick && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onChangePasswordClick();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('nav.changePassword', 'Change Password')}</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Language Selection Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              {t('profileModal.languageLabel', 'System Language / Idioma')}
            </label>
            <p className="text-[11px] text-slate-400">
              {t('profileModal.languageHelp', 'Select your preferred language for the console interface and generated reports.')}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div
                onClick={() => setSelectedLang('en')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center gap-3 ${
                  selectedLang === 'en'
                    ? 'bg-cyan-950/30 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-xl">🇺🇸</span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    English
                    {selectedLang === 'en' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400">United States / Global</div>
                </div>
              </div>

              <div
                onClick={() => setSelectedLang('es')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center gap-3 ${
                  selectedLang === 'es'
                    ? 'bg-cyan-950/30 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-xl">🇪🇸</span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    Español
                    {selectedLang === 'es' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400">España / Latinoamérica</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 my-4" />

          {/* User Logon / Author Name */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              {t('profileModal.logonLabel', 'User Logon / Username')}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or security.analyst"
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {t('profileModal.logonHelp', 'Your identity as author in executive reports and system audit logs.')}
            </p>
          </div>

          {/* Organization / Client Name */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              {t('profileModal.orgLabel', 'Organization / Client Name')}
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Voxera Global Defense, Acme Corp"
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {t('profileModal.orgHelp', 'Corporate or client entity displayed on branded report covers.')}
            </p>
          </div>

          {/* Organization Logo */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-cyan-400" />
              {t('profileModal.logoLabel', 'Corporate Logo URL or Path')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="templates/assets/sentinel_logo.png or https://..."
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition"
              />
              {logoUrl && (
                <div className="w-10 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {t('profileModal.logoHelp', 'E.g. templates/assets/sentinel_logo.png or http://...')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t('profileModal.savingBtn', 'Saving Preferences...') : t('profileModal.saveBtn', 'Save Profile & Preferences')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
