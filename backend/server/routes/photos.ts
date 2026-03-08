import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { getDb } from '../db.js';
import crypto from 'crypto';

const router = Router();

// 지원하는 사진 카테고리
const CATEGORIES = ['음식', '풍경', '인물', '동물', '건물/인테리어', '제품', '텍스트/문서', '기타'] as const;
type Category = (typeof CATEGORIES)[number];

interface PhotoInput {
  filename: string;
  base64: string;       // data:image/...;base64,... 또는 순수 base64
  mimeType?: string;    // 생략 시 자동 감지
}

interface PhotoResult {
  filename: string;
  category: Category;
  confidence: number;   // 0~1
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

      const prompt = `이 이미지를 분석하여 다음 JSON 형식으로만 응답하세요:
{
  "category": "${CATEGORIES.join('" | "')}",
  "confidence": 0.0~1.0,
  "description": "이미지 내용 한 줄 설명 (20자 이내)"
}`;

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
        description: string;
      };

      const category = CATEGORIES.includes(parsed.category) ? parsed.category : '기타';
      const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));

      await insertPhoto(sessionId, photo.filename, category, confidence);

      results.push({
        filename: photo.filename,
        category,
        confidence,
        description: parsed.description ?? '',
      });
    } catch (err) {
      // 개별 이미지 실패 시 기타로 처리
      const message = err instanceof Error ? err.message : '처리 실패';
      console.error(`[photos] ${photo.filename}:`, message);
      results.push({
        filename: photo.filename,
        category: '기타',
        confidence: 0,
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
