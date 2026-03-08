import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { getDb } from '../db.js';

const router = Router();

interface SeoIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
}

interface SeoResult {
  score: number;
  keyword_density: number;
  word_count: number;
  issues: SeoIssue[];
  suggestions: string[];
  heading_count: number;
  has_meta_description: boolean;
}

router.post('/analyze', async (req: Request, res: Response) => {
  const { keyword, title = '', content, meta_description = '' } = req.body as {
    keyword: string;
    title?: string;
    content: string;
    meta_description?: string;
  };

  if (!keyword || !content) {
    return res.status(400).json({ error: 'keyword와 content는 필수입니다.' });
  }

  try {
    const result = analyzeLocally({ keyword, title, content, meta_description });

    // OpenAI로 추가 제안 생성
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey });
        const aiSuggestions = await getAiSuggestions(openai, { keyword, title, content, result });
        result.suggestions = [...result.suggestions, ...aiSuggestions];
      } catch {
        // AI 제안 실패 시 기본 제안만 사용
      }
    }

    // DB 저장
    const db = getDb();
    await db.query(
      `INSERT INTO seo_analyses (keyword, title, content_length, score, issues, suggestions, keyword_density)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [keyword, title, content.length, result.score, JSON.stringify(result.issues), JSON.stringify(result.suggestions), result.keyword_density],
    );

    return res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return res.status(500).json({ error: `SEO 분석 실패: ${message}` });
  }
});

function analyzeLocally(opts: {
  keyword: string;
  title: string;
  content: string;
  meta_description: string;
}): SeoResult {
  const { keyword, title, content, meta_description } = opts;
  let score = 0;
  const issues: SeoIssue[] = [];
  const suggestions: string[] = [];

  // 단어 수 계산 (한글 포함)
  const word_count = content.replace(/[^\w가-힣]/g, ' ').split(/\s+/).filter(Boolean).length;

  // 키워드 밀도
  const keywordOccurrences = (content.match(new RegExp(keyword, 'g')) ?? []).length;
  const keyword_density = word_count > 0 ? parseFloat(((keywordOccurrences / word_count) * 100).toFixed(2)) : 0;

  // --- 제목 검사 ---
  if (!title) {
    issues.push({ type: 'error', message: '제목이 없습니다.' });
  } else {
    if (title.includes(keyword)) {
      score += 20;
    } else {
      issues.push({ type: 'warning', message: `제목에 키워드 "${keyword}"가 없습니다.` });
      suggestions.push(`제목에 키워드 "${keyword}"를 포함시켜 클릭률을 높이세요.`);
    }

    if (title.length < 20) {
      issues.push({ type: 'warning', message: '제목이 너무 짧습니다. (20자 이상 권장)' });
    } else if (title.length > 60) {
      issues.push({ type: 'warning', message: '제목이 너무 깁니다. 검색 결과에서 잘릴 수 있습니다. (60자 이하 권장)' });
    } else {
      score += 10;
    }
  }

  // --- 메타 설명 검사 ---
  const has_meta_description = meta_description.length > 0;
  if (!has_meta_description) {
    issues.push({ type: 'warning', message: '메타 설명이 없습니다. 검색 결과 CTR에 영향을 줍니다.' });
    suggestions.push('메타 설명(150~160자)을 추가하면 검색 노출 클릭률이 향상됩니다.');
  } else {
    if (meta_description.includes(keyword)) score += 10;
    else suggestions.push(`메타 설명에 키워드 "${keyword}"를 포함하세요.`);

    if (meta_description.length < 120) {
      issues.push({ type: 'info', message: '메타 설명이 짧습니다. 150~160자를 권장합니다.' });
    } else if (meta_description.length > 160) {
      issues.push({ type: 'warning', message: '메타 설명이 너무 깁니다. 검색 결과에서 잘릴 수 있습니다.' });
    } else {
      score += 10;
    }
  }

  // --- 본문 길이 ---
  if (word_count < 300) {
    issues.push({ type: 'error', message: `본문이 너무 짧습니다. (현재 ${word_count}자, 최소 300자 권장)` });
  } else if (word_count < 600) {
    issues.push({ type: 'warning', message: `본문 길이가 부족합니다. (현재 ${word_count}자, 600자 이상 권장)` });
    score += 10;
  } else {
    score += 20;
    if (word_count >= 1000) score += 5;
  }

  // --- 키워드 밀도 ---
  if (keywordOccurrences === 0) {
    issues.push({ type: 'error', message: `본문에 키워드 "${keyword}"가 없습니다.` });
  } else if (keyword_density < 0.5) {
    issues.push({ type: 'warning', message: `키워드 밀도가 낮습니다. (${keyword_density}%, 1~3% 권장)` });
    score += 5;
  } else if (keyword_density > 5) {
    issues.push({ type: 'warning', message: `키워드가 과도하게 반복됩니다. (${keyword_density}%) 스팸으로 판정될 수 있습니다.` });
    score += 5;
  } else {
    score += 15;
  }

  // --- 소제목 검사 ---
  const headingMatches = content.match(/#{1,3}\s.+/g) ?? [];
  const heading_count = headingMatches.length;

  if (heading_count === 0) {
    issues.push({ type: 'warning', message: '소제목(H2, H3)이 없습니다. 구조화된 글이 SEO에 유리합니다.' });
    suggestions.push('소제목을 2~5개 추가하면 검색엔진이 콘텐츠 구조를 더 잘 이해합니다.');
  } else {
    score += 10;
    if (heading_count >= 3) score += 5;
  }

  // --- 목록 검사 ---
  const hasList = /^[-*\d]\.\s/m.test(content);
  if (!hasList) {
    suggestions.push('목록(리스트)을 추가하면 가독성과 스캔 가능성이 높아집니다.');
  } else {
    score += 5;
  }

  return {
    score: Math.min(score, 100),
    keyword_density,
    word_count,
    issues,
    suggestions,
    heading_count,
    has_meta_description,
  };
}

async function getAiSuggestions(
  openai: OpenAI,
  opts: {
    keyword: string;
    title: string;
    content: string;
    result: SeoResult;
  },
): Promise<string[]> {
  const { keyword, title, content, result } = opts;
  const contentPreview = content.substring(0, 500);

  const prompt = `다음 블로그 글의 SEO를 분석하여 개선 제안 3가지만 JSON 배열로 제시하세요.

키워드: "${keyword}"
제목: "${title}"
현재 SEO 점수: ${result.score}점
현재 문제점: ${result.issues.map((i) => i.message).join(', ')}

본문 미리보기:
${contentPreview}

응답 형식 (JSON 배열만):
["제안1", "제안2", "제안3"]`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 512,
  });

  const rawText = response.choices[0]?.message?.content ?? '';
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const suggestions = JSON.parse(jsonMatch[0]) as string[];
  return Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
}

export default router;
