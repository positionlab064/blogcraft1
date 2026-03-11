import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { getDb } from '../db.js';
import crypto from 'crypto';

const router = Router();

// 음식점 전용 사진 카테고리
const CATEGORIES = ['exterior', 'interior', 'menu_board', 'signature_menu', 'full_table', 'food_detail', 'cooking_process', 'side_menu', 'beverage', 'service_point', 'closing_cut', 'person_or_other'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_DESC = `exterior(외관/간판/건물), interior(매장내부/홀/좌석/인테리어), menu_board(메뉴판/가격표), signature_menu(대표메뉴/시그니처 음식), full_table(상차림/음식전체/세트구성), food_detail(음식 클로즈업/디테일샷), cooking_process(조리과정/플레이팅/서빙), side_menu(사이드메뉴/추가메뉴), beverage(음료/주류/커피/칵테일/디저트), service_point(셀프바/편의시설), closing_cut(마무리컷), person_or_other(인물/기타)`;

interface PhotoInput {
  filename: string;
  base64: string;       // data:image/...;base64,... 또는 순수 base64
  mimeType?: string;    // 생략 시 자동 감지
}

interface PhotoResult {
  filename: string;
  category: Category;
  confidence: number;   // 0~1
  tags: string[];
  description: string;  // 짧은 설명
}

router.post('/classify', async (req: Request, res: Response) => {
  const { images } = req.body as { images: PhotoInput[] };

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'images 배열이 필요합니다.' });
  }

  if (images.length > 20) {
    return res.status(400).json({ error: '한 번에 최대 20장까지 처리할 수 있습니다.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' });
  }

  const openai = new OpenAI({ apiKey });
  const sessionId = crypto.randomUUID();
  const results: PhotoResult[] = [];
  const db = getDb();

  const insertPhoto = async (sessionId: string, filename: string, category: string, confidence: number) => {
    await db.query(
      'INSERT INTO classified_photos (session_id, filename, category, confidence) VALUES ($1, $2, $3, $4)',
      [sessionId, filename, category, confidence],
    );
  };

  for (const photo of images) {
    try {
      // base64 데이터 처리
      const base64Data = photo.base64.startsWith('data:')
        ? photo.base64
        : `data:${photo.mimeType ?? 'image/jpeg'};base64,${photo.base64}`;

      const prompt = `당신은 음식점 SNS 마케팅 전문가입니다. 이미지를 분석하여 아래 카테고리 중 하나로 분류하세요.

카테고리(반드시 영문 키 그대로 사용):
${CATEGORY_DESC}

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"category":"카테고리_키","confidence":0.0~1.0,"tags":["태그1","태그2","태그3"],"description":"한 줄 설명"}

중요: 음식/메뉴 사진은 최대한 구체적 카테고리(signature_menu, food_detail, full_table 등)로 분류하세요. person_or_other는 사람이 메인이거나 분류불가일 때만 사용하세요.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: base64Data } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 256,
      });

      const rawText = response.choices[0]?.message?.content ?? '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) throw new Error('JSON 파싱 실패');

      const parsed = JSON.parse(jsonMatch[0]) as {
        category: Category;
        confidence: number;
        tags?: string[];
        description: string;
      };

      const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'person_or_other';
      const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));
      const tags: string[] = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [];

      // DB 저장 실패가 분류 결과에 영향 주지 않도록 별도 처리
      insertPhoto(sessionId, photo.filename, category, confidence).catch(
        (e: unknown) => console.warn(`[photos] DB insert skipped (${photo.filename}):`, e instanceof Error ? e.message : e)
      );

      results.push({
        filename: photo.filename,
        category,
        confidence,
        tags,
        description: parsed.description ?? '',
      });
    } catch (err) {
      // 개별 이미지 실패 시 person_or_other로 처리
      const message = err instanceof Error ? err.message : '처리 실패';
      console.error(`[photos] ${photo.filename}:`, message);
      results.push({
        filename: photo.filename,
        category: 'person_or_other',
        confidence: 0,
        tags: [],
        description: '분류 실패',
      });
    }
  }

  // 카테고리별 그룹화
  const grouped = results.reduce<Record<string, PhotoResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return res.json({
    session_id: sessionId,
    total: results.length,
    results,
    grouped,
    summary: Object.entries(grouped).map(([cat, items]) => ({
      category: cat,
      count: items.length,
    })),
  });
});

// 세션별 분류 결과 조회
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT filename, category, confidence, created_at
       FROM classified_photos WHERE session_id = $1 ORDER BY created_at`,
      [req.params.sessionId],
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: '조회 실패' });
  }
});

export default router;
