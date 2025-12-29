import type { Source, Insight, Report, Settings, AIProvider } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'https://loom-api-gateway.lsvjtpofj.workers.dev/api';

const AUTH_KEY = 'loom_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_KEY);
}

async function request<T>(path: string, options?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (options?.auth !== false) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} ${text}`);
  }
  return res.json();
}

export const api = {
  // Auth
  checkAuth: (password: string) =>
    fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${password}`,
      },
    }).then(r => r.json() as Promise<{ authenticated: boolean }>),

  // Sources (admin only)
  getSources: () => request<{ sources: Source[] }>('/sources').then(r => r.sources),

  addSource: (data: { type: string; name: string; url: string }) =>
    request<{ source: Source }>('/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.source),

  deleteSource: (id: string) =>
    request<{ ok: boolean }>(`/sources/${id}`, { method: 'DELETE' }),

  // Insights (public read)
  getInsights: (pillar?: string) => {
    const params = pillar ? `?pillar=${pillar}` : '';
    return request<{ insights: Insight[] }>(`/insights${params}`, { auth: false }).then(r => r.insights);
  },

  // Chat (admin only)
  chat: (query: string) =>
    request<{ answer: string; sources: Array<{ id: string; title: string; url: string }> }>(
      '/chat',
      { method: 'POST', body: JSON.stringify({ query }) }
    ),

  // Reports (public read)
  getReports: (type: 'daily' | 'weekly') =>
    request<{ reports: Report[] }>(`/reports/${type}`, { auth: false }).then(r => r.reports),

  // Settings (admin only)
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
