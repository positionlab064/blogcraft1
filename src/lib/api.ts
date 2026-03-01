const BASE = '/api';

// ── 인증 토큰 관리 ───────────────────────────────────────────
let _token: string | null = null;

export function setAuthToken(token: string | null): void {
  _token = token;
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? '요청 실패');
  }
  return res.json() as Promise<T>;
}

// ── 타입 정의 ────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  phone: string | null;
  created_at?: string;
}

export interface AuthRes {
  token: string;
  user: User;
}

export type Platform = 'naver' | 'tistory' | 'wordpress';
export type Tone = 'casual' | 'professional' | 'informative';

export interface GenerateReq {
  keyword: string;
  platform: Platform;
  tone: Tone;
  tags?: string[];
}

export interface GenerateRes {
  id: number;
  keyword: string;
  platform: Platform;
  tone: Tone;
  title: string;
  meta_description: string;
  tags: string[];
  content: string;
  seo_score: number;
}

export interface HistoryItem {
  id: number;
  keyword: string;
  platform: string;
  tone: string;
  title: string;
  seo_score: number;
  created_at: string;
}

export interface PhotoInput {
  filename: string;
  base64: string;
}

export interface PhotoResult {
  filename: string;
  category: string;
  confidence: number;
  description: string;
}

export interface ClassifyRes {
  session_id: string;
  total: number;
  results: PhotoResult[];
  grouped: Record<string, PhotoResult[]>;
  summary: { category: string; count: number }[];
}

export interface SeoReq {
  keyword: string;
  title?: string;
  content: string;
  meta_description?: string;
}

export interface SeoIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
}

export interface SeoRes {
  score: number;
  keyword_density: number;
  word_count: number;
  issues: SeoIssue[];
  suggestions: string[];
  heading_count: number;
  has_meta_description: boolean;
}

// ── API 메서드 ───────────────────────────────────────────────
export const api = {
  // 인증
  login: (username: string, password: string) =>
    req<AuthRes>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  register: (email: string, password: string, username: string, name?: string, phone?: string) =>
    req<AuthRes>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, username, name, phone }) }),

  me: () => req<User>('/auth/me'),

  // 원고 생성
  generate: (data: GenerateReq) =>
    req<GenerateRes>('/generate', { method: 'POST', body: JSON.stringify(data) }),

  getHistory: () => req<HistoryItem[]>('/generate/history'),

  getContent: (id: number) => req<GenerateRes>(`/generate/${id}`),

  // 사진 분류
  classifyPhotos: (images: PhotoInput[]) =>
    req<ClassifyRes>('/photos/classify', { method: 'POST', body: JSON.stringify({ images }) }),

  // SEO 분석
  analyzeSeo: (data: SeoReq) =>
    req<SeoRes>('/seo/analyze', { method: 'POST', body: JSON.stringify(data) }),
};
