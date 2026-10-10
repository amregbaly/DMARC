import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, FileJson, Check, X, ShieldAlert } from 'lucide-react';
import { fetchRecords } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

export default function RawLogExplorer({ selectedDomain }) {
  const { t, language } = useLanguage();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, search, selectedDomain]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchRecords({
        page,
        limit,
        search,
        domain: selectedDomain
      });
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <FileJson className="w-5 h-5 text-cyan-400" />
            {t('rawLogs.title', 'Raw Log & Record Explorer')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('rawLogs.subtitle', 'Search, filter, and inspect raw parsed DMARC XML aggregate documents stored in OpenSearch.')}
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('rawLogs.searchPlaceholder', 'Filter logs by IP, domain, selector, or disposition...')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-100 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </form>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-sans font-medium">
              <tr>
                <th className="px-5 py-3">{t('rawLogs.timestamp', 'Date')}</th>
                <th className="px-5 py-3">{t('rawLogs.headerFrom', 'Header From')}</th>
                <th className="px-5 py-3">{t('rawLogs.sourceIp', 'Sender IP')}</th>
                <th className="px-5 py-3">{t('rawLogs.reporter', 'Reporter')}</th>
                <th className="px-5 py-3 text-right">{t('rawLogs.messages', 'Messages')}</th>
                <th className="px-5 py-3 text-center">{t('rawLogs.spfResult', 'SPF')}</th>
                <th className="px-5 py-3 text-center">{t('rawLogs.dkimResult', 'DKIM')}</th>
                <th className="px-5 py-3 text-center">{t('rawLogs.dmarcResult', 'DMARC')}</th>
                <th className="px-5 py-3">{t('common.actions', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-5 py-8 text-center text-slate-400 font-sans">
                    Loading records from OpenSearch...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-5 py-8 text-center text-slate-400 font-sans">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {new Date(r.date_begin).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 font-semibold text-white font-sans">
                      {r.header_from}
                    </td>
                    <td className="px-5 py-3 text-cyan-300">
                      {r.source_ip_address}
                    </td>
                    <td className="px-5 py-3 text-slate-300 font-sans text-[11px] truncate max-w-[140px]">
                      {r.org_name}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-white">
                      {r.message_count?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r.spf_aligned ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {r.spf_aligned ? 'pass' : 'fail'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r.dkim_aligned ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {r.dkim_aligned ? 'pass' : 'fail'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.passed_dmarc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {r.passed_dmarc ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {r.disposition}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{records.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{total}</span> total documents
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            </button>
            <span className="font-mono text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-cyan-400" />
                  OpenSearch Document Inspector
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ID: {selectedRecord.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto font-mono text-xs">
              <pre className="bg-slate-950 p-4 rounded-xl text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed">
                {JSON.stringify(selectedRecord, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
