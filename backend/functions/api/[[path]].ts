import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/cloudflare-pages';
import { SignJWT, jwtVerify } from 'jose';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';

// ── Types ────────────────────────────────────────────────────
type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
};

type Variables = {
  userId: number;
  userEmail: string;
};

// ── Password Hashing (Web Crypto PBKDF2) ────────────────────
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) return false;
  const [, saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  const hashHex2 = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === hashHex2;
}

// ── JWT Helpers ──────────────────────────────────────────────
function getSecret(jwtSecret: string) {
  return new TextEncoder().encode(jwtSecret);
}

async function signToken(userId: number, email: string, jwtSecret: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret(jwtSecret));
}

async function verifyToken(token: string, jwtSecret: string): Promise<{ userId: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(jwtSecret));
    return payload as { userId: number; email: string };
  } catch {
    return null;
  }
}

// ── Auth Middleware ──────────────────────────────────────────
async function requireAuth(c: any, next: any) {
  const auth = c.req.header('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '로그인이 필요합니다.' }, 401);
  }
  const payload = await verifyToken(auth.slice(7), c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: '토큰이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.' }, 401);
  }
  c.set('userId', payload.userId);
  c.set('userEmail', payload.email);
  return next();
}

// ── SEO Score Helper ─────────────────────────────────────────
function calcSeoScore(opts: { keyword: string; title: string; content: string; metaDescription: string }): number {
  const { keyword, title, content, metaDescription } = opts;
  let score = 0;
  if (title.includes(keyword)) score += 20;
  if (title.length >= 20 && title.length <= 60) score += 10;
  if (metaDescription.includes(keyword)) score += 10;
  if (metaDescription.length >= 120 && metaDescription.length <= 160) score += 10;
  if (content.length >= 600) score += 10;
  if (content.length >= 1000) score += 10;
  const words = content.replace(/[^가-힣a-zA-Z\s]/g, '').split(/\s+/).length;
  const occ = (content.match(new RegExp(keyword, 'g')) ?? []).length;
  const density = words > 0 ? (occ / words) * 100 : 0;
  if (density >= 1 && density <= 3) score += 15;
  else if (density > 0) score += 8;
  if (/#{2,3}\s/.test(content)) score += 10;
  if (/^[-*]\s/m.test(content)) score += 5;
  return Math.min(score, 100);
}

// ── SEO Analyze Helper ───────────────────────────────────────
function analyzeLocally(opts: { keyword: string; title: string; content: string; meta_description: string }) {
  const { keyword, title, content, meta_description } = opts;
  let score = 0;
  const issues: { type: string; message: string }[] = [];
  const suggestions: string[] = [];
  const word_count = content.replace(/[^\w가-힣]/g, ' ').split(/\s+/).filter(Boolean).length;
  const keywordOccurrences = (content.match(new RegExp(keyword, 'g')) ?? []).length;
  const keyword_density = word_count > 0 ? parseFloat(((keywordOccurrences / word_count) * 100).toFixed(2)) : 0;

  if (!title) {
    issues.push({ type: 'error', message: '제목이 없습니다.' });
  } else {
    if (title.includes(keyword)) score += 20;
    else {
      issues.push({ type: 'warning', message: `제목에 키워드 "${keyword}"가 없습니다.` });
      suggestions.push(`제목에 키워드 "${keyword}"를 포함시켜 클릭률을 높이세요.`);
    }
    if (title.length < 20) issues.push({ type: 'warning', message: '제목이 너무 짧습니다. (20자 이상 권장)' });
    else if (title.length > 60) issues.push({ type: 'warning', message: '제목이 너무 깁니다. (60자 이하 권장)' });
    else score += 10;
  }

  const has_meta_description = meta_description.length > 0;
  if (!has_meta_description) {
    issues.push({ type: 'warning', message: '메타 설명이 없습니다.' });
    suggestions.push('메타 설명(150~160자)을 추가하면 검색 노출 클릭률이 향상됩니다.');
  } else {
    if (meta_description.includes(keyword)) score += 10;
    if (meta_description.length >= 120 && meta_description.length <= 160) score += 10;
  }

  if (word_count < 300) issues.push({ type: 'error', message: `본문이 너무 짧습니다. (현재 ${word_count}자)` });
  else if (word_count < 600) { issues.push({ type: 'warning', message: `본문 길이가 부족합니다.` }); score += 10; }
  else { score += 20; if (word_count >= 1000) score += 5; }

  if (keywordOccurrences === 0) issues.push({ type: 'error', message: `본문에 키워드 "${keyword}"가 없습니다.` });
  else if (keyword_density < 0.5) { issues.push({ type: 'warning', message: `키워드 밀도가 낮습니다. (${keyword_density}%)` }); score += 5; }
  else if (keyword_density > 5) { issues.push({ type: 'warning', message: `키워드가 과도합니다. (${keyword_density}%)` }); score += 5; }
  else score += 15;

  const heading_count = (content.match(/#{1,3}\s.+/g) ?? []).length;
  if (heading_count === 0) {
    issues.push({ type: 'warning', message: '소제목(H2, H3)이 없습니다.' });
    suggestions.push('소제목을 2~5개 추가하면 SEO에 유리합니다.');
  } else { score += 10; if (heading_count >= 3) score += 5; }

  if (/^[-*\d]\.\s/m.test(content)) score += 5;
  else suggestions.push('목록을 추가하면 가독성이 높아집니다.');

  return { score: Math.min(score, 100), keyword_density, word_count, issues, suggestions, heading_count, has_meta_description };
}

// ── Naver Keyword Scraping ───────────────────────────────────
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';
const BASE_HEADERS = { Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'ko-KR,ko;q=0.9' };

async function scrapeSearchResults(keyword: string) {
  const url = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}&start=1`;
  const res = await fetch(url, { headers: { ...BASE_HEADERS, 'User-Agent': DESKTOP_UA, Referer: 'https://search.naver.com/' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  const posts: any[] = [];
  let rank = 1;
  for (const el of $('.total_wrap, li.bx, .lst_total > li').toArray()) {
    if (posts.length >= 10) break;
    const item = $(el);
    const titleEl = item.find('a.title_link, a.api_txt_lines').first();
    const href = titleEl.attr('href') || item.find('a[href*="blog.naver.com"]').first().attr('href') || '';
    const title = titleEl.text().trim();
    if (!href || !title) continue;
    const m = href.match(/blog\.naver\.com\/([^\/\?&]+)\/(\d+)/);
    if (!m) continue;
    const [, blogId, postNo] = m;
    const blogName = item.find('.name').first().text().trim() || blogId;
    const date = item.find('.sub_txt .date, .etc_dsc .date, .date').first().text().trim() || '';
    posts.push({ rank: rank++, blogId, postNo, blogName, title, date, url: `https://blog.naver.com/${blogId}/${postNo}` });
  }
  return posts;
}

async function scrapePostDetail(blogId: string, postNo: string) {
  try {
    const res = await fetch(`https://m.blog.naver.com/${blogId}/${postNo}`, {
      headers: { ...BASE_HEADERS, 'User-Agent': MOBILE_UA, Referer: 'https://m.blog.naver.com/' },
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const content = $('.se-main-container, #postListBody, .post_ct, .sect_dsc').first();
    const charCount = content.text().replace(/\s+/g, '').length;
    const imageCount = content.find('img').filter((_, img) => {
      const src = $(img).attr('src') || '';
      return src.length > 0 && !src.includes('icon') && !src.includes('btn');
    }).length;
    const hashtagCount = content.find('.se-hashtag, a[href*="hashtag"]').length;
    return { charCount, imageCount, hashtagCount, likeCount: 0, commentCount: 0 };
  } catch {
    return { charCount: 0, imageCount: 0, hashtagCount: 0, likeCount: 0, commentCount: 0 };
  }
}

// ── App ──────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', cors({
  origin: ['https://blogcraft1.pages.dev', 'http://localhost:3000'],
  credentials: true,
}));

// ── Health ───────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Auth Routes ──────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/auth/register', async (c) => {
  const { email, password, name, username, phone } = await c.req.json<any>();
  if (!email?.trim() || !password) return c.json({ error: '이메일과 비밀번호를 입력해주세요.' }, 400);
  if (!username?.trim()) return c.json({ error: '아이디를 입력해주세요.' }, 400);
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) return c.json({ error: '아이디는 영문, 숫자, 밑줄(_)만 사용 가능하며 3~20자여야 합니다.' }, 400);
  if (!EMAIL_RE.test(email)) return c.json({ error: '올바른 이메일 형식이 아닙니다.' }, 400);
  if (password.length < 6) return c.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, 400);

  const normalEmail = email.toLowerCase().trim();
  const normalUsername = username.trim().toLowerCase();
  const db = c.env.DB;

  const existing = await db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').bind(normalEmail, normalUsername).first<any>();
  if (existing) return c.json({ error: '이미 사용 중인 이메일 또는 아이디입니다.' }, 409);

  const passwordHash = await hashPassword(password);
  const result = await db.prepare('INSERT INTO users (email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?)').bind(normalEmail, normalUsername, passwordHash, name?.trim() || null, phone?.trim() || null).run();

  const token = await signToken(Number(result.meta.last_row_id), normalEmail, c.env.JWT_SECRET);
  return c.json({ token, user: { id: Number(result.meta.last_row_id), email: normalEmail, username: normalUsername, name: name?.trim() || null, phone: phone?.trim() || null } }, 201);
});

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json<any>();
  if (!username?.trim() || !password) return c.json({ error: '아이디와 비밀번호를 입력해주세요.' }, 400);

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username.toLowerCase().trim()).first<any>();
  if (!user) return c.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return c.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);

  const token = await signToken(user.id, user.email, c.env.JWT_SECRET);
  return c.json({ token, user: { id: user.id, email: user.email, username: user.username, name: user.name, phone: user.phone } });
});

app.get('/api/auth/me', requireAuth, async (c) => {
  const user = await c.env.DB.prepare('SELECT id, email, username, name, phone, created_at FROM users WHERE id = ?').bind(c.get('userId')).first<any>();
  if (!user) return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404);
  return c.json(user);
});

// ── Generate Routes ──────────────────────────────────────────
const PLATFORM_STYLES: Record<string, string> = {
  naver: '네이버 블로그 스타일로, 구어체를 사용하고 문단을 짧게 나누며 이모지를 적절히 활용합니다.',
  tistory: '티스토리 블로그 스타일로, 정보 전달에 집중하고 소제목과 목록을 자주 사용합니다.',
  wordpress: '워드프레스 블로그 스타일로, 전문적이고 깔끔한 문체를 사용하며 SEO에 최적화된 구조로 작성합니다.',
};
const TONE_STYLES: Record<string, string> = {
  casual: '친근하고 편안한 말투',
  professional: '전문적이고 신뢰감 있는 말투',
  informative: '정보 전달에 충실한 설명체',
};

app.post('/api/generate', requireAuth, async (c) => {
  const { keyword, platform = 'naver', tone = 'casual', tags = [] } = await c.req.json<any>();
  if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) return c.json({ error: '키워드를 입력해주세요.' }, 400);

  const apiKey = c.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, 500);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const tagsText = tags.length > 0 ? `관련 태그: ${tags.join(', ')}` : '';
    const prompt = `당신은 한국 블로그 전문 작가입니다.\n\n주제 키워드: "${keyword}"\n${tagsText}\n플랫폼 스타일: ${PLATFORM_STYLES[platform] ?? PLATFORM_STYLES.naver}\n말투: ${TONE_STYLES[tone] ?? TONE_STYLES.casual}\n\n다음 JSON 형식으로만 응답하세요:\n{\n  "title": "SEO 최적화된 블로그 제목 (키워드 포함, 30~50자)",\n  "meta_description": "검색 결과에 표시될 설명문 (키워드 포함, 150~160자)",\n  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],\n  "content": "완성된 블로그 본문 (마크다운 형식, 800~1500자, 소제목 3~5개 포함)"\n}`;

    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { temperature: 0.8, maxOutputTokens: 2048 } });
    const rawText = response.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON을 파싱하지 못했습니다.');
    const generated = JSON.parse(jsonMatch[0]) as any;
    const seoScore = calcSeoScore({ keyword, title: generated.title, content: generated.content, metaDescription: generated.meta_description });

    const result = await c.env.DB.prepare('INSERT INTO generated_content (keyword, platform, tone, title, content, meta_description, tags, seo_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(keyword, platform, tone, generated.title, generated.content, generated.meta_description, JSON.stringify(generated.tags), seoScore).run();

    return c.json({ id: result.meta.last_row_id, keyword, platform, tone, title: generated.title, meta_description: generated.meta_description, tags: generated.tags, content: generated.content, seo_score: seoScore });
  } catch (err) {
    return c.json({ error: `원고 생성에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}` }, 500);
  }
});

app.get('/api/generate/history', requireAuth, async (c) => {
  const rows = await c.env.DB.prepare('SELECT id, keyword, platform, tone, title, seo_score, created_at FROM generated_content ORDER BY created_at DESC LIMIT 50').all();
  return c.json(rows.results);
});

app.get('/api/generate/:id', requireAuth, async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM generated_content WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ error: '해당 원고를 찾을 수 없습니다.' }, 404);
  return c.json(row);
});

// ── SEO Routes ───────────────────────────────────────────────
app.post('/api/seo/analyze', requireAuth, async (c) => {
  const { keyword, title = '', content, meta_description = '' } = await c.req.json<any>();
  if (!keyword || !content) return c.json({ error: 'keyword와 content는 필수입니다.' }, 400);

  const result = analyzeLocally({ keyword, title, content, meta_description });

  const apiKey = c.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `다음 블로그 글의 SEO를 분석하여 개선 제안 3가지만 JSON 배열로 제시하세요.\n키워드: "${keyword}"\n제목: "${title}"\n현재 SEO 점수: ${result.score}점\n\n응답 형식 (JSON 배열만):\n["제안1", "제안2", "제안3"]`;
      const resp = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { temperature: 0.3, maxOutputTokens: 512 } });
      const raw = resp.text ?? '';
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        const suggestions = JSON.parse(m[0]) as string[];
        if (Array.isArray(suggestions)) result.suggestions = [...result.suggestions, ...suggestions.slice(0, 3)];
      }
    } catch {}
  }

  await c.env.DB.prepare('INSERT INTO seo_analyses (keyword, title, content_length, score, issues, suggestions, keyword_density) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(keyword, title, content.length, result.score, JSON.stringify(result.issues), JSON.stringify(result.suggestions), result.keyword_density).run();

  return c.json(result);
});

// ── Keyword Routes ───────────────────────────────────────────
app.post('/api/keyword/analyze', requireAuth, async (c) => {
  const { keyword } = await c.req.json<any>();
  if (!keyword?.trim()) return c.json({ error: '키워드를 입력해주세요.' }, 400);

  try {
    const basics = await scrapeSearchResults(keyword.trim());
    if (basics.length === 0) return c.json({ keyword, results: [], crawledAt: new Date().toISOString() });

    const results = [];
    for (let i = 0; i < basics.length; i += 3) {
      const batch = basics.slice(i, i + 3);
      const batchResults = await Promise.all(batch.map(p => scrapePostDetail(p.blogId, p.postNo).then(d => ({ ...p, ...d }))));
      results.push(...batchResults);
      if (i + 3 < basics.length) await new Promise(r => setTimeout(r, 400));
    }

    return c.json({ keyword, results, crawledAt: new Date().toISOString() });
  } catch (err) {
    return c.json({ error: '크롤링 중 오류가 발생했습니다.' }, 500);
  }
});

// ── Photos Routes ─────────────────────────────────────────────
const CATEGORIES = ['음식', '풍경', '인물', '동물', '건물/인테리어', '제품', '텍스트/문서', '기타'] as const;

app.post('/api/photos/classify', requireAuth, async (c) => {
  const { images } = await c.req.json<any>();
  if (!Array.isArray(images) || images.length === 0) return c.json({ error: 'images 배열이 필요합니다.' }, 400);
  if (images.length > 20) return c.json({ error: '한 번에 최대 20장까지 처리할 수 있습니다.' }, 400);

  const apiKey = c.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, 500);

  const ai = new GoogleGenAI({ apiKey });
  const sessionId = crypto.randomUUID();
  const results: any[] = [];

  for (const photo of images) {
    try {
      const base64Data = photo.base64.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeType = photo.mimeType ?? (photo.base64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg');
      const prompt = `이 이미지를 분석하여 아래 카테고리 중 하나로 분류하세요.\n\n카테고리 목록:\n${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n{"category": "카테고리명", "confidence": 0.9, "description": "한 줄 설명"}`;
      const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }], config: { temperature: 0.1, maxOutputTokens: 200, responseMimeType: 'application/json' } });
      const rawText = response.text ?? '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`JSON 파싱 실패: ${rawText.slice(0, 100)}`);
      const parsed = JSON.parse(jsonMatch[0]) as any;
      const category = CATEGORIES.includes(parsed.category) ? parsed.category : '기타';
      const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));
      await c.env.DB.prepare('INSERT INTO classified_photos (session_id, filename, category, confidence) VALUES (?, ?, ?, ?)').bind(sessionId, photo.filename, category, confidence).run();
      results.push({ filename: photo.filename, category, confidence, description: parsed.description ?? '', raw: parsed.category });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      results.push({ filename: photo.filename, category: '기타', confidence: 0, description: `분류 실패: ${errMsg.slice(0, 50)}` });
    }
  }

  const grouped = results.reduce<Record<string, any[]>>((acc, r) => { if (!acc[r.category]) acc[r.category] = []; acc[r.category].push(r); return acc; }, {});
  return c.json({ session_id: sessionId, total: results.length, results, grouped, summary: Object.entries(grouped).map(([cat, items]) => ({ category: cat, count: items.length })) });
});

app.get('/api/photos/session/:sessionId', requireAuth, async (c) => {
  const rows = await c.env.DB.prepare('SELECT filename, category, confidence, created_at FROM classified_photos WHERE session_id = ? ORDER BY created_at').bind(c.req.param('sessionId')).all();
  return c.json(rows.results);
});

export const onRequest = handle(app);
