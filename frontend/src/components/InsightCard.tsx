import { ArrowUpRight, Briefcase, TrendingUp, Lightbulb } from 'lucide-react';
import type { Insight, Pillar } from '../types';

interface Props {
  insight: Insight;
}

const pillarConfig: Record<Pillar, { label: string; icon: typeof Briefcase; color: string }> = {
  career_business: { label: 'Career & Business', icon: Briefcase, color: 'text-blue-500' },
  market_startup: { label: 'Market & Startup', icon: TrendingUp, color: 'text-green-500' },
  self_growth: { label: 'Self Growth', icon: Lightbulb, color: 'text-purple-500' },
};

export default function InsightCard({ insight }: Props) {
  const config = pillarConfig[insight.pillar];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color}`} />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {config.label}
            </span>
            {insight.maturity_rating && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                {insight.maturity_rating}
              </span>
            )}
          </div>
          <span className="text-lg font-bold text-primary">{insight.relevance_score}</span>
        </div>

        {insight.url && (
          <a href={insight.url} target="_blank" rel="noreferrer" className="group mb-3 block">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-500 transition-colors flex items-center gap-2">
              {insight.title || 'Untitled'}
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
          </a>
        )}

        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
          {insight.summary}
        </p>

        {insight.action_items.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Action Items
            </h4>
            <ul className="space-y-1">
              {insight.action_items.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {insight.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {insight.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
