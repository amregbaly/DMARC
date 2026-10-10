import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Radio, Skull, MapPin, Network } from 'lucide-react';

export default function ThreatIntelligence({ threats }) {
  if (!threats) return null;

  const {
    containmentRate = 100,
    totalThreatMessages = 0,
    containedMessages = 0,
    threatCountries = [],
    threatAsns = [],
    feed = []
  } = threats;

  const containmentColor =
    containmentRate >= 90 ? 'text-emerald-400' : containmentRate >= 70 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Security Operations (SOC) & Threat Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Real-time feed of unaligned senders, phishing attempts, spoofing suspects, and policy enforcement actions.
          </p>
        </div>
      </div>

      {/* Top Threat Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Containment Rate Card */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Attack Containment Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className={`text-3xl font-extrabold ${containmentColor} font-mono mb-1`}>
              {containmentRate}%
            </div>
            <p className="text-xs text-slate-400">
              {containedMessages.toLocaleString()} of {totalThreatMessages.toLocaleString()} spoofing attempts were quarantined or rejected by receiving mail servers.
            </p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${containmentRate}%` }}
            />
          </div>
        </div>

        {/* Threat Countries */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-semibold text-slate-300">Top Attack Origins (Geo)</h3>
          </div>
          <div className="space-y-2">
            {threatCountries.slice(0, 5).map((tc, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {tc.country || 'Unknown'}
                </span>
                <span className="font-mono text-rose-400 font-semibold">
                  {tc.count.toLocaleString()} msgs
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Threat ASNs */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-300">Top Threat Networks (ASNs)</h3>
          </div>
          <div className="space-y-2">
            {threatAsns.slice(0, 5).map((ta, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate max-w-[170px]" title={ta.asn}>
                  {ta.asn}
                </span>
                <span className="font-mono text-amber-400 font-semibold">
                  {ta.count.toLocaleString()} msgs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SOC Live Threat Feed Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-200">
              Live Threat Feed: Unaligned & Spoofed Traffic
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Showing latest {feed.length} security events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Attacker IP & Host</th>
                <th className="px-6 py-3">Target Domain</th>
                <th className="px-6 py-3">Envelope From</th>
                <th className="px-6 py-3">SPF / DKIM Status</th>
                <th className="px-6 py-3">Volume</th>
                <th className="px-6 py-3">Enforcement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {feed.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    No threat events or unaligned traffic detected in this timeframe.
                  </td>
                </tr>
              ) : (
                feed.map((event) => {
                  const isBlocked = event.disposition === 'reject' || event.disposition === 'quarantine';
                  return (
                    <tr key={event.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3 text-[11px] text-slate-400">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-semibold text-rose-400">{event.ip}</div>
                        <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">
                          {event.reverseDns || 'No PTR record'} ({event.country})
                        </div>
                      </td>
                      <td className="px-6 py-3 text-cyan-300 font-medium">
                        {event.domain}
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-[11px] truncate max-w-xs">
                        {event.envelopeFrom || '—'}
                      </td>
                      <td className="px-6 py-3 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            event.spfAligned ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            SPF: {event.spfResult}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            event.dkimAligned ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            DKIM: {event.dkimResult}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-bold text-white">
                        {event.messages.toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase ${
                            isBlocked
                              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {event.disposition}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
