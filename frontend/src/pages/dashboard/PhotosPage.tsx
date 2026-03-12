import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Image, Upload, Loader2, X, AlertCircle, Save, RotateCcw, Check,
  ChevronDown, Layers, ChevronRight, ChevronLeft, Download,
} from 'lucide-react';
import JSZip from 'jszip';
import { classifyMedia, buildSavePayload, distributeIntoPosts } from '../../lib/media/classifyMedia';
import type { ClassifiedMediaItem, PostDraft } from '../../lib/media/classifyMedia';
import { CATEGORY_META, ALL_IMAGE_CATEGORIES } from '../../lib/media/categoryMeta';
import type { MediaCategory } from '../../lib/media/categoryMeta';

// 블로그 원고 흐름 순서
const CATEGORY_FLOW_ORDER: MediaCategory[] = [
  'exterior', 'interior', 'service_point', 'menu_board',
  'signature_menu', 'full_table', 'food_detail', 'cooking_process',
  'side_menu', 'beverage', 'closing_cut', 'person_or_other', 'highlight_video',
];

function sanitizeLabel(label: string): string {
  return label.replace(/\//g, '_').replace(/\s+/g, '');
}

function getExt(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
}
import MediaCard from '../../components/photos/MediaCard';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_PHOTOS_PER_POST = 20;
const MAX_PHOTOS_PER_POST = 50;

type FilterTab = 'all' | MediaCategory;
type PageView = 'classify' | 'distribute';

interface UploadedFile {
  file: File;
  previewUrl: string;
}

// ─── Post Preview Card ──────────────────────────────────────────────────────
function PostPreviewCard({ draft }: { draft: PostDraft }) {
  const catCounts = new Map<MediaCategory, number>();
  draft.items.forEach(item => {
    const cat = item.confirmedCategory;
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  });
  const thumbs = draft.items.slice(0, 6);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">게시물 {draft.postIndex}</span>
        <span className="text-xs text-gray-500">{draft.items.length}장</span>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-6 gap-1 mb-3">
        {thumbs.map(item => (
          <div key={item.id} className="aspect-square rounded-md overflow-hidden bg-white/[0.04]">
            <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        {draft.items.length > 6 && (
          <div className="aspect-square rounded-md bg-white/[0.04] flex items-center justify-center col-span-1 relative -ml-1">
            <span className="text-xs text-gray-500">+{draft.items.length - 6}</span>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-1">
        {[...catCounts.entries()].map(([cat, count]) => {
          const meta = CATEGORY_META[cat];
          return (
            <span
              key={cat}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${meta.badgeClass}`}
            >
              {meta.label} {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function PhotosPage() {
  // ── Upload state ────────────────────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Classification state ────────────────────────────────────────────────
  const [classifiedItems, setClassifiedItems] = useState<ClassifiedMediaItem[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState<{ done: number; total: number } | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────
  const [pageView, setPageView] = useState<PageView>('classify');
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('all');
  const [bulkCategory, setBulkCategory] = useState<MediaCategory | ''>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // ── Distribution state ──────────────────────────────────────────────────
  const [postCount, setPostCount] = useState(3);
  const [postDrafts, setPostDrafts] = useState<PostDraft[]>([]);
  const [isDistributed, setIsDistributed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Upload handlers ─────────────────────────────────────────────────────
  const addFiles = useCallback((files: File[]) => {
    const invalid = files.filter(f => !ACCEPTED_MIME.includes(f.type));
    const valid = files.filter(f => ACCEPTED_MIME.includes(f.type));
    if (invalid.length > 0) {
      setErrorMessage(`${invalid.length}개 파일이 지원되지 않는 형식입니다. (JPG, PNG, WebP만 가능)`);
    }
    if (valid.length === 0) return;
    setUploadedFiles(prev => [
      ...prev,
      ...valid.map(file => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  }, []);

  const removeUploadedFile = (idx: number) => {
    setUploadedFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearAll = () => {
    uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    classifiedItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setUploadedFiles([]);
    setClassifiedItems([]);
    setSelectedFilter('all');
    setErrorMessage(null);
    setIsSaved(false);
    setBulkCategory('');
    setPageView('classify');
    setPostDrafts([]);
    setIsDistributed(false);
    setClassifyProgress(null);
  };

  // ── Classify ────────────────────────────────────────────────────────────
  const handleClassify = async () => {
    if (uploadedFiles.length === 0) return;
    setIsClassifying(true);
    setErrorMessage(null);
    setIsSaved(false);
    setClassifyProgress({ done: 0, total: uploadedFiles.length });

    try {
      const items = await classifyMedia(
        uploadedFiles.map(f => f.file),
        (done, total) => setClassifyProgress({ done, total }),
      );
      setClassifiedItems(items);
      setSelectedFilter('all');
      // Auto-calculate suggested post count
      const imageCount = items.filter(i => i.fileType === 'image').length;
      const suggested = Math.max(1, Math.ceil(imageCount / 30));
      setPostCount(suggested);
      uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
      setUploadedFiles([]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '분류 중 오류가 발생했습니다.');
    } finally {
      setIsClassifying(false);
      setClassifyProgress(null);
    }
  };

  // ── Card CRUD ───────────────────────────────────────────────────────────
  const updateItem = (id: string, patch: Partial<ClassifiedMediaItem>) => {
    setClassifiedItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
    setIsSaved(false);
    setIsDistributed(false);
  };

  const removeItem = (id: string) => {
    setClassifiedItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
    setIsDistributed(false);
  };

  // ── Bulk category change ─────────────────────────────────────────────────
  const handleBulkApply = () => {
    if (!bulkCategory) return;
    const cat = bulkCategory as MediaCategory;
    const visibleIds = new Set(filteredItems.map(i => i.id));
    setClassifiedItems(prev =>
      prev.map(item => visibleIds.has(item.id) ? { ...item, confirmedCategory: cat } : item),
    );
    setBulkCategory('');
    setIsSaved(false);
    setIsDistributed(false);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const payload = buildSavePayload('store-demo', classifiedItems);
    localStorage.setItem('classified_media_draft', JSON.stringify(payload));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // ── Distribution ─────────────────────────────────────────────────────────
  const handleDistribute = () => {
    const drafts = distributeIntoPosts(classifiedItems, postCount);
    setPostDrafts(drafts);
    setIsDistributed(true);
  };

  const handleSaveDistribution = () => {
    localStorage.setItem('post_drafts', JSON.stringify(
      postDrafts.map(d => ({
        postIndex: d.postIndex,
        photoCount: d.items.length,
        categories: [...new Set(d.items.map(i => i.confirmedCategory))],
        fileNames: d.items.map(i => i.fileName),
      })),
    ));
  };

  const handleDownloadDistribution = async () => {
    setIsDownloading(true);
    try {
      handleSaveDistribution();
      const zip = new JSZip();
      const multiPost = postDrafts.length > 1;

      for (const draft of postDrafts) {
        // 원고 흐름 순서로 정렬
        const sortedItems = [...draft.items].sort((a, b) => {
          const aIdx = CATEGORY_FLOW_ORDER.indexOf(a.confirmedCategory);
          const bIdx = CATEGORY_FLOW_ORDER.indexOf(b.confirmedCategory);
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        });

        // 이 게시물에 등장하는 카테고리 순서 번호 부여 (흐름 순)
        const catOrderMap = new Map<MediaCategory, number>();
        sortedItems.forEach(item => {
          if (!catOrderMap.has(item.confirmedCategory)) {
            catOrderMap.set(item.confirmedCategory, catOrderMap.size + 1);
          }
        });

        const catSeq = new Map<MediaCategory, number>();
        const folder = multiPost ? zip.folder(`게시물${draft.postIndex}`)! : zip;

        for (const item of sortedItems) {
          const order = catOrderMap.get(item.confirmedCategory)!;
          const seq = (catSeq.get(item.confirmedCategory) ?? 0) + 1;
          catSeq.set(item.confirmedCategory, seq);
          const label = sanitizeLabel(CATEGORY_META[item.confirmedCategory].label);
          const ext = getExt(item.fileName);
          const newName = `${order}.${label}_${String(seq).padStart(2, '0')}.${ext}`;
          const buffer = await item.file.arrayBuffer();
          folder.file(newName, buffer);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '').replace('.', '');
      a.download = `사진배분_${today}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Computed values ──────────────────────────────────────────────────────
  const usedCategories = [...new Set(classifiedItems.map(i => i.confirmedCategory))] as MediaCategory[];
  const filteredItems =
    selectedFilter === 'all'
      ? classifiedItems
      : classifiedItems.filter(i => i.confirmedCategory === selectedFilter);
  const hasResults = classifiedItems.length > 0;
  const imageCount = classifiedItems.filter(i => i.fileType === 'image').length;
  const maxPostCount = Math.floor(imageCount / MIN_PHOTOS_PER_POST);
  const minPostCount = Math.max(1, Math.ceil(imageCount / MAX_PHOTOS_PER_POST));
  const photosPerPost = postCount > 0 ? Math.round(imageCount / postCount) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">사진 자동 분류</h1>
          <p className="text-gray-500 text-sm">
            AI가 음식점 사진을 카테고리별로 분류하고 게시물에 자동 배분합니다.
          </p>
        </div>

        {/* View toggle */}
        {hasResults && (
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
            <button
              onClick={() => setPageView('classify')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                pageView === 'classify'
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Image size={12} /> 분류 결과
            </button>
            <button
              onClick={() => setPageView('distribute')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                pageView === 'distribute'
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Layers size={12} /> 게시물 배분
            </button>
          </div>
        )}
      </div>

      {/* ── Upload Zone ── */}
      {!hasResults && (
        <>
          <div
            className={`glass-card rounded-2xl p-8 border-2 border-dashed transition-all cursor-pointer mb-5 ${
              isDragging
                ? 'border-primary/60 bg-primary/[0.04] scale-[1.01]'
                : 'border-white/[0.08] hover:border-white/20'
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ''; } }}
            />
            <div className="flex flex-col items-center text-center pointer-events-none">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-primary/30' : 'bg-white/[0.04]'}`}>
                <Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-600'} />
              </div>
              <p className="text-white font-medium mb-1">
                {isDragging ? '여기에 놓으세요!' : '사진을 끌어다 놓거나 클릭하여 선택'}
              </p>
              <p className="text-gray-600 text-sm">JPG, PNG, WebP · 개수 제한 없음</p>
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="glass-card rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-300">{uploadedFiles.length}장 선택됨</span>
                <button onClick={clearAll} className="text-xs text-gray-600 hover:text-red-400 transition-colors">전체 제거</button>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-4">
                {uploadedFiles.map((f, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img src={f.previewUrl} alt={f.file.name} className="w-full h-full object-cover rounded-lg border border-white/[0.07]" />
                    <button
                      onClick={e => { e.stopPropagation(); removeUploadedFile(idx); }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/90 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={9} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleClassify}
                disabled={isClassifying}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Image size={16} /> AI 분류 시작 ({uploadedFiles.length}장)
              </button>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="glass-card rounded-2xl p-4 border border-red-500/20 bg-red-500/5 text-red-400 text-sm mb-5 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Results Panel ── */}
      {hasResults && pageView === 'classify' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Toolbar */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-300">총 {classifiedItems.length}장</span>
                <span className="text-xs text-gray-600">· 대표사진 {classifiedItems.filter(i => i.isRepresentative).length}장</span>
                <span className="text-xs text-gray-700">· {usedCategories.length}개 카테고리</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Bulk category */}
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <select
                      value={bulkCategory}
                      onChange={e => setBulkCategory(e.target.value as MediaCategory | '')}
                      className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg pl-2.5 pr-7 py-1.5 text-gray-400 focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
                    >
                      <option value="">{selectedFilter === 'all' ? '전체 일괄변경...' : `${CATEGORY_META[selectedFilter as MediaCategory]?.label ?? ''} 일괄변경...`}</option>
                      {ALL_IMAGE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="bg-[#0f0f1a]">{CATEGORY_META[cat].label}</option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" />
                  </div>
                  {bulkCategory && (
                    <button onClick={handleBulkApply} className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium">적용</button>
                  )}
                </div>

                <button
                  onClick={() => { classifiedItems.forEach(item => URL.revokeObjectURL(item.previewUrl)); setClassifiedItems([]); setSelectedFilter('all'); setIsSaved(false); setIsDistributed(false); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
                >
                  <RotateCcw size={12} /> 재업로드
                </button>

                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${isSaved ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'btn-primary'}`}
                >
                  {isSaved ? <><Check size={12} /> 저장됨</> : <><Save size={12} /> 저장</>}
                </button>

                <button onClick={clearAll} className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1.5">초기화</button>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-all ${selectedFilter === 'all' ? 'bg-white/10 border-white/20 text-white font-medium' : 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/10'}`}
            >
              전체 {classifiedItems.length}
            </button>
            {usedCategories.map(cat => {
              const count = classifiedItems.filter(i => i.confirmedCategory === cat).length;
              const meta = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedFilter(cat)}
                  className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-all ${selectedFilter === cat ? `${meta.badgeClass} font-medium` : 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/10'}`}
                >
                  {meta.label} {count}
                </button>
              );
            })}
          </div>

          {/* Card grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredItems.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}>
                    <MediaCard item={item} onChange={updateItem} onRemove={removeItem} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-sm">이 카테고리에 해당하는 사진이 없습니다.</p>
              <button onClick={() => setSelectedFilter('all')} className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors">전체 보기</button>
            </div>
          )}

          {/* Go to distribute CTA */}
          <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">게시물 배분 준비 완료</p>
              <p className="text-xs text-gray-500 mt-0.5">분류된 {imageCount}장을 게시물별로 자동 배분합니다</p>
            </div>
            <button
              onClick={() => setPageView('distribute')}
              className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
            >
              게시물 배분 <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Distribution Panel ── */}
      {hasResults && pageView === 'distribute' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Back button */}
          <button
            onClick={() => setPageView('classify')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={14} /> 분류 결과로 돌아가기
          </button>

          {/* Settings card */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">게시물 배분 설정</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Post count input */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 whitespace-nowrap">게시물 수</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPostCount(c => Math.max(minPostCount, c - 1))}
                    className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-gray-300 hover:bg-white/10 transition-colors"
                  >-</button>
                  <span className="text-lg font-bold text-white w-8 text-center">{postCount}</span>
                  <button
                    onClick={() => setPostCount(c => Math.min(maxPostCount || 999, c + 1))}
                    className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-gray-300 hover:bg-white/10 transition-colors"
                  >+</button>
                </div>
                <span className="text-xs text-gray-600">개</span>
              </div>

              {/* Info */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>총 <span className="text-white font-medium">{imageCount}</span>장</span>
                <span>·</span>
                <span>게시물당 약 <span className="text-white font-medium">{photosPerPost}</span>장</span>
                {photosPerPost < MIN_PHOTOS_PER_POST && (
                  <span className="text-yellow-400">⚠ 게시물당 {MIN_PHOTOS_PER_POST}장 미만</span>
                )}
                {photosPerPost > MAX_PHOTOS_PER_POST && (
                  <span className="text-yellow-400">⚠ 게시물당 {MAX_PHOTOS_PER_POST}장 초과</span>
                )}
              </div>

              <button
                onClick={handleDistribute}
                className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 whitespace-nowrap"
              >
                <Layers size={14} /> 배분 실행
              </button>
            </div>

            {/* Range hint */}
            {imageCount >= MIN_PHOTOS_PER_POST && (
              <p className="text-xs text-gray-600 mt-3">
                권장 범위: {minPostCount}~{maxPostCount || postCount}개 게시물
                (게시물당 {MIN_PHOTOS_PER_POST}~{MAX_PHOTOS_PER_POST}장 기준)
              </p>
            )}
          </div>

          {/* Distribution result */}
          {isDistributed && postDrafts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  <span className="text-white font-medium">{postDrafts.length}개 게시물</span>로 배분 완료
                </p>
                <button
                  onClick={handleDownloadDistribution}
                  disabled={isDownloading}
                  className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading
                    ? <><Loader2 size={12} className="animate-spin" /> 준비 중...</>
                    : <><Download size={12} /> 배분 저장 및 다운로드</>}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {postDrafts.map(draft => (
                  <PostPreviewCard key={draft.postIndex} draft={draft} />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Loading state */}
      {isClassifying && (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center min-h-[280px]">
          <Loader2 size={32} className="text-primary animate-spin mb-4" />
          <p className="text-gray-300 font-medium mb-1">AI가 사진을 분석하고 있습니다</p>
          {classifyProgress && (
            <p className="text-gray-500 text-sm mb-3">
              {classifyProgress.done} / {classifyProgress.total}장 완료
            </p>
          )}
          {classifyProgress && (
            <div className="w-48 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(classifyProgress.done / classifyProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isClassifying && !hasResults && uploadedFiles.length === 0 && (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center min-h-[280px]">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Image size={26} className="text-gray-700" />
          </div>
          <p className="text-gray-400 font-medium mb-1">분류 결과가 여기에 표시됩니다</p>
          <p className="text-gray-600 text-sm">사진을 업로드하고 AI 분류를 실행하면 카테고리별로 정리됩니다</p>
        </div>
      )}
    </div>
  );
}
