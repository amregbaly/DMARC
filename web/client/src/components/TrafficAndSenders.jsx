import React from 'react';
import { Network, Server, Globe2, Building2, ExternalLink } from 'lucide-react';

export default function TrafficAndSenders({ traffic }) {
  if (!traffic) return null;

  const { topIps = [], topDomains = [], topOrgs = [], countries = [] } = traffic;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            Traffic & Senders Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Source IP addresses, mail servers, organizations, and global geolocation breakdown.
          </p>
        </div>
      </div>

      {/* Top Sending IPs Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Top Sending IP Addresses</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Ranked by volume</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-3">Source IP</th>
                <th className="px-6 py-3">Reverse DNS / Hostname</th>
                <th className="px-6 py-3">ASN & Network</th>
                <th className="px-6 py-3">Geo</th>
                <th className="px-6 py-3 text-right">Messages</th>
                <th className="px-6 py-3">Auth Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topIps.map((ipObj, idx) => {
                const passPercent = ipObj.volume > 0 ? ((ipObj.passed / ipObj.volume) * 100).toFixed(0) : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3 font-mono font-semibold text-cyan-300">
                      {ipObj.ip}
                    </td>
                    <td className="px-6 py-3 text-slate-300 max-w-xs truncate font-mono text-[11px]">
                      {ipObj.reverseDns}
                    </td>
                    <td className="px-6 py-3 text-slate-300 text-[11px]">
                      <span className="font-mono text-slate-400">AS{ipObj.asn}</span> {ipObj.asName}
                    </td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                        {ipObj.country}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-white">
                      {ipObj.volume.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-2 transition-all duration-300"
                            style={{ width: `${passPercent}%` }}
                          />
                          <div
                            className="bg-rose-500 h-2 transition-all duration-300"
                            style={{ width: `${100 - passPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-300 w-8 text-right">
                          {passPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Top Domains, Top Orgs, Top Countries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Header-From Domains */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Header-From Domains</h3>
          </div>
          <div className="space-y-3">
            {topDomains.map((dom, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300 truncate max-w-[180px]">{dom.domain}</span>
                <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                  {dom.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reporting Organizations */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Reporting Organizations</h3>
          </div>
          <div className="space-y-3">
            {topOrgs.map((org, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate max-w-[180px]">{org.org}</span>
                <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  {org.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Country Breakdown */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Origin Countries</h3>
          </div>
          <div className="space-y-3">
            {countries.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-slate-300">
                    {c.country}
                  </span>
                  <span className="text-slate-300 text-xs">Origin</span>
                </div>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {c.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
