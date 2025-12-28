import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import ChatInput from '../components/ChatInput';
import InsightCard from '../components/InsightCard';
import { api } from '../services/api';
import type { Insight, Pillar } from '../types';

const pillars: Array<{ value: Pillar | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'career_business', label: 'Career & Business' },
  { value: 'market_startup', label: 'Market & Startup' },
  { value: 'self_growth', label: 'Self Growth' },
];

export default function Dashboard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAnswer, setChatAnswer] = useState('');
  const [filter, setFilter] = useState<Pillar | ''>('');

  useEffect(() => {
    let cancelled = false;

    const loadInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getInsights(filter || undefined);
        if (!cancelled) setInsights(data);
      } catch (err) {
        console.error('Failed to load insights:', err);
        if (!cancelled) setError('Failed to load insights. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInsights();
    return () => { cancelled = true; };
  }, [filter]);

  const handleSearch = async (query: string) => {
    setChatLoading(true);
    setChatAnswer('');
    try {
      const res = await api.chat(query);
      setChatAnswer(res.answer);
    } catch (err) {
      setChatAnswer('Error: ' + String(err));
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2 py-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          MyGrowth Radar
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Your personal intelligence system for growth insights
        </p>
      </div>

      <ChatInput onSearch={handleSearch} loading={chatLoading} />

      {chatAnswer && (
        <div className="max-w-2xl mx-auto p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{chatAnswer}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Latest Insights</h3>
        </div>
        <div className="flex gap-2">
          {pillars.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilter(p.value)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === p.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
          {insights.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white dark:bg-surface rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              No insights found. Add some sources to get started!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
