import { Globe, Rss, Trash2, ExternalLink } from 'lucide-react';
import type { Source } from '../types';

interface Props {
  source: Source;
  onDelete: (id: string) => void;
}

export default function SourceCard({ source, onDelete }: Props) {
  const Icon = source.type === 'rss' ? Rss : Globe;

  return (
    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{source.name}</h3>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1"
          >
            {source.url.length > 50 ? source.url.slice(0, 50) + '...' : source.url}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            source.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {source.status}
        </span>
        <button
          onClick={() => onDelete(source.id)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
