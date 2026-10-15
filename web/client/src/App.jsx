import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import KPIGrid from './components/KPIGrid';
import AlignmentCharts from './components/AlignmentCharts';
import VolumeTrends from './components/VolumeTrends';
import TrafficAndSenders from './components/TrafficAndSenders';
import ThreatIntelligence from './components/ThreatIntelligence';
import PolicyReadiness from './components/PolicyReadiness';
import RawLogExplorer from './components/RawLogExplorer';
import DomainHealth from './components/DomainHealth';
import UserManagement from './components/UserManagement';
import ReportsDashboard from './components/ReportsDashboard';
import AlertsDashboard from './components/AlertsDashboard';
import EmailSettings from './components/EmailSettings';
import ThemeManager from './components/ThemeManager';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import UserProfileModal from './components/UserProfileModal';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { ThemeProvider } from './theme/ThemeContext';
import {
  fetchMe,
  clearToken,
  fetchFilters,
  fetchOverview,
  fetchAlignment,
  fetchTimeseries,
  fetchTraffic,
  fetchThreats,
  fetchPolicies
} from './services/api';
import { AlertCircle, RefreshCw, Shield } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Dashboard error caught by boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl glass-panel">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Display Error Encountered</h3>
            <p className="text-xs text-slate-400 mb-4">
              An unexpected interface error occurred. Please click below to reload or reset your view.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-cyan-950/50"
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function DashboardApp({ currentUser, setCurrentUser, onLogout }) {
  const { t } = useLanguage();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('all');

  const [overview, setOverview] = useState(null);
  const [alignment, setAlignment] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [traffic, setTraffic] = useState(null);
  const [threats, setThreats] = useState(null);
  const [policies, setPolicies] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // When currentUser changes / is authenticated, load filters and data
  useEffect(() => {
    if (currentUser) {
      initFilters();
    }
  }, [currentUser]);

  async function initFilters() {
    try {
      const filterData = await fetchFilters();
      const doms = filterData.domains || [];
      setDomains(doms);

      // If user has specific domain restrictions and selectedDomain is not in list
      if (doms.length > 0 && currentUser.role !== 'admin') {
        setSelectedDomain(doms[0]);
      } else {
        setSelectedDomain('all');
      }
    } catch (err) {
      console.error('Filter error:', err);
    }
  }

  // Fetch metrics whenever selectedDomain changes
  useEffect(() => {
    if (currentUser && !['users', 'smtp', 'alerts', 'themes'].includes(activeTab)) {
      loadDashboardData();
    }
  }, [selectedDomain, currentUser]);

  async function loadDashboardData() {
    if (!currentUser || ['users', 'smtp', 'alerts', 'themes'].includes(activeTab)) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedDomain && selectedDomain !== 'all') {
        params.domain = selectedDomain;
      }

      const [
        overviewRes,
        alignmentRes,
        timeseriesRes,
        trafficRes,
        threatsRes,
        policiesRes
      ] = await Promise.all([
        fetchOverview(params),
        fetchAlignment(params),
        fetchTimeseries(params),
        fetchTraffic(params),
        fetchThreats(params),
        fetchPolicies()
      ]);

      setOverview(overviewRes);
      setAlignment(alignmentRes);
      setTimeseries(timeseriesRes);
      setTraffic(trafficRes);
      setThreats(threatsRes);
      setPolicies(policiesRes);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load DMARC metrics from OpenSearch.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Left Sidebar Navigation (Horizontal item rows on the left) */}
      <Sidebar
        domains={domains}
        selectedDomain={selectedDomain}
        onSelectDomain={setSelectedDomain}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={loadDashboardData}
        isLoading={loading}
        currentUser={currentUser}
        onLogout={onLogout}
        onChangePasswordClick={() => setIsPasswordModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area on the Right */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 xl:pl-72 min-h-screen">
        {/* Top Header Bar */}
        <TopBar
          domains={domains}
          selectedDomain={selectedDomain}
          onSelectDomain={setSelectedDomain}
          activeTab={activeTab}
          onRefresh={loadDashboardData}
          isLoading={loading}
          currentUser={currentUser}
          onLogout={onLogout}
          onChangePasswordClick={() => setIsPasswordModalOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="glass-panel border-rose-500/30 bg-rose-500/10 p-4 rounded-2xl flex items-center justify-between text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-200 font-medium transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Global KPI Cards (shown on log analytics tabs, hidden on health, reports & user management) */}
        {activeTab !== 'health' && activeTab !== 'users' && activeTab !== 'reports' && activeTab !== 'themes' && (
          <section aria-label="Executive Overview Metrics">
            <KPIGrid overview={overview} />
          </section>
        )}

        {/* Dynamic Tab Views */}
        {activeTab === 'users' ? (
          <UserManagement currentUser={currentUser} />
        ) : activeTab === 'health' ? (
          <DomainHealth
            selectedDomain={selectedDomain}
            onSelectDomain={setSelectedDomain}
            domains={domains}
            currentUser={currentUser}
          />
        ) : activeTab === 'alerts' ? (
          <AlertsDashboard
            currentUser={currentUser}
            domains={domains}
          />
        ) : activeTab === 'smtp' ? (
          <EmailSettings
            currentUser={currentUser}
          />
        ) : activeTab === 'themes' ? (
          <ThemeManager
            currentUser={currentUser}
          />
        ) : activeTab === 'reports' ? (
          <ReportsDashboard
            domains={domains}
            selectedDomain={selectedDomain}
            onSelectDomain={setSelectedDomain}
            currentUser={currentUser}
          />
        ) : loading && !overview ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
            <p className="text-sm">Fetching real-time DMARC aggregates from OpenSearch...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeTab === 'overview' && (
              <>
                <VolumeTrends timeseries={timeseries} />
                <AlignmentCharts alignment={alignment} />
                <TrafficAndSenders traffic={traffic} />
              </>
            )}

            {activeTab === 'alignment' && (
              <>
                <AlignmentCharts alignment={alignment} />
                <VolumeTrends timeseries={timeseries} />
              </>
            )}

            {activeTab === 'threats' && (
              <>
                <ThreatIntelligence threats={threats} />
              </>
            )}

            {activeTab === 'policies' && (
              <>
                <PolicyReadiness policies={policies} />
              </>
            )}

            {activeTab === 'records' && (
              <>
                <RawLogExplorer selectedDomain={selectedDomain} />
              </>
            )}
          </div>
        )}
      </main>

      {/* Cyber Security Footer */}
      <footer className="glass-panel border-t border-slate-900 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-500" />
            <span className="font-semibold text-slate-400">DMARC Sentinel</span>
            <span>&bull;</span>
            <span>{t('nav.tagline', 'Enterprise Email Authentication & Access Control')}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-slate-400">
              Logged in as: <strong className="text-slate-200">{currentUser.email || `@${currentUser.username}`}</strong> ({currentUser.role})
            </span>
            <span>&bull;</span>
            <span className="text-slate-400">RFC 7489 Compliant</span>
          </div>
        </div>
      </footer>
    </div>

    {/* Modals */}
    <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={setCurrentUser}
        onChangePasswordClick={() => setIsPasswordModalOpen(true)}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Check auth on initial mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await fetchMe();
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    }

    checkAuth();

    // Listen to global logout event
    function handleLogoutEvent() {
      setCurrentUser(null);
    }
    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  function handleLogout() {
    clearToken();
    setCurrentUser(null);
  }

  function handleLoginSuccess(user) {
    setCurrentUser(user);
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-xs text-slate-500 font-mono">Initializing DMARC Sentinel Security Engine...</p>
      </div>
    );
  }

  return (
    <ThemeProvider currentUser={currentUser} onUserUpdated={setCurrentUser}>
      <LanguageProvider currentUser={currentUser} onUserUpdated={setCurrentUser}>
        {!currentUser ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          <ErrorBoundary>
            <DashboardApp
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              onLogout={handleLogout}
            />
          </ErrorBoundary>
        )}
      </LanguageProvider>
    </ThemeProvider>
  );
}
