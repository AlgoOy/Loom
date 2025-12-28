import type { AIProvider } from '../../../../shared/types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string | null;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  raw: unknown;
}

export async function callAI(options: AIOptions, messages: ChatMessage[]): Promise<AIResponse> {
  switch (options.provider) {
    case 'openai': return callOpenAI(options, messages);
    case 'anthropic': return callAnthropic(options, messages);
    case 'gemini': return callGemini(options, messages);
    default: throw new Error(`Unsupported provider: ${options.provider}`);
  }
}

async function callOpenAI(options: AIOptions, messages: ChatMessage[]): Promise<AIResponse> {
  const url = `${options.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2000,
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${JSON.stringify(raw)}`);
  const content = (raw as any).choices?.[0]?.message?.content ?? '';
  return { content, raw };
}

async function callAnthropic(options: AIOptions, messages: ChatMessage[]): Promise<AIResponse> {
  const url = `${options.baseUrl || 'https://api.anthropic.com/v1'}/messages`;
  const systemMsg = messages.find(m => m.role === 'system');
  const filtered = messages.filter(m => m.role !== 'system');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.2,
      system: systemMsg?.content,
      messages: filtered.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${JSON.stringify(raw)}`);
  const content = (raw as any).content?.[0]?.text ?? '';
  return { content, raw };
}

async function callGemini(options: AIOptions, messages: ChatMessage[]): Promise<AIResponse> {
  const base = options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  const url = `${base}/models/${options.model}:generateContent?key=${options.apiKey}`;
  const systemMsg = messages.find(m => m.role === 'system')?.content;
  const userMessages = messages.filter(m => m.role !== 'system');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
      contents: userMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 2000,
      },
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${JSON.stringify(raw)}`);
  const content = (raw as any).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { content, raw };
}
