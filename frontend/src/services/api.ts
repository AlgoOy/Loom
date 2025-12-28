import type { Source, Insight, Report, Settings, AIProvider } from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} ${text}`);
  }
  return res.json();
}

export const api = {
  // Sources
  getSources: () => request<{ sources: Source[] }>('/sources').then(r => r.sources),

  addSource: (data: { type: string; name: string; url: string }) =>
    request<{ source: Source }>('/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.source),

  deleteSource: (id: string) =>
    request<{ ok: boolean }>(`/sources/${id}`, { method: 'DELETE' }),

  // Insights
  getInsights: (pillar?: string) => {
    const params = pillar ? `?pillar=${pillar}` : '';
    return request<{ insights: Insight[] }>(`/insights${params}`).then(r => r.insights);
  },

  // Chat
  chat: (query: string) =>
    request<{ answer: string; sources: Array<{ id: string; title: string; url: string }> }>(
      '/chat',
      { method: 'POST', body: JSON.stringify({ query }) }
    ),

  // Reports
  getReports: (type: 'daily' | 'weekly') =>
    request<{ reports: Report[] }>(`/reports/${type}`).then(r => r.reports),

  // Settings
  getSettings: () => request<Settings>('/settings'),

  saveSettings: (data: {
    provider: AIProvider;
    model: string;
    api_key: string;
    base_url?: string;
  }) =>
    request<{ ok: boolean }>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
