import React from 'react';
import { Mail, CheckCircle2, XCircle, ShieldAlert, Globe, Radio } from 'lucide-react';

export default function KPIGrid({ overview }) {
  if (!overview) return null;

  const {
    totalEmails = 0,
    passedEmails = 0,
    failedEmails = 0,
    passRate = 0,
    affectedEmails = 0,
    quarantined = 0,
    rejected = 0,
    domainsMonitored = 0,
    uniqueIps = 0
  } = overview;

  const passRateColor =
    passRate >= 95
      ? 'text-emerald-400'
      : passRate >= 85
      ? 'text-amber-400'
      : 'text-rose-400';

  const passRateBg =
    passRate >= 95
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : passRate >= 85
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-rose-500/10 border-rose-500/20';

  const cards = [
    {
      id: 'kpi-total-emails',
      title: 'Total Messages',
      value: totalEmails.toLocaleString(),
      subtext: `${passedEmails.toLocaleString()} passed auth`,
      icon: Mail,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20',
      trend: '100% evaluated'
    },
    {
      id: 'kpi-pass-rate',
      title: 'DMARC Pass Rate',
      value: `${passRate}%`,
      subtext: `${failedEmails.toLocaleString()} failed DMARC`,
      icon: CheckCircle2,
      iconColor: passRateColor,
      iconBg: passRateBg,
      highlight: true
    },
    {
      id: 'kpi-failures',
      title: 'DMARC Failures',
      value: failedEmails.toLocaleString(),
      subtext: totalEmails > 0 ? `${((failedEmails / totalEmails) * 100).toFixed(1)}% failure rate` : '0%',
      icon: XCircle,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20',
      trend: failedEmails > 0 ? 'Requires investigation' : 'Zero failures'
    },
    {
      id: 'kpi-affected',
      title: 'Contained & Enforced',
      value: affectedEmails.toLocaleString(),
      subtext: `${quarantined} quarantined, ${rejected} rejected`,
      icon: ShieldAlert,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      trend: 'Enforcement active'
    },
    {
      id: 'kpi-domains',
      title: 'Monitored Domains',
      value: domainsMonitored.toLocaleString(),
      subtext: 'Active SPF/DKIM policies',
      icon: Globe,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      trend: 'Verified senders'
    },
    {
      id: 'kpi-unique-ips',
      title: 'Unique Sending IPs',
      value: uniqueIps.toLocaleString(),
      subtext: 'Global source origins',
      icon: Radio,
      iconColor: 'text-teal-400',
      iconBg: 'bg-teal-500/10 border-teal-500/20',
      trend: 'Resolved to ASNs'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Top row */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className={`p-2 rounded-xl border ${card.iconBg}`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>

            {/* Metric Value */}
            <div>
              <div className={`text-2xl font-bold tracking-tight text-white mb-1 ${card.highlight ? card.iconColor : ''}`}>
                {card.value}
              </div>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {card.subtext}
              </p>
            </div>

            {/* Subtle glow highlight behind card */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
}
