export type MediaCategory =
  | 'exterior'
  | 'interior'
  | 'menu_board'
  | 'signature_menu'
  | 'full_table'
  | 'food_detail'
  | 'cooking_process'
  | 'side_menu'
  | 'beverage'
  | 'service_point'
  | 'closing_cut'
  | 'person_or_other'
  | 'highlight_video';

export interface CategoryMeta {
  label: string;
  badgeClass: string;
  defaultTags: string[];
}

export const CATEGORY_META: Record<MediaCategory, CategoryMeta> = {
  exterior: {
    label: '외관',
    badgeClass: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
    defaultTags: ['간판', '입구', '건물외부'],
  },
  interior: {
    label: '매장내부',
    badgeClass: 'text-violet-300 bg-violet-400/10 border-violet-400/25',
    defaultTags: ['홀', '좌석', '인테리어'],
  },
  menu_board: {
    label: '메뉴판',
    badgeClass: 'text-yellow-300 bg-yellow-400/10 border-yellow-400/25',
    defaultTags: ['메뉴', '가격표'],
  },
  signature_menu: {
    label: '대표메뉴',
    badgeClass: 'text-orange-300 bg-orange-400/10 border-orange-400/25',
    defaultTags: ['대표메뉴', '시그니처'],
  },
  full_table: {
    label: '음식전체/상차림',
    badgeClass: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
    defaultTags: ['상차림', '세트', '전체구성'],
  },
  food_detail: {
    label: '음식디테일',
    badgeClass: 'text-red-300 bg-red-400/10 border-red-400/25',
    defaultTags: ['클로즈업', '디테일'],
  },
  cooking_process: {
    label: '조리과정',
    badgeClass: 'text-pink-300 bg-pink-400/10 border-pink-400/25',
    defaultTags: ['조리', '플레이팅', '서빙'],
  },
  side_menu: {
    label: '사이드메뉴',
    badgeClass: 'text-green-300 bg-green-400/10 border-green-400/25',
    defaultTags: ['사이드', '추가메뉴'],
  },
  beverage: {
    label: '음료/주류',
    badgeClass: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/25',
    defaultTags: ['음료', '주류', '디저트'],
  },
  service_point: {
    label: '서비스포인트',
    badgeClass: 'text-teal-300 bg-teal-400/10 border-teal-400/25',
    defaultTags: ['셀프바', '편의시설'],
  },
  closing_cut: {
    label: '마무리컷',
    badgeClass: 'text-indigo-300 bg-indigo-400/10 border-indigo-400/25',
    defaultTags: ['마무리', '총평'],
  },
  person_or_other: {
    label: '인물/기타',
    badgeClass: 'text-gray-400 bg-gray-400/10 border-gray-400/25',
    defaultTags: ['인물', '기타'],
  },
  highlight_video: {
    label: '하이라이트영상',
    badgeClass: 'text-purple-300 bg-purple-400/10 border-purple-400/25',
    defaultTags: ['영상'],
  },
};

export const ALL_IMAGE_CATEGORIES = (Object.keys(CATEGORY_META) as MediaCategory[]).filter(
  c => c !== 'highlight_video',
);

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as MediaCategory[];
