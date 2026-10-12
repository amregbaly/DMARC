import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Globe2, 
  MapPin, 
  Layers, 
  Maximize2, 
  RotateCcw, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Radio, 
  ExternalLink 
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

// Tile provider definitions with dark mode defaults
const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    maxZoom: 19
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    maxZoom: 19
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &copy; USGS, NOAA',
    subdomains: '',
    maxZoom: 18
  }
};

export default function GeoLocationMap({ geoPoints = [], getCountryFlag, t }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const { isDark } = useTheme();

  const [activeLayer, setActiveLayer] = useState(isDark ? 'dark' : 'light');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Automatically update map tile layer when theme changes
  useEffect(() => {
    setActiveLayer(isDark ? 'dark' : 'light');
  }, [isDark]);

  // Group stats for Top 10 Countries summary cards
  const countryBreakdown = useMemo(() => {
    const compliantMap = {};
    const threatMap = {};

    geoPoints.forEach((pt) => {
      const code = pt.country || 'Unknown';
      const vol = pt.volume || 1;
      if (pt.compliant) {
        compliantMap[code] = (compliantMap[code] || 0) + vol;
      } else {
        threatMap[code] = (threatMap[code] || 0) + vol;
      }
    });

    const compliantList = Object.entries(compliantMap)
      .map(([code, vol]) => ({ code, vol }))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 10);

    const threatList = Object.entries(threatMap)
      .map(([code, vol]) => ({ code, vol }))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 10);

    const totalCompliantPoints = geoPoints.filter((p) => p.compliant).length;
    const totalThreatPoints = geoPoints.filter((p) => !p.compliant).length;

    return {
      compliantList,
      threatList,
      totalCompliantPoints,
      totalThreatPoints
    };
  }, [geoPoints]);

  // Filtered itemized table points
  const filteredPoints = useMemo(() => {
    if (!searchTerm) return geoPoints;
    const q = searchTerm.toLowerCase();
    return geoPoints.filter(
      (p) =>
        (p.ip && p.ip.toLowerCase().includes(q)) ||
        (p.hostname && p.hostname.toLowerCase().includes(q)) ||
        (p.country && p.country.toLowerCase().includes(q))
    );
  }, [geoPoints, searchTerm]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 1.5,
        maxZoom: 18,
        worldCopyJump: true,
        zoomControl: false,
        attributionControl: true
      });

      // Add default tile layer
      const provider = TILE_LAYERS[activeLayer];
      const tiles = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        subdomains: provider.subdomains,
        maxZoom: provider.maxZoom
      }).addTo(map);

      tileLayerRef.current = tiles;

      // Group for markers
      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      mapInstanceRef.current = map;

      // Handle container resizing
      const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      // Timeout tick for initial layout
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when layer selector changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const provider = TILE_LAYERS[activeLayer] || TILE_LAYERS.dark;
    const tiles = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      subdomains: provider.subdomains,
      maxZoom: provider.maxZoom
    }).addTo(map);

    tileLayerRef.current = tiles;
  }, [activeLayer]);

  // Render & Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;

    group.clearLayers();

    if (geoPoints.length === 0) return;

    const bounds = L.latLngBounds();

    geoPoints.forEach((pt) => {
      if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number') return;

      const isCompliant = Boolean(pt.compliant);
      const ringColor = isCompliant ? '#10b981' : '#f43f5e';
      const dotColor = isCompliant ? '#34d399' : '#fb7185';
      const shadowGlow = isCompliant 
        ? 'rgba(16, 185, 129, 0.45)' 
        : 'rgba(244, 63, 94, 0.45)';

      const customHtml = `
        <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background-color: ${ringColor}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background-color: ${dotColor}; border: 2.5px solid #090d16; box-shadow: 0 0 10px ${shadowGlow};"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: customHtml,
        className: 'dmarc-geo-pulse-marker',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12]
      });

      const marker = L.marker([pt.lat, pt.lng], { icon });

      // Rich dark popup
      const flag = getCountryFlag ? getCountryFlag(pt.country) : '';
      const statusTitle = isCompliant 
        ? t('reports.dmarcCompliant', 'DMARC Compliant') 
        : t('reports.threatFailedLabel', 'Failed / Threat');
      const badgeClass = isCompliant
        ? 'background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4);'
        : 'background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.4);';

      const popupContent = `
        <div style="padding: 10px 14px; font-family: system-ui, sans-serif; min-width: 190px; color: #f1f5f9;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <span>${flag}</span>
              <span style="color: #38bdf8;">${pt.ip}</span>
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">${pt.country}</span>
          </div>
          <div style="font-family: monospace; font-size: 11px; color: #94a3b8; word-break: break-all; margin-bottom: 8px; background: rgba(2, 6, 23, 0.7); padding: 4px 6px; border-radius: 6px; border: 1px solid rgba(30, 41, 59, 0.8);">
            ${pt.hostname || 'No PTR Record'}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
            <span style="color: #64748b;">${t('reports.colVolume', 'Volume')}:</span>
            <span style="font-weight: 700; color: #ffffff;">${(pt.volume || 1).toLocaleString()}</span>
          </div>
          <div style="text-align: center; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; ${badgeClass}">
            ${statusTitle}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'dmarc-custom-popup',
        closeButton: true,
        maxWidth: 280
      });

      marker.on('click', () => {
        setSelectedPoint(pt);
      });

      group.addLayer(marker);
      bounds.extend([pt.lat, pt.lng]);
    });

    // Auto-frame around detected nodes if any exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 6,
        animate: true
      });
    }
  }, [geoPoints, t, getCountryFlag]);

  // Center / Reset View handler
  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (geoPoints.length > 0) {
      const bounds = L.latLngBounds();
      geoPoints.forEach((pt) => {
        if (typeof pt.lat === 'number' && typeof pt.lng === 'number') {
          bounds.extend([pt.lat, pt.lng]);
        }
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
        return;
      }
    }
    map.setView([20, 0], 2);
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className="space-y-6">
      {/* Main Map Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl space-y-4">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-cyan-400" />
              {t('reports.geoTitle', 'Global Origin Geographic Distribution')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('reports.geoSubtitle', 'Plotted origin coordinates of mail transfer agents delivering mail for monitored domains.')}
            </p>
          </div>

          {/* Interactive Badges & Map Style Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live Indicator Badges */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                {t('reports.dmarcCompliant', 'DMARC Compliant')} ({countryBreakdown.totalCompliantPoints})
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50" />
                {t('reports.threatFailedLabel', 'Threat / Failed')} ({countryBreakdown.totalThreatPoints})
              </span>
            </div>

            {/* Map Layer Switcher */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveLayer('dark')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeLayer === 'dark'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t('reports.layerDark', 'Carto Dark')}
              >
                {t('reports.layerDark', 'Carto Dark')}
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer('light')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeLayer === 'light'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t('reports.layerLight', 'Carto Light')}
              >
                {t('reports.layerLight', 'Carto Light')}
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer('satellite')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeLayer === 'satellite'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t('reports.layerSatellite', 'Satellite')}
              >
                {t('reports.layerSatellite', 'Satellite')}
              </button>
            </div>

            {/* Reset View Button */}
            <button
              type="button"
              onClick={handleResetView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition shadow-sm"
              title={t('reports.resetView', 'Reset View')}
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('reports.resetView', 'Reset')}</span>
            </button>
          </div>
        </div>

        {/* Real Leaflet Map Container */}
        <div className="relative w-full h-[450px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

          {/* Floating Map Zoom Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-200 font-bold transition text-base"
              title="Zoom in"
            >
              +
            </button>
            <div className="w-full h-px bg-slate-800" />
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-200 font-bold transition text-base"
              title="Zoom out"
            >
              −
            </button>
          </div>

          {/* Map Status Overlay badge */}
          <div className="absolute bottom-3 left-3 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              {t('reports.locationsPlotted', '{count} locations plotted').replace('{count}', geoPoints.length)}
            </span>
          </div>
        </div>
      </div>

      {/* Top 10 Countries Breakdown Cards (PowerDMARC Standard) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          {t('reports.top10Countries', 'Top 10 Countries')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: DMARC Compliant */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {t('reports.dmarcCompliant', 'DMARC Compliant')}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {countryBreakdown.compliantList.length}
              </span>
            </div>
            {countryBreakdown.compliantList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                {t('reports.recordsNotFound', 'Records not found')}
              </p>
            ) : (
              <div className="space-y-2">
                {countryBreakdown.compliantList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-800/40 transition">
                    <span className="flex items-center gap-2 font-medium text-slate-200">
                      <span className="text-sm">{getCountryFlag ? getCountryFlag(item.code) : ''}</span>
                      <span>{item.code}</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {item.vol.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: DMARC Forwarded */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                {t('reports.forwarded', 'DMARC Forwarded')}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                0
              </span>
            </div>
            <p className="text-xs text-slate-500 py-6 text-center">
              {t('reports.recordsNotFound', 'Records not found')}
            </p>
          </div>

          {/* Column 3: Threats */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                {t('reports.threatFailedLabel', 'Threats')}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                {countryBreakdown.threatList.length}
              </span>
            </div>
            {countryBreakdown.threatList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                {t('reports.recordsNotFound', 'Records not found')}
              </p>
            ) : (
              <div className="space-y-2">
                {countryBreakdown.threatList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-800/40 transition">
                    <span className="flex items-center gap-2 font-medium text-slate-200">
                      <span className="text-sm">{getCountryFlag ? getCountryFlag(item.code) : ''}</span>
                      <span>{item.code}</span>
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      {item.vol.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Itemized Detected Origin Locations Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            {t('reports.detectedOriginTitle', 'Detected Origin Locations & Threat Exposure')}
          </h4>
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('reports.searchPlaceholder', 'Search vendors, IPs, hostnames...')}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{t('reports.colCountryFlag', 'Country & Flag')}</th>
                <th className="py-3 px-4">{t('reports.colIpAddress', 'IP Address')}</th>
                <th className="py-3 px-4">{t('reports.colPtrHostname', 'PTR Hostname')}</th>
                <th className="py-3 px-4 text-right">{t('reports.colMessages', 'Messages')}</th>
                <th className="py-3 px-4 text-right">{t('reports.statusVerdict', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPoints.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    {t('reports.noGeoPoints', 'No geolocation points available.')}
                  </td>
                </tr>
              ) : (
                filteredPoints.map((pt, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 flex items-center gap-2 font-bold text-white">
                      <span className="text-base">{getCountryFlag ? getCountryFlag(pt.country) : ''}</span>
                      <span>{pt.country}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                      {pt.ip}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {pt.hostname}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {(pt.volume || 1).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pt.compliant ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {t('reports.compliant', 'Compliant')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {t('reports.threatLabel', 'Threat')}
                        </span>
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
  );
}
