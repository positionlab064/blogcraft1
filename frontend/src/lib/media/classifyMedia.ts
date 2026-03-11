import { api } from '../api';
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

export interface PostDraft {
  postIndex: number;
  items: ClassifiedMediaItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>([
  'exterior', 'interior', 'menu_board', 'signature_menu', 'full_table',
  'food_detail', 'cooking_process', 'side_menu', 'beverage',
  'service_point', 'closing_cut', 'person_or_other',
]);

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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main Service Entry Point ───────────────────────────────────────────────

const BATCH_SIZE = 10; // 백엔드 한도(20) 이내로 배치 처리

export async function classifyMedia(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<ClassifiedMediaItem[]> {
  const results: ClassifiedMediaItem[] = [];
  let done = 0;

  for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
    const batch = files.slice(batchStart, batchStart + BATCH_SIZE);
    const imageFiles = batch.filter(f => !f.type.startsWith('video/'));
    const videoFiles = batch.filter(f => f.type.startsWith('video/'));

    // 비디오는 즉시 처리
    for (const file of videoFiles) {
      const globalIndex = batchStart + batch.indexOf(file);
      results.push({
        id: `media-${Date.now()}-${globalIndex}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: 'video',
        predictedCategory: 'highlight_video',
        confirmedCategory: 'highlight_video',
        confidence: 1.0,
        tags: ['영상'],
        isRepresentative: false,
        memo: '',
      });
      done++;
      onProgress?.(done, files.length);
    }

    // 이미지는 백엔드 API 통해 분류
    if (imageFiles.length > 0) {
      const images = await Promise.all(
        imageFiles.map(async file => ({
          filename: file.name,
          base64: await fileToBase64(file),
          mimeType: file.type,
        })),
      );

      try {
        const res = await api.classifyPhotos(images);
        const resultMap = new Map(res.results.map(r => [r.filename, r]));

        imageFiles.forEach((file, i) => {
          const globalIndex = batchStart + batch.indexOf(file);
          const apiResult = resultMap.get(file.name);
          const category = (apiResult && VALID_CATEGORIES.has(apiResult.category))
            ? apiResult.category as MediaCategory
            : 'person_or_other';
          const confidence = apiResult?.confidence ?? 0.5;
          const tags = apiResult?.tags?.length
            ? apiResult.tags
            : [...(CATEGORY_META[category]?.defaultTags ?? [])];

          results.push({
            id: `media-${Date.now()}-${globalIndex}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            file,
            previewUrl: URL.createObjectURL(file),
            fileName: file.name,
            fileType: 'image',
            predictedCategory: category,
            confirmedCategory: category,
            confidence,
            tags,
            isRepresentative: false,
            memo: '',
          });
          done++;
          onProgress?.(done, files.length);
        });
      } catch (err) {
        console.error('[classifyMedia] batch failed:', err);
        imageFiles.forEach((file, i) => {
          const globalIndex = batchStart + batch.indexOf(file);
          results.push({
            id: `media-${Date.now()}-${globalIndex}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            file,
            previewUrl: URL.createObjectURL(file),
            fileName: file.name,
            fileType: 'image',
            predictedCategory: 'person_or_other',
            confirmedCategory: 'person_or_other',
            confidence: 0.5,
            tags: [...(CATEGORY_META['person_or_other']?.defaultTags ?? [])],
            isRepresentative: false,
            memo: '',
          });
          done++;
          onProgress?.(done, files.length);
        });
      }
    }

    if (batchStart + BATCH_SIZE < files.length) {
      await sleep(500);
    }
  }

  return results;
}

// ─── Post Distribution ──────────────────────────────────────────────────────

/**
 * 블로그 게시물 섹션 구조 및 사진 수 범위.
 * categories 배열 앞쪽 카테고리 사진을 우선 사용.
 */
const BLOG_SECTIONS = [
  { key: 'exterior',       categories: ['exterior'] as MediaCategory[],                       min: 2, max: 4  },
  { key: 'interior',       categories: ['interior', 'service_point'] as MediaCategory[],      min: 4, max: 8  },
  { key: 'menu_board',     categories: ['menu_board'] as MediaCategory[],                     min: 1, max: 2  },
  { key: 'signature_menu', categories: ['signature_menu', 'full_table'] as MediaCategory[],   min: 6, max: 12 },
  { key: 'food_detail',    categories: ['food_detail', 'cooking_process'] as MediaCategory[], min: 5, max: 10 },
  { key: 'side_menu',      categories: ['side_menu', 'beverage'] as MediaCategory[],          min: 2, max: 5  },
  { key: 'closing_cut',    categories: ['closing_cut'] as MediaCategory[],                    min: 1, max: 2  },
];

/**
 * 전체 사진을 N개 게시물에 섹션 비율 기반으로 배분.
 */
export function distributeIntoPosts(
  items: ClassifiedMediaItem[],
  postCount: number,
): PostDraft[] {
  if (postCount <= 0 || items.length === 0) return [];

  const imageItems = items.filter(i => i.fileType === 'image');
  const videoItems = items.filter(i => i.fileType === 'video');

  const photosPerPost = Math.round(imageItems.length / postCount);
  const totalMidpoints = BLOG_SECTIONS.reduce((sum, s) => sum + (s.min + s.max) / 2, 0);
  const targetsPerPost = BLOG_SECTIONS.map(s => {
    const mid = (s.min + s.max) / 2;
    return Math.max(s.min, Math.min(s.max, Math.round(photosPerPost * (mid / totalMidpoints))));
  });

  const assigned = new Set<string>();
  const sectionPools = BLOG_SECTIONS.map(section =>
    section.categories.flatMap(cat => imageItems.filter(item => item.confirmedCategory === cat)),
  );

  const posts: ClassifiedMediaItem[][] = Array.from({ length: postCount }, () => []);

  BLOG_SECTIONS.forEach((_, sIdx) => {
    const pool = sectionPools[sIdx].filter(item => !assigned.has(item.id));
    const target = targetsPerPost[sIdx];
    for (let p = 0; p < postCount; p++) {
      const slice = pool.slice(p * target, p * target + target);
      for (const item of slice) {
        posts[p].push(item);
        assigned.add(item.id);
      }
    }
  });

  imageItems
    .filter(item => !assigned.has(item.id))
    .forEach((item, idx) => posts[idx % postCount].push(item));

  videoItems.forEach(v => posts[0]?.push(v));

  return posts
    .map((postItems, i) => ({ postIndex: i + 1, items: postItems }))
    .filter(p => p.items.length > 0);
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
