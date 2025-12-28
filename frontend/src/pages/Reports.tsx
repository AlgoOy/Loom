import { useEffect, useState } from 'react';
import { FileText, Calendar, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { Report } from '../types';

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports(activeTab);
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h2>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['daily', 'weekly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white dark:bg-surface text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-surface border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {report.type}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(report.period_start)} - {formatDate(report.period_end)}
                </div>
              </div>

              <div className="text-sm font-medium text-blue-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                View Report →
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white dark:bg-surface rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              No {activeTab} reports generated yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
