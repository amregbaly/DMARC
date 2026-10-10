import React from 'react';
import { Mail, CheckCircle2, XCircle, ShieldAlert, Globe, Radio } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function KPIGrid({ overview }) {
  const { t, language } = useLanguage();
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

  const isEs = language === 'es';

  const cards = [
    {
      id: 'kpi-total-emails',
      title: t('kpi.totalMessages', 'Total Messages'),
      value: totalEmails.toLocaleString(),
      subtext: isEs
        ? `${passedEmails.toLocaleString()} autenticados`
        : `${passedEmails.toLocaleString()} passed auth`,
      icon: Mail,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20',
      trend: isEs ? '100% evaluado' : '100% evaluated'
    },
    {
      id: 'kpi-pass-rate',
      title: t('kpi.passRate', 'DMARC Pass Rate'),
      value: `${passRate}%`,
      subtext: isEs
        ? `${failedEmails.toLocaleString()} fallaron DMARC`
        : `${failedEmails.toLocaleString()} failed DMARC`,
      icon: CheckCircle2,
      iconColor: passRateColor,
      iconBg: passRateBg,
      highlight: true
    },
    {
      id: 'kpi-failures',
      title: isEs ? 'Fallos de DMARC' : 'DMARC Failures',
      value: failedEmails.toLocaleString(),
      subtext:
        totalEmails > 0
          ? `${((failedEmails / totalEmails) * 100).toFixed(1)}% ${isEs ? 'tasa de fallo' : 'failure rate'}`
          : '0%',
      icon: XCircle,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20',
      trend: failedEmails > 0 ? (isEs ? 'Requiere análisis' : 'Requires investigation') : (isEs ? 'Cero fallos' : 'Zero failures')
    },
    {
      id: 'kpi-affected',
      title: isEs ? 'Contenidos y Aplicados' : 'Contained & Enforced',
      value: affectedEmails.toLocaleString(),
      subtext: isEs
        ? `${quarantined} en cuarentena, ${rejected} rechazados`
        : `${quarantined} quarantined, ${rejected} rejected`,
      icon: ShieldAlert,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      trend: isEs ? 'Aplicación activa' : 'Enforcement active'
    },
    {
      id: 'kpi-domains',
      title: isEs ? 'Dominios Monitoreados' : 'Monitored Domains',
      value: domainsMonitored.toLocaleString(),
      subtext: isEs ? 'Políticas activas SPF/DKIM' : 'Active SPF/DKIM policies',
      icon: Globe,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      trend: isEs ? 'Remitentes verificados' : 'Verified senders'
    },
    {
      id: 'kpi-unique-ips',
      title: isEs ? 'IPs Remitentes Únicas' : 'Unique Sending IPs',
      value: uniqueIps.toLocaleString(),
      subtext: isEs ? 'Orígenes globales de envío' : 'Global source origins',
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
