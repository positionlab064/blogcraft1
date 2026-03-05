import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { getDb } from '../db.js';

const router = Router();

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

router.post('/', async (req: Request, res: Response) => {
  const { keyword, platform = 'naver', tone = 'casual', tags = [] } = req.body;

  if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
    return res.status(400).json({ error: '키워드를 입력해주세요.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const platformStyle = PLATFORM_STYLES[platform] ?? PLATFORM_STYLES.naver;
    const toneStyle = TONE_STYLES[tone] ?? TONE_STYLES.casual;
    const tagsText = tags.length > 0 ? `관련 태그: ${tags.join(', ')}` : '';

    const prompt = `당신은 한국 블로그 전문 작가입니다. 다음 조건에 맞게 블로그 포스팅을 작성해주세요.

주제 키워드: "${keyword}"
${tagsText}
플랫폼 스타일: ${platformStyle}
말투: ${toneStyle}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "SEO 최적화된 블로그 제목 (키워드 포함, 30~50자)",
  "meta_description": "검색 결과에 표시될 설명문 (키워드 포함, 150~160자)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "content": "완성된 블로그 본문 (마크다운 형식, 800~1500자, 소제목 3~5개 포함)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    });

    const rawText = response.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 파싱하지 못했습니다.');
    }

    const generated = JSON.parse(jsonMatch[0]) as {
      title: string;
      meta_description: string;
      tags: string[];
      content: string;
    };

    // SEO 점수 계산
    const seoScore = calcSeoScore({
      keyword,
      title: generated.title,
      content: generated.content,
      metaDescription: generated.meta_description,
    });

    // DB 저장
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO generated_content (keyword, platform, tone, title, content, meta_description, tags, seo_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      keyword,
      platform,
      tone,
      generated.title,
      generated.content,
      generated.meta_description,
      JSON.stringify(generated.tags),
      seoScore,
    );

    return res.json({
      id: result.lastInsertRowid,
      keyword,
      platform,
      tone,
      title: generated.title,
      meta_description: generated.meta_description,
      tags: generated.tags,
      content: generated.content,
      seo_score: seoScore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[generate] error:', message);
    return res.status(500).json({ error: `원고 생성에 실패했습니다: ${message}` });
  }
});

// 생성 히스토리 조회
router.get('/history', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, keyword, platform, tone, title, seo_score, created_at
         FROM generated_content ORDER BY created_at DESC LIMIT 50`,
      )
      .all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: '히스토리 조회 실패' });
  }
});

// 특정 원고 조회
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db
      .prepare('SELECT * FROM generated_content WHERE id = ?')
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: '해당 원고를 찾을 수 없습니다.' });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: '조회 실패' });
  }
});

function calcSeoScore(opts: {
  keyword: string;
  title: string;
  content: string;
  metaDescription: string;
}): number {
  const { keyword, title, content, metaDescription } = opts;
  let score = 0;

  // 제목에 키워드 포함 (20점)
  if (title.includes(keyword)) score += 20;

  // 제목 길이 (10점)
  if (title.length >= 20 && title.length <= 60) score += 10;

  // 메타 설명에 키워드 포함 (10점)
  if (metaDescription.includes(keyword)) score += 10;

  // 메타 설명 길이 (10점)
  if (metaDescription.length >= 120 && metaDescription.length <= 160) score += 10;

  // 본문 길이 (20점)
  if (content.length >= 600) score += 10;
  if (content.length >= 1000) score += 10;

  // 본문 내 키워드 밀도 (15점)
  const words = content.replace(/[^가-힣a-zA-Z\s]/g, '').split(/\s+/).length;
  const keywordOccurrences = (content.match(new RegExp(keyword, 'g')) ?? []).length;
  const density = words > 0 ? (keywordOccurrences / words) * 100 : 0;
  if (density >= 1 && density <= 3) score += 15;
  else if (density > 0) score += 8;

  // 소제목(H2/H3) 포함 (10점)
  if (/#{2,3}\s/.test(content)) score += 10;

  // 목록 포함 (5점)
  if (/^[-*]\s/m.test(content)) score += 5;

  return Math.min(score, 100);
}

export default router;
