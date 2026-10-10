import React from 'react';
import { Shield, CheckCircle2, AlertCircle, ArrowRight, Info, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function PolicyReadiness({ policies = [] }) {
  const { t, language } = useLanguage();
  const isEs = language === 'es';

  function formatReadiness(val) {
    if (val === 'Ready') return isEs ? 'Listo' : 'Ready';
    if (val === 'In Review') return isEs ? 'En Revisión' : 'In Review';
    return isEs ? 'No Preparado' : val;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            {t('policies.title', 'DMARC Policy & Enforcement Readiness')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('policies.subtitle', 'Audit your published DNS records and simulate the security impact before transitioning to full rejection (`p=reject`).')}
          </p>
        </div>
      </div>

      {/* Policies Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            {isEs ? 'Políticas DMARC y Modos de Alineación' : 'Domain DMARC Policies & Alignment Modes'}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {isEs ? 'Registros DNS Evaluados' : 'DNS Records Evaluated'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-sans font-medium">
              <tr>
                <th className="px-6 py-3">{isEs ? 'Dominio' : 'Domain'}</th>
                <th className="px-6 py-3">{isEs ? 'Política (p=)' : 'Policy (p=)'}</th>
                <th className="px-6 py-3">{isEs ? 'Subdominio (sp=)' : 'Subdomain (sp=)'}</th>
                <th className="px-6 py-3">{isEs ? 'Aplicación (pct=)' : 'Enforcement (pct=)'}</th>
                <th className="px-6 py-3">{isEs ? 'Alineación (adkim/aspf)' : 'Alignment (adkim/aspf)'}</th>
                <th className="px-6 py-3 text-right">{isEs ? 'Total Mensajes' : 'Total Msgs'}</th>
                <th className="px-6 py-3">{isEs ? 'Tasa de Aprobación' : 'Pass Rate'}</th>
                <th className="px-6 py-3 font-sans">{isEs ? 'Preparación' : 'Readiness'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {policies.map((pol, idx) => {
                const isReady = pol.enforcementReadiness === 'Ready';
                const isInReview = pol.enforcementReadiness === 'In Review';
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white font-sans text-sm">
                      {pol.domain}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                          pol.policy === 'reject'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : pol.policy === 'quarantine'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            : 'bg-slate-800 border border-slate-700 text-slate-300'
                        }`}
                      >
                        {pol.policy}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {pol.subdomainPolicy}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {pol.percentage}%
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      DKIM: <span className="text-cyan-400 font-semibold">{pol.adkim}</span> / SPF: <span className="text-cyan-400 font-semibold">{pol.aspf}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {pol.totalMessages.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            pol.passRate >= 95
                              ? 'text-emerald-400'
                              : pol.passRate >= 80
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {pol.passRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-sans">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isReady
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : isInReview
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {formatReadiness(pol.enforcementReadiness)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phased Rollout Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-5 border-l-4 border-slate-600">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h4 className="font-semibold text-slate-200 text-sm">
              p=none ({isEs ? 'Monitoreo' : 'Monitoring'})
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEs
              ? 'Supervise informes agregados DMARC sin afectar la entrega. Identifique todos los proveedores de correo legítimos.'
              : 'Monitor incoming DMARC aggregate reports without affecting deliverability. Discover all legitimate sending services (e.g. Salesforce, SendGrid, Google Workspace).'}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <h4 className="font-semibold text-amber-300 text-sm">
              p=quarantine ({isEs ? 'Carpeta de Spam' : 'Spam Folder'})
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEs
              ? 'Los correos no autenticados se entregan en la carpeta de correo no deseado. Comience con pct=25 y aumente progresivamente hasta pct=100.'
              : 'Unauthenticated messages are delivered to the recipient\'s spam folder. Begin with `pct=25` and gradually ramp up to `pct=100` once legitimate senders are aligned.'}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <h4 className="font-semibold text-emerald-300 text-sm">
              p=reject ({isEs ? 'Protección Total' : 'Full Protection'})
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEs
              ? 'Los servidores de correo rechazan de plano cualquier correo no autorizado en el límite SMTP. Defensa total contra suplantación y phishing.'
              : 'Receiving servers completely reject unauthorized emails at the SMTP boundary. Total defense against brand impersonation and spoofing phishing attacks.'}
          </p>
        </div>
      </div>
    </div>
  );
}
