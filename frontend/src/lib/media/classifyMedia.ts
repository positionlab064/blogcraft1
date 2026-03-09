import { GoogleGenAI } from '@google/genai';
import { CATEGORY_META } from './categoryMeta';
import type { MediaCategory } from './categoryMeta';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ClassifiedMediaItem {
  id: string;
  file: File;
  previewUrl: string;
  fileName: string;
  fileType: 'image' | 'video';
  predictedCategory: MediaCategory;
  confirmedCategory: MediaCategory;
  confidence: number;
  tags: string[];
  isRepresentative: boolean;
  memo: string;
}

export interface SavePayload {
  storeId: string;
  media: {
    fileName: string;
    category: MediaCategory;
    confidence: number;
    tags: string[];
    isRepresentative: boolean;
    memo: string;
  }[];
}

// ─── Gemini Vision Classifier ───────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

const CATEGORY_LIST = `
exterior(외관/간판/건물), interior(매장내부/홀/좌석/인테리어),
menu_board(메뉴판/가격표), signature_menu(대표메뉴/시그니처 음식),
full_table(상차림/음식전체/세트구성), food_detail(음식 클로즈업/디테일샷),
cooking_process(조리과정/플레이팅/서빙), side_menu(사이드메뉴/추가메뉴),
beverage(음료/주류/커피/칵테일/디저트), service_point(셀프바/편의시설),
closing_cut(마무리컷), person_or_other(인물/기타)
`;

const PROMPT = `당신은 음식점 SNS 마케팅 전문가입니다. 아래 이미지를 보고 카테고리를 분류해주세요.

카테고리 목록:
${CATEGORY_LIST}

반드시 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만:
{"category": "카테고리_영문키", "confidence": 0.00~1.00 사이 숫자, "tags": ["태그1", "태그2", "태그3"]}`;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const VALID_CATEGORIES = new Set<string>([
  'exterior', 'interior', 'menu_board', 'signature_menu', 'full_table',
  'food_detail', 'cooking_process', 'side_menu', 'beverage',
  'service_point', 'closing_cut', 'person_or_other',
]);

async function classifyWithGemini(
  file: File,
): Promise<{ category: MediaCategory; confidence: number; tags: string[] }> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const base64 = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
        ],
      },
    ],
  });

  const text = response.text?.().trim() ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid Gemini response');

  const parsed = JSON.parse(jsonMatch[0]);
  const category = VALID_CATEGORIES.has(parsed.category)
    ? (parsed.category as MediaCategory)
    : 'person_or_other';
  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7));
  const tags: string[] = Array.isArray(parsed.tags)
    ? parsed.tags.slice(0, 5)
    : [...(CATEGORY_META[category]?.defaultTags ?? [])];

  return { category, confidence, tags };
}

// ─── Main Service Entry Point ───────────────────────────────────────────────

export async function classifyMedia(files: File[]): Promise<ClassifiedMediaItem[]> {
  const results = await Promise.all(
    files.map(async (file, index) => {
      const isVideo = file.type.startsWith('video/');

      let category: MediaCategory = 'person_or_other';
      let confidence = 0.7;
      let tags: string[] = [];

      if (isVideo) {
        category = 'highlight_video';
        confidence = 1.0;
        tags = ['영상'];
      } else {
        try {
          const result = await classifyWithGemini(file);
          category = result.category;
          confidence = result.confidence;
          tags = result.tags;
        } catch {
          tags = [...(CATEGORY_META[category]?.defaultTags ?? [])];
        }
      }

      return {
        id: `media-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: (isVideo ? 'video' : 'image') as 'image' | 'video',
        predictedCategory: category,
        confirmedCategory: category,
        confidence,
        tags,
        isRepresentative: false,
        memo: '',
      };
    }),
  );

  return results;
}

// ─── Save Payload Builder ───────────────────────────────────────────────────

export function buildSavePayload(storeId: string, items: ClassifiedMediaItem[]): SavePayload {
  return {
    storeId,
    media: items.map(item => ({
      fileName: item.fileName,
      category: item.confirmedCategory,
      confidence: item.confidence,
      tags: item.tags,
      isRepresentative: item.isRepresentative,
      memo: item.memo,
    })),
  };
}
