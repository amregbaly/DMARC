import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  PieChart,
  Building2,
  Network,
  Globe2,
  Flag,
  LayoutDashboard,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Sliders,
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  Radio,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Sparkles,
  Calendar
} from 'lucide-react';
import { fetchAggregateViews, exportAggregateTab } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import GeoLocationMap from './GeoLocationMap';

// Helper for country flags
function getCountryFlag(countryCode) {
  if (!countryCode || countryCode === 'Unknown' || countryCode === '—') return '🌐';
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '🌐';
  const offset = 127397;
  return String.fromCodePoint(...[...code].map((c) => c.charCodeAt(0) + offset));
}

// -------------------------------------------------------------
// DonutGauge: Circular compliance gauge
// -------------------------------------------------------------
export function DonutGauge({ rate = 100, size = 52, strokeWidth = 5, label = null }) {
  const cleanRate = Math.min(100, Math.max(0, Number(rate) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (cleanRate / 100) * circumference;

  let color = '#10b981'; // emerald
  if (cleanRate < 70) color = '#ef4444'; // red
  else if (cleanRate < 95) color = '#f59e0b'; // amber

  return (
    <div className="flex flex-col items-center justify-center inline-flex">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-[11px] font-black text-white font-mono leading-none">
            {Math.round(cleanRate)}%
          </span>
        </div>
      </div>
      {label && <span className="text-[10px] text-slate-400 mt-1 font-medium">{label}</span>}
    </div>
  );
}

// -------------------------------------------------------------
// SplitProgressBar: Stacked Verification Bar (DKIM / SPF)
// -------------------------------------------------------------
export function SplitProgressBar({ title, passRate = 100, totalVolume = 0, passedVolume = 0 }) {
  const { t } = useLanguage();
  const rate = Math.min(100, Math.max(0, Number(passRate) || 0));
  const failRate = Number((100 - rate).toFixed(1));

  return (
    <div className="w-full min-w-[130px] space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400 font-medium">{title}</span>
        <span className="font-mono font-bold text-white">{rate}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800/80 overflow-hidden flex">
        <div
          style={{ width: `${rate}%` }}
          className="bg-emerald-500 h-full transition-all duration-500"
          title={`${t('reports.aligned', 'Aligned')}: ${rate}%`}
        />
        <div
          style={{ width: `${failRate}%` }}
          className="bg-rose-500/80 h-full transition-all duration-500"
          title={`${t('reports.unaligned', 'Unaligned')}: ${failRate}%`}
        />
      </div>
      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
        <span className="text-emerald-400/90">{rate}% {t('common.pass', 'PASS')}</span>
        {failRate > 0 && <span className="text-rose-400/90">{failRate}% {t('common.fail', 'FAIL')}</span>}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN COMPONENT: DMARC Aggregate Reports Suite
// -------------------------------------------------------------
export default function AggregateReportsView({
  domains = [],
  selectedDomain,
  currentUser,
  onSwitchToGenerate
}) {
  const { language, t } = useLanguage();

  const getCategoryTagLabel = (tag) => {
    if (tag === 'DMARC compatible sources') return t('reports.dmarcCompatibleSources', 'DMARC compatible sources');
    if (tag === 'Forwarded') return t('reports.forwardedSources', 'Forwarded');
    if (tag === 'Failed') return t('reports.failedSources', 'Failed');
    return tag;
  };

  const getResultGroupTitle = (title) => {
    if (!title) return '';
    if (title.includes('correct')) return t('reports.resultGroupCorrect', 'DMARC correct - DKIM or SPF aligned');
    if (title.includes('Authenticated')) return t('reports.resultGroupAuthenticated', 'Authenticated - DKIM or SPF valid');
    if (title.includes('Invalid')) return t('reports.resultGroupInvalid', 'Invalid flows - DKIM and SPF invalid');
    return title;
  };

  const getSubItemName = (name) => {
    const map = {
      'SPF aligned': t('reports.subItemSpfAligned', 'SPF aligned'),
      'DKIM aligned': t('reports.subItemDkimAligned', 'DKIM aligned'),
      'DKIM forwarded': t('reports.subItemDkimForwarded', 'DKIM forwarded'),
      'Fully aligned': t('reports.subItemFullyAligned', 'Fully aligned'),
      'Fully aligned forwarded': t('reports.subItemFullyAlignedForwarded', 'Fully aligned forwarded'),
      'SPF validated not aligned': t('reports.subItemSpfValidNotAligned', 'SPF validated not aligned'),
      'DKIM validated not aligned': t('reports.subItemDkimValidNotAligned', 'DKIM validated not aligned'),
      'DKIM/SPF failed': t('reports.subItemDkimSpfFailed', 'DKIM/SPF failed'),
      'Failed forwarded': t('reports.subItemFailedForwarded', 'Failed forwarded')
    };
    return map[name] || name;
  };

  // 7 Aggregate subviews:
  // 'per_source' | 'per_result' | 'per_org' | 'per_host' | 'detailed' | 'geolocation' | 'per_country'
  const [subView, setSubView] = useState('per_source');
  const [domainFilter, setDomainFilter] = useState(selectedDomain || 'all');
  const [timePreset, setTimePreset] = useState('30d'); // '7d' | '30d' | '90d' | 'all' | 'custom'
  const [customDateFrom, setCustomDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customDateTo, setCustomDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [hostnameSearch, setHostnameSearch] = useState('');
  const [ipSearch, setIpSearch] = useState('');
  const [sourceCategoryFilter, setSourceCategoryFilter] = useState('all');
  const [expandedSources, setExpandedSources] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [exportingFormat, setExportingFormat] = useState(null); // 'pdf' | 'xlsx' | null
  const [exportMessage, setExportMessage] = useState(null);

  useEffect(() => {
    if (selectedDomain) {
      setDomainFilter(selectedDomain);
    }
  }, [selectedDomain]);

  useEffect(() => {
    loadData();
  }, [domainFilter, timePreset]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      let dateFrom = null;
      let dateTo = null;
      const now = new Date();
      if (timePreset === '7d') {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        dateFrom = d.toISOString();
      } else if (timePreset === '30d') {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        dateFrom = d.toISOString();
      } else if (timePreset === '90d') {
        const d = new Date();
        d.setDate(now.getDate() - 90);
        dateFrom = d.toISOString();
      } else if (timePreset === 'custom') {
        if (customDateFrom) {
          dateFrom = new Date(`${customDateFrom}T00:00:00`).toISOString();
        }
        if (customDateTo) {
          dateTo = new Date(`${customDateTo}T23:59:59.999`).toISOString();
        }
      }

      const params = {
        domain: domainFilter
      };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await fetchAggregateViews(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load aggregate views:', err);
      setError(err.message || 'Failed to fetch aggregate analytics from OpenSearch');
    } finally {
      setLoading(false);
    }
  }

  const toggleSourceExpand = (sourceName) => {
    setExpandedSources((prev) => ({
      ...prev,
      [sourceName]: !prev[sourceName]
    }));
  };

  const summary = data?.summary || {
    totalVolume: 0,
    passedVolume: 0,
    failedVolume: 0,
    compliantVolume: 0,
    nonCompliantVolume: 0,
    forwardedVolume: 0,
    threatVolume: 0,
    complianceRate: 100
  };

  const sources = data?.sources || [];
  const organizations = data?.organizations || [];
  const hosts = data?.hosts || [];
  const countries = data?.countries || [];
  const detailedHits = data?.detailedHits || [];
  const geoPoints = data?.geoPoints || [];
  const timeline = data?.timeline || [];
  const perResultGroups = data?.perResultGroups || null;

  // Filtered Sources based on search & category
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (sourceCategoryFilter !== 'all' && s.categoryTag !== sourceCategoryFilter) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (s.sourceName && s.sourceName.toLowerCase().includes(q)) ||
        (s.baseDomain && s.baseDomain.toLowerCase().includes(q)) ||
        (s.asName && s.asName.toLowerCase().includes(q))
      );
    });
  }, [sources, searchQuery, sourceCategoryFilter]);

  // Source Categories summary counts
  const sourceStats = useMemo(() => {
    let dmarcCompatibleCount = 0;
    let dmarcCompatibleVol = 0;
    let forwardedCount = 0;
    let forwardedVol = 0;
    let failedCount = 0;
    let failedVol = 0;

    sources.forEach((s) => {
      if (s.categoryTag === 'DMARC compatible sources') {
        dmarcCompatibleCount++;
        dmarcCompatibleVol += s.totalVolume;
      } else if (s.categoryTag === 'Forwarded') {
        forwardedCount++;
        forwardedVol += s.totalVolume;
      } else {
        failedCount++;
        failedVol += s.totalVolume;
      }
    });

    return {
      compatible: { count: dmarcCompatibleCount, volume: dmarcCompatibleVol },
      forwarded: { count: forwardedCount, volume: forwardedVol },
      failed: { count: failedCount, volume: failedVol }
    };
  }, [sources]);

  // Filtered Orgs
  const filteredOrgs = useMemo(() => {
    if (!searchQuery) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter((o) => o.orgName && o.orgName.toLowerCase().includes(q));
  }, [organizations, searchQuery]);

  // Filtered Hosts
  const filteredHosts = useMemo(() => {
    if (!searchQuery) return hosts;
    const q = searchQuery.toLowerCase();
    return hosts.filter(
      (h) =>
        (h.ip && h.ip.toLowerCase().includes(q)) ||
        (h.ptr && h.ptr.toLowerCase().includes(q)) ||
        (h.country && h.country.toLowerCase().includes(q)) ||
        (h.asName && h.asName.toLowerCase().includes(q))
    );
  }, [hosts, searchQuery]);

  // Filtered Detailed Hits
  const filteredDetailedHits = useMemo(() => {
    return detailedHits.filter((item) => {
      if (hostnameSearch) {
        const hq = hostnameSearch.toLowerCase();
        if (!item.hostname || !item.hostname.toLowerCase().includes(hq)) return false;
      }
      if (ipSearch) {
        const iq = ipSearch.toLowerCase();
        if (!item.ip || !item.ip.toLowerCase().includes(iq)) return false;
      }
      return true;
    });
  }, [detailedHits, hostnameSearch, ipSearch]);

  // 7 Aggregate sub-navigation tabs
  const subNavItems = [
    { id: 'per_source', label: t('reports.viewPerSource', 'Per Sending Source'), icon: Server, count: sources.length },
    { id: 'per_result', label: t('reports.viewPerResult', 'Per Result'), icon: PieChart },
    { id: 'per_org', label: t('reports.viewPerOrg', 'Per Organization'), icon: Building2, count: organizations.length },
    { id: 'per_host', label: t('reports.viewPerHost', 'Per Host'), icon: Network, count: hosts.length },
    { id: 'detailed', label: t('reports.viewDetailed', 'Detailed Stats'), icon: Sliders, count: detailedHits.length },
    { id: 'geolocation', label: t('reports.viewGeolocation', 'Geolocation Report'), icon: Globe2, count: geoPoints.length },
    { id: 'per_country', label: t('reports.viewPerCountry', 'Per Country'), icon: Flag, count: countries.length }
  ];

  // -------------------------------------------------------------
  // Dynamic Tab Export Handler (PDF & Excel)
  // -------------------------------------------------------------
  const handleExportTab = async (format) => {
    if (exportingFormat) return;
    setExportingFormat(format);
    setExportMessage(null);

    try {
      let timeWindow = 'Last 30 Days';
      if (timePreset === '7d') timeWindow = 'Last 7 Days';
      else if (timePreset === '90d') timeWindow = 'Last 90 Days';
      else if (timePreset === 'all') timeWindow = 'All Available Time';
      else if (timePreset === 'custom') timeWindow = `Custom (${customDateFrom || ''} to ${customDateTo || ''})`;

      let tabTitle = t('reports.viewPerSource', 'Per Sending Source');
      let columns = [];
      let rows = [];
      let stats = [];
      let extra = {};

      if (subView === 'per_source') {
        tabTitle = t('reports.viewPerSource', 'Per Sending Source');
        columns = [
          { key: 'sourceName', label: t('reports.colSendingSource', 'Sending Source'), align: 'left', format: 'text' },
          { key: 'baseDomain', label: 'Base Domain / ASN', align: 'left', format: 'text' },
          { key: 'categoryTag', label: t('reports.colSourceType', 'Source Type'), align: 'center', format: 'text' },
          { key: 'totalVolume', label: t('reports.colMessages', 'Messages'), align: 'right', format: 'number' },
          { key: 'complianceRate', label: t('reports.colDmarcCompliance', 'DMARC Compliance'), align: 'center', format: 'percentage' },
          { key: 'dkimRate', label: t('reports.colDkimVerification', 'DKIM Verification'), align: 'center', format: 'percentage' },
          { key: 'spfRate', label: t('reports.colSpfVerification', 'SPF Verification'), align: 'center', format: 'percentage' },
          { key: 'hostsCount', label: 'Sending Hosts', align: 'right', format: 'number' }
        ];
        rows = filteredSources.map((s) => ({
          sourceName: s.sourceName,
          baseDomain: s.baseDomain || s.asName || 'Direct Server',
          categoryTag: s.categoryTag,
          totalVolume: s.totalVolume,
          complianceRate: s.complianceRate,
          dkimRate: s.dkimRate,
          spfRate: s.spfRate,
          hostsCount: s.hosts?.length || 0
        }));
        stats = [
          { label: t('reports.dmarcCompatibleSources', 'DMARC compatible sources'), count: sourceStats.compatible.count, volume: sourceStats.compatible.volume },
          { label: t('reports.forwardedSources', 'Forwarded'), count: sourceStats.forwarded.count, volume: sourceStats.forwarded.volume },
          { label: t('reports.failedSources', 'Failed'), count: sourceStats.failed.count, volume: sourceStats.failed.volume }
        ];
      } else if (subView === 'per_result') {
        tabTitle = t('reports.viewPerResult', 'Per Result');
        columns = [
          { key: 'groupTitle', label: 'Result Group', align: 'left', format: 'text' },
          { key: 'name', label: 'Authentication Flow', align: 'left', format: 'text' },
          { key: 'count', label: t('reports.colMessages', 'Messages'), align: 'right', format: 'number' },
          { key: 'pct', label: 'Flow Percentage', align: 'center', format: 'percentage' },
          { key: 'dmarcStatus', label: 'DMARC Alignment', align: 'center', format: 'text' },
          { key: 'spfStatus', label: 'SPF Status', align: 'center', format: 'text' },
          { key: 'dkimStatus', label: 'DKIM Status', align: 'center', format: 'text' }
        ];
        if (perResultGroups) {
          const cItems = (perResultGroups.correctGroup?.subItems || []).map((it) => ({
            groupTitle: getResultGroupTitle(perResultGroups.correctGroup.title),
            name: getSubItemName(it.name),
            count: it.count,
            pct: it.pct,
            dmarcStatus: 'PASS',
            spfStatus: it.name.includes('SPF') || it.name.includes('Fully') ? 'PASS' : 'VALID / UNALIGNED',
            dkimStatus: it.name.includes('DKIM') || it.name.includes('Fully') ? 'PASS' : 'VALID / UNALIGNED'
          }));
          const aItems = (perResultGroups.authenticatedGroup?.subItems || []).map((it) => ({
            groupTitle: getResultGroupTitle(perResultGroups.authenticatedGroup.title),
            name: getSubItemName(it.name),
            count: it.count,
            pct: it.pct,
            dmarcStatus: 'FAIL',
            spfStatus: it.name.includes('SPF') ? 'VALID (UNALIGNED)' : 'FAIL',
            dkimStatus: it.name.includes('DKIM') ? 'VALID (UNALIGNED)' : 'FAIL'
          }));
          const iItems = (perResultGroups.invalidGroup?.subItems || []).map((it) => ({
            groupTitle: getResultGroupTitle(perResultGroups.invalidGroup.title),
            name: getSubItemName(it.name),
            count: it.count,
            pct: it.pct,
            dmarcStatus: 'FAIL',
            spfStatus: 'FAIL',
            dkimStatus: 'FAIL'
          }));
          rows = [...cItems, ...aItems, ...iItems];
          extra = { perResultGroups };
        }
      } else if (subView === 'per_org') {
        tabTitle = t('reports.viewPerOrg', 'Per Organization');
        columns = [
          { key: 'orgName', label: t('reports.colReportingOrg', 'Reporting Organization'), align: 'left', format: 'text' },
          { key: 'totalVolume', label: t('reports.colMessages', 'Messages'), align: 'right', format: 'number' },
          { key: 'uniqueIps', label: t('reports.colUniqueIps', 'Unique IPs'), align: 'center', format: 'number' },
          { key: 'complianceRate', label: t('reports.colDmarcCompliance', 'DMARC Compliance'), align: 'center', format: 'percentage' },
          { key: 'dkimRate', label: t('reports.colDkimVerification', 'DKIM Verification'), align: 'center', format: 'percentage' },
          { key: 'spfRate', label: t('reports.colSpfVerification', 'SPF Verification'), align: 'center', format: 'percentage' },
          { key: 'dispNone', label: 'Policy None (Delivered)', align: 'right', format: 'number' },
          { key: 'dispQuar', label: 'Policy Quarantine', align: 'right', format: 'number' },
          { key: 'dispRej', label: 'Policy Reject', align: 'right', format: 'number' }
        ];
        rows = filteredOrgs.map((o) => ({
          orgName: o.orgName,
          totalVolume: o.totalVolume,
          uniqueIps: o.uniqueIps,
          complianceRate: o.complianceRate,
          dkimRate: o.dkimRate,
          spfRate: o.spfRate,
          dispNone: o.dispositions?.none || 0,
          dispQuar: o.dispositions?.quarantine || 0,
          dispRej: o.dispositions?.reject || 0
        }));
      } else if (subView === 'per_host') {
        tabTitle = t('reports.viewPerHost', 'Per Host');
        columns = [
          { key: 'ptr', label: t('reports.colHostnamePtr', 'Hostname (PTR)'), align: 'left', format: 'text' },
          { key: 'ip', label: 'Sending IP Address', align: 'left', format: 'text' },
          { key: 'country', label: 'Country', align: 'center', format: 'text' },
          { key: 'asName', label: 'Autonomous System (ISP)', align: 'left', format: 'text' },
          { key: 'totalVolume', label: t('reports.colMessages', 'Messages'), align: 'right', format: 'number' },
          { key: 'complianceRate', label: t('reports.colDmarcCompliance', 'DMARC Compliance'), align: 'center', format: 'percentage' },
          { key: 'dkimRate', label: t('reports.colDkimVerification', 'DKIM Verification'), align: 'center', format: 'percentage' },
          { key: 'spfRate', label: t('reports.colSpfVerification', 'SPF Verification'), align: 'center', format: 'percentage' },
          { key: 'disposition', label: t('reports.colReceiverPolicy', 'Receiver Policy'), align: 'center', format: 'text' }
        ];
        rows = filteredHosts.map((h) => ({
          ptr: h.ptr || 'No PTR Record',
          ip: h.ip,
          country: h.country || 'Unknown',
          asName: h.asName || '—',
          totalVolume: h.totalVolume,
          complianceRate: h.complianceRate,
          dkimRate: h.dkimRate,
          spfRate: h.spfRate,
          disposition: 'p=' + (h.disposition || 'none')
        }));
      } else if (subView === 'detailed') {
        tabTitle = t('reports.viewDetailed', 'Detailed Stats');
        columns = [
          { key: 'hostname', label: t('reports.colSenderHostname', 'Sender Hostname'), align: 'left', format: 'text' },
          { key: 'ip', label: 'Sending IP Address', align: 'left', format: 'text' },
          { key: 'country', label: 'Country', align: 'center', format: 'text' },
          { key: 'org', label: t('reports.colReportingOrg', 'Reporting Org'), align: 'left', format: 'text' },
          { key: 'volume', label: t('reports.colVolume', 'Volume'), align: 'right', format: 'number' },
          { key: 'compliant', label: t('reports.colCompliant', 'Compliant'), align: 'center', format: 'boolean' },
          { key: 'dkimStatus', label: t('reports.colDkimStatus', 'DKIM Status'), align: 'center', format: 'text' },
          { key: 'dkimSelector', label: 'DKIM Selector', align: 'center', format: 'text' },
          { key: 'spfStatus', label: t('reports.colSpfStatus', 'SPF Status'), align: 'center', format: 'text' },
          { key: 'disposition', label: t('reports.colDisposition', 'Disposition'), align: 'center', format: 'text' }
        ];
        rows = filteredDetailedHits.map((h) => ({
          hostname: h.hostname || '—',
          ip: h.ip,
          country: h.country || 'Unknown',
          org: h.org,
          volume: h.volume,
          compliant: !!h.compliant,
          dkimStatus: h.dkimAligned ? 'Aligned' : 'Unaligned',
          dkimSelector: h.dkimSelector || '—',
          spfStatus: h.spfAligned ? 'Aligned' : 'Unaligned',
          disposition: 'p=' + (h.disposition || 'none')
        }));
      } else if (subView === 'geolocation') {
        tabTitle = t('reports.viewGeolocation', 'Geolocation Report');
        columns = [
          { key: 'country', label: 'Country', align: 'left', format: 'text' },
          { key: 'countryCode', label: 'ISO Code', align: 'center', format: 'text' },
          { key: 'city', label: 'City', align: 'left', format: 'text' },
          { key: 'lat', label: 'Latitude', align: 'right', format: 'text' },
          { key: 'lon', label: 'Longitude', align: 'right', format: 'text' },
          { key: 'ipCount', label: 'Sending IPs', align: 'right', format: 'number' },
          { key: 'totalVolume', label: 'Message Volume', align: 'right', format: 'number' },
          { key: 'passRate', label: 'Pass Rate', align: 'center', format: 'percentage' }
        ];
        rows = geoPoints.map((p) => ({
          country: p.country,
          countryCode: p.countryCode,
          city: p.city || '—',
          lat: p.lat,
          lon: p.lon,
          ipCount: p.ipCount,
          totalVolume: p.totalVolume,
          passRate: p.passRate
        }));
      } else if (subView === 'per_country') {
        tabTitle = t('reports.viewPerCountry', 'Per Country');
        columns = [
          { key: 'country', label: t('reports.colOriginCountry', 'Origin Country'), align: 'left', format: 'text' },
          { key: 'countryCode', label: 'ISO Code', align: 'center', format: 'text' },
          { key: 'totalVolume', label: t('reports.colMessages', 'Messages'), align: 'right', format: 'number' },
          { key: 'uniqueIps', label: t('reports.colUniqueIps', 'Unique IPs'), align: 'center', format: 'number' },
          { key: 'complianceRate', label: t('reports.colDmarcCompliance', 'DMARC Compliance'), align: 'center', format: 'percentage' },
          { key: 'dkimRate', label: t('reports.colDkimVerification', 'DKIM Verification'), align: 'center', format: 'percentage' },
          { key: 'spfRate', label: t('reports.colSpfVerification', 'SPF Verification'), align: 'center', format: 'percentage' },
          { key: 'threatVolume', label: t('reports.colThreatVolume', 'Threat Volume'), align: 'right', format: 'number' }
        ];
        const countryRows = countries.filter((c) => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return c.country && c.country.toLowerCase().includes(q);
        });
        rows = countryRows.map((c) => ({
          country: c.country,
          countryCode: c.countryCode || '',
          totalVolume: c.totalVolume,
          uniqueIps: c.uniqueIps,
          complianceRate: c.complianceRate,
          dkimRate: c.dkimRate,
          spfRate: c.spfRate,
          threatVolume: c.threatVolume || 0
        }));
      }

      const payload = {
        tab_id: subView,
        tab_title: tabTitle,
        format,
        domain: domainFilter,
        time_window: timeWindow,
        filters: {
          search: searchQuery,
          category: sourceCategoryFilter,
          hostnameSearch,
          ipSearch
        },
        summary,
        stats,
        columns,
        rows,
        extra,
        client_org: currentUser?.organization_name || '',
        user_logon: currentUser?.username || '',
        logo_url: currentUser?.logo_url || '',
        language
      };

      const result = await exportAggregateTab(payload);
      setExportMessage({
        type: 'success',
        text: `${tabTitle} exported to ${format.toUpperCase()} (${result.filename})`
      });
      setTimeout(() => setExportMessage(null), 5000);
    } catch (err) {
      console.error('Export error:', err);
      setExportMessage({
        type: 'error',
        text: err.message || t('reports.exportFailed', 'Failed to export tab data')
      });
      setTimeout(() => setExportMessage(null), 6000);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* TOP FILTER & ACTION BAR                                 */}
      {/* ======================================================== */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Domain Scope */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">{t('reports.domainLabel', 'Domain')}:</span>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="all">{t('filters.allDomains', 'All Permitted Domains')}</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Presets & Custom Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: 'all', label: 'ALL' },
                { id: 'custom', label: t('reports.customDate', 'Custom') }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTimePreset(p.id);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    timePreset === p.id
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.id === 'custom' && <Calendar className="w-3 h-3" />}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Custom Date Range Specific Pickers */}
            {timePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-cyan-500/40 text-xs shadow-lg animate-in fade-in">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">{t('reports.dateFrom', 'From')}:</span>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-mono focus:ring-1 focus:ring-cyan-500 [color-scheme:dark] cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">{t('reports.dateTo', 'To')}:</span>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-mono focus:ring-1 focus:ring-cyan-500 [color-scheme:dark] cursor-pointer"
                  />
                </div>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500 text-white hover:bg-cyan-400 transition cursor-pointer flex items-center gap-1"
                  title={t('reports.applyDateRange', 'Apply')}
                >
                  <Check className="w-3 h-3" />
                  <span>{t('reports.applyDateRange', 'Apply')}</span>
                </button>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition cursor-pointer"
              title={t('reports.refreshViews', 'Refresh Analytics')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action: Tab Exports & Full Report */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export to PDF */}
          <button
            onClick={() => handleExportTab('pdf')}
            disabled={exportingFormat !== null}
            title={t('reports.exportTabPdf', 'Export PDF')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:border-rose-500/50 hover:bg-rose-950/20 transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {exportingFormat === 'pdf' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{exportingFormat === 'pdf' ? t('reports.exportingPdf', 'Exporting PDF...') : t('reports.exportTabPdf', 'Export PDF')}</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={() => handleExportTab('xlsx')}
            disabled={exportingFormat !== null}
            title={t('reports.exportTabExcel', 'Export Excel')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-950/20 transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {exportingFormat === 'xlsx' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{exportingFormat === 'xlsx' ? t('reports.exportingExcel', 'Exporting Excel...') : t('reports.exportTabExcel', 'Export Excel')}</span>
          </button>

          {/* Action: Jump to Full Report Generation */}
          {onSwitchToGenerate && (
            <button
              onClick={() => onSwitchToGenerate({
                domain: domainFilter,
                preset: timePreset,
                customDateFrom: timePreset === 'custom' ? customDateFrom : null,
                customDateTo: timePreset === 'custom' ? customDateTo : null
              })}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('reports.exportCurrentView', 'Generate Full Report with Current Filters')}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* Export notification message */}
      {exportMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
            exportMessage.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {exportMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{exportMessage.text}</span>
          </div>
          <button
            onClick={() => setExportMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error alert if any */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8 SUB-TABS NAVIGATION BAR                                */}
      {/* ======================================================== */}
      <div className="overflow-x-auto pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-max">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = subView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSubView(item.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-mono rounded-full ${
                      isActive ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: PER SENDING SOURCE (WITH EXPANDABLE NESTED ROWS) */}
      {/* ======================================================== */}
      {subView === 'per_source' && (
        <div className="space-y-6">
          {/* Top 3 Summary Filter Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSourceCategoryFilter(sourceCategoryFilter === 'DMARC compatible sources' ? 'all' : 'DMARC compatible sources')}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                sourceCategoryFilter === 'DMARC compatible sources'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {t('reports.dmarcCompatibleSources', 'DMARC compatible sources')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                  {sourceStats.compatible.count}
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-2 font-mono">
                {sourceStats.compatible.volume.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{t('reports.authorizedSystemsDesc', 'Authorized email systems passing authentication')}</p>
            </button>

            <button
              onClick={() => setSourceCategoryFilter(sourceCategoryFilter === 'Forwarded' ? 'all' : 'Forwarded')}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                sourceCategoryFilter === 'Forwarded'
                  ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-blue-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  {t('reports.forwardedSources', 'Forwarded')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300">
                  {sourceStats.forwarded.count}
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-2 font-mono">
                {sourceStats.forwarded.volume.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{t('reports.intermediaryRelaysDesc', 'Intermediary relays surviving via intact DKIM signatures')}</p>
            </button>

            <button
              onClick={() => setSourceCategoryFilter(sourceCategoryFilter === 'Failed' ? 'all' : 'Failed')}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                sourceCategoryFilter === 'Failed'
                  ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  {t('reports.failedSources', 'Failed')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300">
                  {sourceStats.failed.count}
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-2 font-mono">
                {sourceStats.failed.volume.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{t('reports.shadowItDesc', 'Shadow IT or unauthorized spoofers failing both checks')}</p>
            </button>
          </div>

          {/* Search bar & filter pill bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('reports.searchPlaceholder', 'Search vendors, IPs, hostnames...')}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {t('reports.showingSources', 'Showing {filtered} of {total} sending sources')
                .replace('{filtered}', filteredSources.length)
                .replace('{total}', sources.length)}
            </div>
          </div>

          {/* Per Sending Source Main Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4">{t('reports.colSendingSource', 'Sending Source')}</th>
                    <th className="py-3 px-4">{t('reports.colSourceType', 'Source Type')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.colMessages', 'Messages')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.colDmarcCompliance', 'DMARC Compliance')}</th>
                    <th className="py-3 px-4">{t('reports.colDkimVerification', 'DKIM Verification')}</th>
                    <th className="py-3 px-4">{t('reports.colSpfVerification', 'SPF Verification')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredSources.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        {t('reports.noSourcesMatch', 'No sending sources match the current filter.')}
                      </td>
                    </tr>
                  ) : (
                    filteredSources.map((s, idx) => {
                      const isExpanded = !!expandedSources[s.sourceName];
                      return (
                        <React.Fragment key={idx}>
                          <tr
                            onClick={() => toggleSourceExpand(s.sourceName)}
                            className="hover:bg-slate-800/40 transition cursor-pointer"
                          >
                            <td className="py-3 px-4 text-center">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-cyan-400 inline" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500 inline" />
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                                <span>{s.sourceName}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {s.baseDomain || s.asName || t('reports.directServer', 'Direct Server')}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  s.categoryTag === 'DMARC compatible sources'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : s.categoryTag === 'Forwarded'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {getCategoryTagLabel(s.categoryTag)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-white">
                              {s.totalVolume.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <DonutGauge rate={s.complianceRate} size={46} strokeWidth={4} />
                            </td>
                            <td className="py-3 px-4">
                              <SplitProgressBar title="DKIM" passRate={s.dkimRate} />
                            </td>
                            <td className="py-3 px-4">
                              <SplitProgressBar title="SPF" passRate={s.spfRate} />
                            </td>
                          </tr>

                          {/* EXPANDABLE NESTED ROW */}
                          {isExpanded && (
                            <tr className="bg-slate-950/80">
                              <td colSpan="7" className="p-4 pl-12 border-b border-slate-800">
                                <div className="space-y-3">
                                   <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                                      <Network className="w-3.5 h-3.5 text-cyan-400" />
                                      {t('reports.sendingHostsFor', 'Sending Hostnames & IP Addresses for {name}').replace('{name}', s.sourceName)}
                                    </h5>
                                    <span className="text-[10px] text-slate-400">
                                      {t('reports.hostRecordsCount', '{count} host records').replace('{count}', s.hosts?.length || 0)}
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-900/60">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[9px] border-b border-slate-800">
                                        <tr>
                                          <th className="py-2.5 px-3">{t('reports.colSenderHostname', 'Sender Hostname')}</th>
                                          <th className="py-2.5 px-3">{t('reports.colCountryIp', 'Country & IP Address')}</th>
                                          <th className="py-2.5 px-3 text-right">{t('reports.colMessages', 'Messages')}</th>
                                          <th className="py-2.5 px-3 text-center">{t('reports.colCompliant', 'Compliant')}</th>
                                          <th className="py-2.5 px-3">{t('reports.colDkimStatus', 'DKIM Status')}</th>
                                          <th className="py-2.5 px-3">{t('reports.colSpfStatus', 'SPF Status')}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                                        {!s.hosts || s.hosts.length === 0 ? (
                                          <tr>
                                            <td colSpan="6" className="py-4 text-center text-slate-500 text-[11px]">
                                              {t('reports.noHostIps', 'No individual host IPs recorded for this source.')}
                                            </td>
                                          </tr>
                                        ) : (
                                          s.hosts.map((h, hIdx) => (
                                            <tr key={hIdx} className="hover:bg-slate-800/20">
                                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200">
                                                {h.hostname}
                                              </td>
                                              <td className="py-2.5 px-3 font-mono text-[11px] flex items-center gap-2">
                                                <span>{getCountryFlag(h.country)}</span>
                                                <span className="text-cyan-300 font-bold">{h.ip}</span>
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                                                {h.totalVolume.toLocaleString()}
                                              </td>
                                              <td className="py-2.5 px-3 text-center">
                                                {h.isCompliant ? (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    {t('reports.yes', 'Yes')}
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                                    {t('reports.no', 'No')}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-1 text-[10px] font-mono">
                                                  <span
                                                    className={`w-2 h-2 rounded-full ${
                                                      h.dkimAligned ? 'bg-emerald-400' : 'bg-rose-400'
                                                    }`}
                                                  />
                                                  <span>{h.dkimAligned ? t('reports.aligned', 'Aligned') : t('reports.unaligned', 'Unaligned')}</span>
                                                </div>
                                              </td>
                                              <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-1 text-[10px] font-mono">
                                                  <span
                                                    className={`w-2 h-2 rounded-full ${
                                                      h.spfAligned ? 'bg-emerald-400' : 'bg-rose-400'
                                                    }`}
                                                  />
                                                  <span>{h.spfAligned ? t('reports.aligned', 'Aligned') : t('reports.unaligned', 'Unaligned')}</span>
                                                </div>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: PER RESULT (3 GROUPS)                            */}
      {/* ======================================================== */}
      {subView === 'per_result' && perResultGroups && (
        <div className="space-y-6">
          {/* Top 3 Classification Groups */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* GROUP 1: DMARC correct - DKIM or SPF aligned */}
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  RFC 7489 PASS
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  🏆 {getResultGroupTitle(perResultGroups.correctGroup.title)}
                </h4>
                <div className="text-3xl font-black text-emerald-400 mt-2 font-mono">
                  {perResultGroups.correctGroup.totalVolume.toLocaleString()}
                </div>
                <p className="text-xs font-semibold text-emerald-300/80 mt-0.5">
                  {perResultGroups.correctGroup.percentage}% {t('reports.ofTotalTraffic', 'of total traffic')}
                </p>
              </div>

              {/* Sub-Items List */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs">
                {perResultGroups.correctGroup.subItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-none">
                    <span className="text-slate-300 font-medium">{getSubItemName(item.name)}</span>
                    <div className="font-mono text-right">
                      <span className="font-bold text-white">{item.count.toLocaleString()}</span>
                      <span className="text-slate-500 text-[10px] ml-1">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GROUP 2: Authenticated - DKIM or SPF valid */}
            <div className="glass-panel p-5 rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-950/20 via-slate-900/60 to-slate-900/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  VALID NOT ALIGNED
                </span>
                <Network className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  🔑 {getResultGroupTitle(perResultGroups.authenticatedGroup.title)}
                </h4>
                <div className="text-3xl font-black text-blue-400 mt-2 font-mono">
                  {perResultGroups.authenticatedGroup.totalVolume.toLocaleString()}
                </div>
                <p className="text-xs font-semibold text-blue-300/80 mt-0.5">
                  {perResultGroups.authenticatedGroup.percentage}% {t('reports.ofTotalTraffic', 'of total traffic')}
                </p>
              </div>

              {/* Sub-Items List */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs">
                {perResultGroups.authenticatedGroup.subItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-none">
                    <span className="text-slate-300 font-medium">{getSubItemName(item.name)}</span>
                    <div className="font-mono text-right">
                      <span className="font-bold text-white">{item.count.toLocaleString()}</span>
                      <span className="text-slate-500 text-[10px] ml-1">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GROUP 3: Invalid flows - DKIM and SPF invalid */}
            <div className="glass-panel p-5 rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-950/20 via-slate-900/60 to-slate-900/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  SPOOFING / REJECTED
                </span>
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  ⚠️ {getResultGroupTitle(perResultGroups.invalidGroup.title)}
                </h4>
                <div className="text-3xl font-black text-rose-400 mt-2 font-mono">
                  {perResultGroups.invalidGroup.totalVolume.toLocaleString()}
                </div>
                <p className="text-xs font-semibold text-rose-300/80 mt-0.5">
                  {perResultGroups.invalidGroup.percentage}% {t('reports.ofTotalTraffic', 'of total traffic')}
                </p>
              </div>

              {/* Sub-Items List */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs">
                {perResultGroups.invalidGroup.subItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-none">
                    <span className="text-slate-300 font-medium">{getSubItemName(item.name)}</span>
                    <div className="font-mono text-right">
                      <span className="font-bold text-white">{item.count.toLocaleString()}</span>
                      <span className="text-slate-500 text-[10px] ml-1">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Proportional Overview Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              {t('reports.flowProportions', 'Aggregate Authentication Flow Proportions')}
            </h4>
            <div className="h-4 rounded-xl overflow-hidden flex bg-slate-950 border border-slate-800">
              <div
                style={{ width: `${perResultGroups.correctGroup.percentage}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`${t('reports.dmarcCorrect', 'Correct')}: ${perResultGroups.correctGroup.percentage}%`}
              />
              <div
                style={{ width: `${perResultGroups.authenticatedGroup.percentage}%` }}
                className="bg-blue-500 h-full transition-all duration-500"
                title={`${t('reports.authenticatedValid', 'Authenticated unaligned')}: ${perResultGroups.authenticatedGroup.percentage}%`}
              />
              <div
                style={{ width: `${perResultGroups.invalidGroup.percentage}%` }}
                className="bg-rose-500 h-full transition-all duration-500"
                title={`${t('reports.invalidFlows', 'Invalid flows')}: ${perResultGroups.invalidGroup.percentage}%`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>{t('reports.dmarcCorrect', 'DMARC Correct')} ({perResultGroups.correctGroup.percentage}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span>{t('reports.authenticatedValid', 'Authenticated Valid')} ({perResultGroups.authenticatedGroup.percentage}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span>{t('reports.invalidFlows', 'Invalid Flows')} ({perResultGroups.invalidGroup.percentage}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: PER ORGANIZATION                                 */}
      {/* ======================================================== */}
      {subView === 'per_org' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('reports.searchMailboxProviders', 'Search reporting mailbox providers...')}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {t('reports.showingOrgs', 'Showing {count} reporting organizations').replace('{count}', filteredOrgs.length)}
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{t('reports.colReportingOrg', 'Reporting Organization')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.colMessages', 'Messages')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.colUniqueIps', 'Unique IPs')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.colDmarcCompliance', 'DMARC Compliance')}</th>
                    <th className="py-3 px-4">{t('reports.colDkimVerification', 'DKIM Verification')}</th>
                    <th className="py-3 px-4">{t('reports.colSpfVerification', 'SPF Verification')}</th>
                    <th className="py-3 px-4">{t('reports.colDispositions', 'Dispositions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        {t('reports.noOrgsMatch', 'No organization reports match the current filter.')}
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>{org.orgName}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {org.totalVolume.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            {org.uniqueIps} IPs
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DonutGauge rate={org.complianceRate} size={46} strokeWidth={4} />
                        </td>
                        <td className="py-3 px-4">
                          <SplitProgressBar title="DKIM" passRate={org.dkimRate} />
                        </td>
                        <td className="py-3 px-4">
                          <SplitProgressBar title="SPF" passRate={org.spfRate} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-[10px] font-mono">
                            {org.dispositions.none > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                none: {org.dispositions.none}
                              </span>
                            )}
                            {org.dispositions.quarantine > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                                quar: {org.dispositions.quarantine}
                              </span>
                            )}
                            {org.dispositions.reject > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800">
                                rej: {org.dispositions.reject}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 5: PER HOST (WITH 3 TOP DONUTS)                     */}
      {/* ======================================================== */}
      {subView === 'per_host' && (
        <div className="space-y-6">
          {/* 3 Top Donut Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {t('reports.dmarcCorrect', 'DMARC Correct')}
                </span>
                <div className="text-2xl font-black text-white mt-1 font-mono">
                  {summary.compliantVolume.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{t('reports.passingAlignment', 'Passing domain alignment')}</p>
              </div>
              <DonutGauge rate={summary.complianceRate} size={58} strokeWidth={5} />
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  {t('reports.authenticated', 'Authenticated')}
                </span>
                <div className="text-2xl font-black text-white mt-1 font-mono">
                  {summary.forwardedVolume.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{t('reports.validRelayFlow', 'Valid key / relay flow')}</p>
              </div>
              <DonutGauge
                rate={
                  summary.totalVolume > 0
                    ? Number(((summary.forwardedVolume / summary.totalVolume) * 100).toFixed(1))
                    : 0
                }
                size={58}
                strokeWidth={5}
              />
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  {t('reports.invalidFlows', 'Invalid flows')}
                </span>
                <div className="text-2xl font-black text-white mt-1 font-mono">
                  {summary.threatVolume.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{t('reports.impersonationSpoofed', 'Impersonation / spoofed')}</p>
              </div>
              <DonutGauge
                rate={
                  summary.totalVolume > 0
                    ? Number(((summary.threatVolume / summary.totalVolume) * 100).toFixed(1))
                    : 0
                }
                size={58}
                strokeWidth={5}
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('reports.searchHostsPlaceholder', 'Search sending host IP, PTR, country...')}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {t('reports.showingHosts', 'Showing {count} sending hosts').replace('{count}', filteredHosts.length)}
            </div>
          </div>

          {/* Host Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{t('reports.colHostnamePtr', 'Hostname (PTR)')}</th>
                    <th className="py-3 px-4">{t('reports.colCountrySendingIp', 'Country & Sending IP')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.colMessages', 'Messages')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.colDmarcCompliance', 'DMARC Compliance')}</th>
                    <th className="py-3 px-4">{t('reports.colDkimVerification', 'DKIM Verification')}</th>
                    <th className="py-3 px-4">{t('reports.colSpfVerification', 'SPF Verification')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.colReceiverPolicy', 'Receiver Policy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredHosts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        {t('reports.noHostsMatch', 'No sending hosts match the current search.')}
                      </td>
                    </tr>
                  ) : (
                    filteredHosts.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-200">
                          {h.ptr || t('reports.noPtrRecord', 'No PTR Record')}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] flex items-center gap-2">
                          <span>{getCountryFlag(h.country)}</span>
                          <span className="text-cyan-300 font-bold">{h.ip}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {h.totalVolume.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DonutGauge rate={h.complianceRate} size={46} strokeWidth={4} />
                        </td>
                        <td className="py-3 px-4">
                          <SplitProgressBar title="DKIM" passRate={h.dkimRate} />
                        </td>
                        <td className="py-3 px-4">
                          <SplitProgressBar title="SPF" passRate={h.spfRate} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.disposition === 'reject'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : h.disposition === 'quarantine'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            }`}
                          >
                            p={h.disposition}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 6: DETAILED STATS (WITH DUAL SEARCH INPUTS)         */}
      {/* ======================================================== */}
      {subView === 'detailed' && (
        <div className="space-y-4">
          {/* Dual Search Filters */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={hostnameSearch}
                onChange={(e) => setHostnameSearch(e.target.value)}
                placeholder={t('reports.searchHostname', 'Search Hostname')}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
              />
            </div>
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ipSearch}
                onChange={(e) => setIpSearch(e.target.value)}
                placeholder={t('reports.searchIp', 'Search IP address / CIDR')}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
              {t('reports.showingItemized', 'Showing {count} itemized records').replace('{count}', filteredDetailedHits.length)}
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{t('reports.colSenderHostname', 'Sender Hostname')}</th>
                    <th className="py-3 px-4">{t('reports.colCountryIp', 'Country & IP Address')}</th>
                    <th className="py-3 px-4">{t('reports.colReportingOrg', 'Reporting Org')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.colVolume', 'Volume')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.colCompliant', 'Compliant')}</th>
                    <th className="py-3 px-4">{t('reports.colDkimStatus', 'DKIM Status')}</th>
                    <th className="py-3 px-4">{t('reports.colSpfStatus', 'SPF Status')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.colDisposition', 'Disposition')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredDetailedHits.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500">
                        {t('reports.noItemizedMatch', 'No itemized records match the current hostname or IP filters.')}
                      </td>
                    </tr>
                  ) : (
                    filteredDetailedHits.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-200">
                          {h.hostname}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <a
                            href={`https://www.google.com/search?q=whois+${h.ip}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-1.5"
                          >
                            <span>{getCountryFlag(h.country)}</span>
                            <span>{h.ip}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {h.org}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {h.volume.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {h.compliant ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {t('reports.yes', 'Yes')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {t('reports.no', 'No')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                h.dkimAligned ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <span className={h.dkimAligned ? 'text-emerald-400' : 'text-rose-400'}>
                              {h.dkimAligned ? t('reports.aligned', 'Aligned') : t('reports.unaligned', 'Unaligned')}
                            </span>
                            <span className="text-slate-500">({h.dkimSelector})</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                h.spfAligned ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <span className={h.spfAligned ? 'text-emerald-400' : 'text-rose-400'}>
                              {h.spfAligned ? t('reports.aligned', 'Aligned') : t('reports.unaligned', 'Unaligned')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            p={h.disposition}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 7: GEOLOCATION REPORT (INTERACTIVE WORLD MAP)       */}
      {/* ======================================================== */}
      {/* VIEW 7: GEOLOCATION REPORT                               */}
      {/* ======================================================== */}
      {subView === 'geolocation' && (
        <GeoLocationMap
          geoPoints={geoPoints}
          getCountryFlag={getCountryFlag}
          t={t}
        />
      )}

      {/* ======================================================== */}
      {/* VIEW 8: PER COUNTRY                                      */}
      {/* ======================================================== */}
      {subView === 'per_country' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('reports.searchCountryPlaceholder', 'Search origin country or code...')}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {t('reports.showingCountries', 'Showing {count} sending countries').replace('{count}', countries.length)}
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{t('reports.colOriginCountry', 'Origin Country')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.colMessages', 'Messages')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.colUniqueIps', 'Unique IPs')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.colDmarcCompliance', 'DMARC Compliance')}</th>
                    <th className="py-3 px-4">{t('reports.colDkimVerification', 'DKIM Verification')}</th>
                    <th className="py-3 px-4">{t('reports.colSpfVerification', 'SPF Verification')}</th>
                    <th className="py-3 px-4 text-right">{t('reports.colThreatVolume', 'Threat Volume')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {countries.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        {t('reports.noCountriesMatch', 'No sending country telemetry for current selection.')}
                      </td>
                    </tr>
                  ) : (
                    countries
                      .filter((c) => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return c.country && c.country.toLowerCase().includes(q);
                      })
                      .map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                            <span className="text-lg">{getCountryFlag(c.country)}</span>
                            <span>{c.country === 'Unknown' ? t('reports.unresolvedCountry', 'Unresolved Country') : c.country}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {c.totalVolume.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                              {c.uniqueIps} IPs
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <DonutGauge rate={c.complianceRate} size={46} strokeWidth={4} />
                          </td>
                          <td className="py-3 px-4">
                            <SplitProgressBar title="DKIM" passRate={c.dkimRate} />
                          </td>
                          <td className="py-3 px-4">
                            <SplitProgressBar title="SPF" passRate={c.spfRate} />
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {c.threatVolume > 0 ? (
                              <span className="text-rose-400">{c.threatVolume.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
