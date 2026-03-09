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

// ─── Mock Classifier ────────────────────────────────────────────────────────
//
// TODO: Replace mockClassifySingle() with a real Vision API call.
//
// Example (OpenAI Vision):
//   const res = await openai.chat.completions.create({
//     model: 'gpt-4o',
//     messages: [{
//       role: 'user',
//       content: [
//         { type: 'text', text: CLASSIFICATION_PROMPT },
//         { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
//       ],
//     }],
//   });
//   return parseAIResponse(res.choices[0].message.content);
//
// ───────────────────────────────────────────────────────────────────────────

const KEYWORD_RULES: { keywords: string[]; category: MediaCategory; confidence: number }[] = [
  { keywords: ['exterior', 'outside', 'outer', '외관', '간판', 'front'], category: 'exterior', confidence: 0.88 },
  { keywords: ['interior', 'inside', '내부', '홀', 'hall', 'room'], category: 'interior', confidence: 0.85 },
  { keywords: ['menu', '메뉴', 'board', 'price'], category: 'menu_board', confidence: 0.82 },
  { keywords: ['main', 'signature', '대표', 'special', 'feature'], category: 'signature_menu', confidence: 0.84 },
  { keywords: ['table', 'set', '상차림', 'full', 'spread', 'course'], category: 'full_table', confidence: 0.80 },
  { keywords: ['detail', 'close', 'closeup', '클로즈', 'macro'], category: 'food_detail', confidence: 0.83 },
  { keywords: ['cook', 'plate', 'plating', '조리', 'grill', 'serve'], category: 'cooking_process', confidence: 0.81 },
  { keywords: ['side', '사이드', 'extra', 'add'], category: 'side_menu', confidence: 0.79 },
  { keywords: ['drink', 'beverage', '음료', '주류', 'juice', 'beer', 'coffee', 'cafe'], category: 'beverage', confidence: 0.86 },
  { keywords: ['service', 'bar', '셀프', 'self', 'station', 'refill'], category: 'service_point', confidence: 0.78 },
  { keywords: ['closing', 'final', 'last', '마무리', 'end', 'outro'], category: 'closing_cut', confidence: 0.77 },
  { keywords: ['person', 'people', '인물', 'staff', 'chef', 'owner', 'other'], category: 'person_or_other', confidence: 0.75 },
];

const FALLBACK_ROTATION: MediaCategory[] = [
  'signature_menu',
  'food_detail',
  'exterior',
  'interior',
  'full_table',
  'beverage',
  'side_menu',
  'cooking_process',
];

function mockClassifySingle(
  file: File,
  index: number,
): { category: MediaCategory; confidence: number } {
  const name = file.name.toLowerCase().replace(/[-_.]/g, ' ');

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(kw => name.includes(kw))) {
      return { category: rule.category, confidence: rule.confidence };
    }
  }

  // Fallback: cycle through realistic categories
  const category = FALLBACK_ROTATION[index % FALLBACK_ROTATION.length];
  const confidence = Math.round((0.62 + Math.random() * 0.22) * 100) / 100;
  return { category, confidence };
}

// ─── Main Service Entry Point ───────────────────────────────────────────────
//
// To connect a real AI API: replace the body of this function.
// The interface (input: File[], output: ClassifiedMediaItem[]) stays the same.
//
export async function classifyMedia(files: File[]): Promise<ClassifiedMediaItem[]> {
  // Simulate async processing latency
  await new Promise(r => setTimeout(r, 600 + files.length * 70));

  return files.map((file, index) => {
    const isVideo = file.type.startsWith('video/');
    const { category, confidence } = isVideo
      ? { category: 'highlight_video' as MediaCategory, confidence: 1.0 }
      : mockClassifySingle(file, index);

    return {
      id: `media-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileType: isVideo ? 'video' : 'image',
      predictedCategory: category,
      confirmedCategory: category,
      confidence,
      tags: [...(CATEGORY_META[category]?.defaultTags ?? [])],
      isRepresentative: false,
      memo: '',
    };
  });
}

// ─── Save Payload Builder ───────────────────────────────────────────────────
//
// TODO: Pass payload to real API endpoint when backend is ready.
// Example: await api.saveMediaClassification(payload)
//
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
