import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  Eye,
  X,
  Search,
  Trash2,
  Edit2,
  AlertCircle,
  Globe,
  CheckCircle
} from 'lucide-react';
import {
  fetchUsers,
  fetchAssignableDomains,
  createUser,
  updateUser,
  deleteUser
} from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

export default function UserManagement({ currentUser }) {
  const { language, t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [assignableDomains, setAssignableDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = creating, object = editing
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formOrgName, setFormOrgName] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formLanguage, setFormLanguage] = useState('en');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('viewer');
  const [formDomains, setFormDomains] = useState([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [domainSearchFilter, setDomainSearchFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [usersData, domainsData] = await Promise.all([
        fetchUsers(),
        fetchAssignableDomains()
      ]);
      setUsers(usersData || []);
      setAssignableDomains(domainsData || []);
    } catch (err) {
      console.error('Failed to load user management data:', err);
      setError(err.message || 'Failed to load user records.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormUsername('');
    setFormEmail('');
    setFormOrgName('');
    setFormLogoUrl('');
    setFormLanguage('en');
    setFormPassword('');
    setFormRole(isManager ? 'viewer' : 'manager');
    // If manager, default domains to manager's first domain or empty
    setFormDomains([]);
    setFormIsActive(true);
    setDomainSearchFilter('');
    setIsModalOpen(true);
  }

  function openEditModal(u) {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormEmail(u.email || '');
    setFormOrgName(u.organization_name || '');
    setFormLogoUrl(u.logo_url || '');
    setFormLanguage(u.language || 'en');
    setFormPassword(''); // blank means do not change
    setFormRole(u.role);
    setFormDomains(u.domains || []);
    setFormIsActive(u.is_active);
    setDomainSearchFilter('');
    setIsModalOpen(true);
  }

  function toggleDomainSelection(domain) {
    const dLower = domain.toLowerCase();
    if (formDomains.includes(dLower)) {
      setFormDomains(formDomains.filter((d) => d !== dLower));
    } else {
      setFormDomains([...formDomains, dLower]);
    }
  }

  function selectAllDomains() {
    setFormDomains(assignableDomains.map((d) => d.toLowerCase()));
  }

  function clearAllDomains() {
    setFormDomains([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const cleanEmail = formEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        throw new Error('Please enter a valid email address.');
      }

      if (editingUser) {
        // Updating user
        const payload = {
          email: cleanEmail,
          username: formUsername.trim() || cleanEmail.split('@')[0],
          organization_name: formOrgName.trim(),
          logo_url: formLogoUrl.trim(),
          language: formLanguage,
          isActive: formIsActive,
          domains: formDomains
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }
        if (isAdmin) {
          payload.role = formRole;
        }

        await updateUser(editingUser.id, payload);
        setSuccessMsg(`User "${cleanEmail}" successfully updated.`);
      } else {
        // Creating new user
        if (!formPassword.trim() || formPassword.trim().length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        const payload = {
          email: cleanEmail,
          username: formUsername.trim() || cleanEmail.split('@')[0],
          organization_name: formOrgName.trim(),
          logo_url: formLogoUrl.trim(),
          password: formPassword.trim(),
          language: formLanguage,
          role: isManager ? 'viewer' : formRole,
          domains: formDomains
        };

        await createUser(payload);
        setSuccessMsg(`User "${cleanEmail}" created successfully!`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirmUser) return;
    try {
      await deleteUser(deleteConfirmUser.id);
      setSuccessMsg(`User "${deleteConfirmUser.username}" deleted.`);
      setDeleteConfirmUser(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    }
  }

  // Filter assignable domains list in modal
  const filteredAssignableDomains = assignableDomains.filter((d) =>
    d.toLowerCase().includes(domainSearchFilter.toLowerCase().trim())
  );

  // Statistics
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const managerCount = users.filter((u) => u.role === 'manager').length;
  const viewerCount = users.filter((u) => u.role === 'viewer').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {t('users.title', 'Access Control & User Management')}
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {isAdmin ? 'Super Admin Mode' : 'Manager Delegation Mode'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('users.subtitle', 'Delegate role-based administrative and reporting access to domains and organizations.')}
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-create-user"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition-all duration-200 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isManager ? 'Create Sub-User' : t('users.createUserBtn', 'Create New User')}</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="glass-panel border-rose-500/30 bg-rose-500/10 p-4 rounded-xl flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="glass-panel border-emerald-500/30 bg-emerald-500/10 p-4 rounded-xl flex items-center justify-between text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Visible Accounts</span>
          <div className="text-2xl font-bold text-white mt-1">{totalUsers}</div>
        </div>

        {isAdmin && (
          <>
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-purple-400 font-medium">Super Admins</span>
              <div className="text-2xl font-bold text-purple-300 mt-1">{adminCount}</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-cyan-400 font-medium">Managers</span>
              <div className="text-2xl font-bold text-cyan-300 mt-1">{managerCount}</div>
            </div>
          </>
        )}

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-emerald-400 font-medium">
            {isManager ? 'Your Sub-Users' : 'Sub-Users / Viewers'}
          </span>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{viewerCount}</div>
        </div>

        {isManager && (
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-cyan-400 font-medium">Your Delegated Domains</span>
            <div className="text-2xl font-bold text-cyan-300 mt-1">
              {currentUser?.domains?.length || 0}
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>User Accounts & Privileges</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 font-mono">
              {users.length}
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800/80">
                <th className="py-3 px-4 font-semibold">{t('users.colUser', 'User')}</th>
                <th className="py-3 px-4 font-semibold">{t('users.colRole', 'Role')}</th>
                <th className="py-3 px-4 font-semibold">{t('users.colLanguage', 'Language')}</th>
                <th className="py-3 px-4 font-semibold">{t('users.colDomains', 'Assigned Domains Scope')}</th>
                <th className="py-3 px-4 font-semibold">Created By</th>
                <th className="py-3 px-4 font-semibold">{t('users.colStatus', 'Status')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No users found. Click &quot;Add New User&quot; above to create one.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition">
                      {/* User Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : u.role === 'manager'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {(u.email || u.username).substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-xs">
                              <span>{u.email || u.username}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 text-[10px] bg-cyan-500/20 text-cyan-300 rounded font-normal font-sans">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-500">@{u.username}</span>
                              {u.organization_name && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  {u.organization_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <Shield className="w-3 h-3 text-purple-400" />
                            Super Admin
                          </span>
                        )}
                        {u.role === 'manager' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <Briefcase className="w-3 h-3 text-cyan-400" />
                            Manager
                          </span>
                        )}
                        {u.role === 'viewer' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Eye className="w-3 h-3 text-emerald-400" />
                            Sub-User / Viewer
                          </span>
                        )}
                      </td>

                      {/* Language Column */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span>{u.language === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</span>
                        </span>
                      </td>

                      {/* Domain Scope Column */}
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                            <Globe className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Unrestricted (All Domains *)</span>
                          </div>
                        ) : !u.domains || u.domains.length === 0 ? (
                          <span className="text-amber-400/90 italic text-[11px]">
                            No domains assigned (Blocked)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {u.domains.slice(0, 3).map((dom) => (
                              <span
                                key={dom}
                                className="px-2 py-0.5 rounded text-[11px] bg-slate-900 border border-slate-700/80 text-cyan-300 font-mono"
                              >
                                {dom}
                              </span>
                            ))}
                            {u.domains.length > 3 && (
                              <span
                                title={u.domains.slice(3).join(', ')}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-semibold cursor-help"
                              >
                                +{u.domains.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Created By Column */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {u.parent_username ? (
                          <span className="text-slate-300">@{u.parent_username}</span>
                        ) : (
                          <span className="text-slate-600">System Root</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.is_active ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            title="Edit user and domain access"
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              title="Delete user"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Create / Edit User Modal */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {editingUser ? <Edit2 className="w-4 h-4 text-cyan-400" /> : <UserPlus className="w-4 h-4 text-cyan-400" />}
                <span>
                  {editingUser ? `Edit User: ${editingUser.username}` : isManager ? 'Create New Sub-User' : 'Add New User'}
                </span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Email Address - Primary Identifier */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. user@company.com"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 text-slate-100 text-xs rounded-xl px-3.5 py-2 focus:outline-none"
                />
              </div>

              {/* User Logon / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  User Logon / Username <span className="text-slate-500 font-normal">(author name on reports)</span>
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 text-slate-100 text-xs rounded-xl px-3.5 py-2 focus:outline-none"
                />
              </div>

              {/* Organization / Company Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Organization / Client Name <span className="text-cyan-400 font-normal">(shown on branded reports)</span>
                </label>
                <input
                  type="text"
                  value={formOrgName}
                  onChange={(e) => setFormOrgName(e.target.value)}
                  placeholder="e.g. Acme Corporation, Voxera Defense"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 text-slate-100 text-xs rounded-xl px-3.5 py-2 focus:outline-none"
                />
              </div>

              {/* Organization Logo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Organization Logo <span className="text-slate-500 font-normal">(image URL, data URI, or path)</span>
                </label>
                <input
                  type="text"
                  value={formLogoUrl}
                  onChange={(e) => setFormLogoUrl(e.target.value)}
                  placeholder="e.g. templates/assets/sentinel_logo.png or https://.../logo.png"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 text-slate-100 text-xs rounded-xl px-3.5 py-2 focus:outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editingUser ? 'New Password (leave blank to keep unchanged)' : 'Password'} {!editingUser && <span className="text-rose-400">*</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 text-slate-100 text-xs rounded-xl px-3.5 py-2 focus:outline-none"
                />
              </div>

              {/* Role Selection */}
              {isAdmin ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    System Role <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormRole('admin')}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                        formRole === 'admin'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Admin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormRole('manager')}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                        formRole === 'manager'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 text-cyan-400" />
                      <span>Manager</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormRole('viewer')}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                        formRole === 'viewer'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Viewer</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {formRole === 'admin' && 'Admins have full visibility across all domains and can manage all users.'}
                    {formRole === 'manager' && 'Managers can access their assigned domains and can create/delegate sub-users.'}
                    {formRole === 'viewer' && 'Viewers have read-only access to their assigned domains and cannot create users.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Role: Sub-User (Viewer)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    As a Manager, new users created under your account are designated as sub-users and inherit access only to the domains you select below.
                  </p>
                </div>
              )}

              {/* Preferred Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('users.langField', 'Preferred Language / Idioma')}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormLanguage('en')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
                      formLanguage === 'en'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span>English</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormLanguage('es')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
                      formLanguage === 'es'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>🇪🇸</span>
                    <span>Español</span>
                  </button>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200">Account Active</span>
                  <p className="text-[11px] text-slate-500">Deactivated users cannot authenticate or query the API</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Domain Permissions Section (Only relevant for manager / viewer) */}
              {formRole !== 'admin' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Assigned Allowed Domains ({formDomains.length})</span>
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={selectAllDomains}
                        className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">&bull;</span>
                      <button
                        type="button"
                        onClick={clearAllDomains}
                        className="text-slate-400 hover:text-slate-300 font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search box for domains */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={domainSearchFilter}
                      onChange={(e) => setDomainSearchFilter(e.target.value)}
                      placeholder="Filter available domains..."
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Selected Domain Tag Cloud */}
                  {formDomains.length > 0 && (
                    <div className="flex flex-wrap gap-1 p-2 bg-slate-900/50 border border-slate-800 rounded-xl max-h-24 overflow-y-auto">
                      {formDomains.map((dom) => (
                        <span
                          key={dom}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono"
                        >
                          {dom}
                          <button
                            type="button"
                            onClick={() => toggleDomainSelection(dom)}
                            className="hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Available Domains Checkbox List */}
                  <div className="border border-slate-800 rounded-xl bg-slate-900/70 max-h-48 overflow-y-auto divide-y divide-slate-800/60">
                    {filteredAssignableDomains.length === 0 ? (
                      <div className="p-3 text-center text-[11px] text-slate-500">
                        {domainSearchFilter ? 'No matching domains found.' : 'No assignable domains available.'}
                      </div>
                    ) : (
                      filteredAssignableDomains.map((dom) => {
                        const isSelected = formDomains.includes(dom.toLowerCase());
                        return (
                          <label
                            key={dom}
                            className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-800/40 cursor-pointer transition text-xs"
                          >
                            <span className="font-mono text-slate-300">{dom}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDomainSelection(dom)}
                              className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900 h-4 w-4"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Delete Confirmation Modal */}
      {/* ======================================================== */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-rose-500/30 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Delete User Account</h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete user{' '}
              <strong className="text-white">@{deleteConfirmUser.username}</strong>? This action will permanently revoke their access credentials and domain permissions.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
