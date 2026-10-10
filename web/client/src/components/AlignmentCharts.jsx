import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Check, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const ALIGNED_COLORS = {
  aligned: '#10b981', // emerald-500
  unaligned: '#f43f5e' // rose-500
};

const DISPOSITION_COLORS = {
  none: '#3b82f6', // blue-500
  quarantine: '#f59e0b', // amber-500
  reject: '#ef4444' // red-500
};

export default function AlignmentCharts({ alignment }) {
  const { t, language } = useLanguage();
  if (!alignment) return null;

  const isEs = language === 'es';
  const { spfAligned = [], dkimAligned = [], disposition = [], matrix = {} } = alignment;

  // Transform SPF data for donut
  const spfData = spfAligned.map((item) => ({
    name: item.aligned
      ? (isEs ? 'SPF Alineado' : 'SPF Aligned')
      : (isEs ? 'SPF No Alineado' : 'SPF Unaligned'),
    value: item.count,
    color: item.aligned ? ALIGNED_COLORS.aligned : ALIGNED_COLORS.unaligned
  }));

  // Transform DKIM data for donut
  const dkimData = dkimAligned.map((item) => ({
    name: item.aligned
      ? (isEs ? 'DKIM Alineado' : 'DKIM Aligned')
      : (isEs ? 'DKIM No Alineado' : 'DKIM Unaligned'),
    value: item.count,
    color: item.aligned ? ALIGNED_COLORS.aligned : ALIGNED_COLORS.unaligned
  }));

  // Transform disposition
  const dispData = disposition.map((item) => ({
    name: item.type.toUpperCase(),
    value: item.count,
    color: DISPOSITION_COLORS[item.type.toLowerCase()] || '#64748b'
  }));

  const totalMatrix = (matrix.both || 0) + (matrix.dkimOnly || 0) + (matrix.spfOnly || 0) + (matrix.neither || 0);

  const getPercent = (count) => (totalMatrix > 0 ? ((count / totalMatrix) * 100).toFixed(1) : 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs">
          <p className="font-semibold text-slate-200">{data.name}</p>
          <p className="text-cyan-400 font-mono mt-0.5">
            {data.value.toLocaleString()} {isEs ? 'mensajes' : 'messages'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            {t('alignment.title', 'Authentication & Alignment Breakdown')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('alignment.subtitle', 'DMARC requires either SPF or DKIM to be aligned with the Header From domain.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SPF Alignment Card */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">
              {isEs ? 'Alineación SPF' : 'SPF Alignment'}
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              Return-Path / Header
            </span>
          </div>

          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spfData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {spfData.map((entry, index) => (
                    <Cell key={`spf-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            {spfData.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-300 text-[11px] truncate">{d.name}</span>
                </div>
                <span className="font-mono text-slate-100 font-semibold text-[11px]">
                  {d.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* DKIM Alignment Card */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">
              {isEs ? 'Alineación DKIM' : 'DKIM Alignment'}
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              d= Tag / Header
            </span>
          </div>

          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dkimData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dkimData.map((entry, index) => (
                    <Cell key={`dkim-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            {dkimData.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-300 text-[11px] truncate">{d.name}</span>
                </div>
                <span className="font-mono text-slate-100 font-semibold text-[11px]">
                  {d.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Receiver Disposition */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">
              {isEs ? 'Acción de Aplicación' : 'Enforcement Action'}
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {isEs ? 'Veredicto Receptor' : 'Receiver Verdict'}
            </span>
          </div>

          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dispData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dispData.map((entry, index) => (
                    <Cell key={`disp-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800 text-xs">
            {dispData.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-1 rounded-lg bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-300 text-[11px]">{d.name}</span>
                </div>
                <span className="font-mono text-slate-100 font-semibold text-[11px]">
                  {d.value.toLocaleString()} ({getPercent(d.value)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4-Way Alignment Matrix */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
          <span>{t('alignment.spfDkimComparison', 'Authentication Alignment Matrix')}</span>
          <span className="text-xs text-slate-400 font-normal">
            {isEs ? 'Evaluación combinada de SPF y DKIM' : 'How messages passed or failed DMARC'}
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Both Pass */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400">
                {t('alignment.bothAligned', 'Both Aligned')}
              </span>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono">{matrix.both?.toLocaleString() || 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {getPercent(matrix.both)}% — {isEs ? 'Estándar de oro (SPF y DKIM válidos)' : 'Gold standard (SPF & DKIM pass)'}
            </div>
          </div>

          {/* DKIM Only */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-cyan-400">
                {t('alignment.dkimOnly', 'DKIM Only Aligned')}
              </span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">DMARC Pass</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">{matrix.dkimOnly?.toLocaleString() || 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {getPercent(matrix.dkimOnly)}% — {isEs ? 'Protegido por firma criptográfica DKIM' : 'Saved by DKIM cryptographic signature'}
            </div>
          </div>

          {/* SPF Only */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-400">
                {t('alignment.spfOnly', 'SPF Only Aligned')}
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">DMARC Pass</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">{matrix.spfOnly?.toLocaleString() || 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {getPercent(matrix.spfOnly)}% — {isEs ? 'Protegido por IP autorizada en SPF' : 'Saved by authorized sending IP'}
            </div>
          </div>

          {/* Neither Aligned */}
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-400">
                {t('alignment.neither', 'Neither Aligned')}
              </span>
              <X className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono">{matrix.neither?.toLocaleString() || 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {getPercent(matrix.neither)}% — {isEs ? 'Fallo DMARC (Suplantación o Error)' : 'DMARC Failure (Spoof or Misconfig)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
