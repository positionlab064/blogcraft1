import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, Upload, Loader2, X, AlertCircle, Save, RotateCcw, Check, ChevronDown } from 'lucide-react';
import { classifyMedia, buildSavePayload } from '../../lib/media/classifyMedia';
import type { ClassifiedMediaItem } from '../../lib/media/classifyMedia';
import { CATEGORY_META, ALL_IMAGE_CATEGORIES } from '../../lib/media/categoryMeta';
import type { MediaCategory } from '../../lib/media/categoryMeta';
import MediaCard from '../../components/photos/MediaCard';

const MAX_FILES = Infinity;
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

type FilterTab = 'all' | MediaCategory;

interface UploadedFile {
  file: File;
  previewUrl: string;
}

export default function PhotosPage() {
  // ── Upload state ────────────────────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Classification state ────────────────────────────────────────────────
  const [classifiedItems, setClassifiedItems] = useState<ClassifiedMediaItem[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('all');
  const [bulkCategory, setBulkCategory] = useState<MediaCategory | ''>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // ── Upload handlers ─────────────────────────────────────────────────────
  const addFiles = useCallback(
    (files: File[]) => {
      const invalid = files.filter(f => !ACCEPTED_MIME.includes(f.type));
      const valid = files.filter(f => ACCEPTED_MIME.includes(f.type));

      if (invalid.length > 0) {
        setErrorMessage(
          `${invalid.length}개 파일이 지원되지 않는 형식입니다. (JPG, PNG, WebP만 가능)`,
        );
      }

      const toAdd = valid;
      if (toAdd.length === 0) return;

      setUploadedFiles(prev => [
        ...prev,
        ...toAdd.map(file => ({ file, previewUrl: URL.createObjectURL(file) })),
      ]);
    },
    [uploadedFiles.length],
  );

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
  };

  // ── Classify ────────────────────────────────────────────────────────────
  const handleClassify = async () => {
    if (uploadedFiles.length === 0) return;
    setIsClassifying(true);
    setErrorMessage(null);
    setIsSaved(false);

    try {
      const items = await classifyMedia(uploadedFiles.map(f => f.file));
      setClassifiedItems(items);
      setSelectedFilter('all');
      // Release upload preview URLs (classified items have their own)
      uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
      setUploadedFiles([]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '분류 중 오류가 발생했습니다.');
    } finally {
      setIsClassifying(false);
    }
  };

  // ── Card CRUD ───────────────────────────────────────────────────────────
  const updateItem = (id: string, patch: Partial<ClassifiedMediaItem>) => {
    setClassifiedItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
    setIsSaved(false);
  };

  const removeItem = (id: string) => {
    setClassifiedItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  // ── Bulk category change ────────────────────────────────────────────────
  const handleBulkApply = () => {
    if (!bulkCategory) return;
    const cat = bulkCategory as MediaCategory;
    const visibleIds = new Set(filteredItems.map(i => i.id));
    setClassifiedItems(prev =>
      prev.map(item =>
        visibleIds.has(item.id) ? { ...item, confirmedCategory: cat } : item,
      ),
    );
    setBulkCategory('');
    setIsSaved(false);
  };

  // ── Save (localStorage mock) ────────────────────────────────────────────
  const handleSave = () => {
    const payload = buildSavePayload('store-demo', classifiedItems);
    // TODO: Replace with real API call → api.saveMediaClassification(payload)
    localStorage.setItem('classified_media_draft', JSON.stringify(payload));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // ── Filter ──────────────────────────────────────────────────────────────
  const usedCategories = [
    ...new Set(classifiedItems.map(i => i.confirmedCategory)),
  ] as MediaCategory[];

  const filteredItems =
    selectedFilter === 'all'
      ? classifiedItems
      : classifiedItems.filter(i => i.confirmedCategory === selectedFilter);

  const hasResults = classifiedItems.length > 0;
  const showEmpty = !isClassifying && !hasResults && uploadedFiles.length === 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white mb-1">사진 자동 분류</h1>
        <p className="text-gray-500 text-sm">
          사진을 업로드하면 AI가 음식, 풍경, 인물 등으로 자동 분류합니다.
        </p>
      </div>

      {/* ── Upload Zone (shown only before results) ── */}
      {!hasResults && (
        <>
          <div
            className={`glass-card rounded-2xl p-8 border-2 border-dashed transition-all cursor-pointer mb-5 ${
              isDragging
                ? 'border-primary/60 bg-primary/[0.04] scale-[1.01]'
                : 'border-white/[0.08] hover:border-white/20'
            }`}
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              addFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                if (e.target.files) {
                  addFiles(Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
            />
            <div className="flex flex-col items-center text-center pointer-events-none">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                  isDragging ? 'bg-primary/30' : 'bg-white/[0.04]'
                }`}
              >
                <Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-600'} />
              </div>
              <p className="text-white font-medium mb-1">
                {isDragging ? '여기에 놓으세요!' : '사진을 끌어다 놓거나 클릭하여 선택'}
              </p>
              <p className="text-gray-600 text-sm">JPG, PNG, WebP</p>
            </div>
          </div>

          {/* Preview grid */}
          {uploadedFiles.length > 0 && (
            <div className="glass-card rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-300">
                  {uploadedFiles.length}장 선택됨
                </span>
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                >
                  전체 제거
                </button>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-4">
                {uploadedFiles.map((f, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={f.previewUrl}
                      alt={f.file.name}
                      className="w-full h-full object-cover rounded-lg border border-white/[0.07]"
                    />
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeUploadedFile(idx);
                      }}
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
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isClassifying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> AI 분류 중...
                  </>
                ) : (
                  <>
                    <Image size={16} /> AI 분류 시작
                  </>
                )}
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
          <button onClick={() => setErrorMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Results Panel ── */}
      {hasResults && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Toolbar */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              {/* Stats */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-300">
                  총 {classifiedItems.length}장
                </span>
                <span className="text-xs text-gray-600">
                  · 대표사진 {classifiedItems.filter(i => i.isRepresentative).length}장
                </span>
                <span className="text-xs text-gray-700">
                  · {usedCategories.length}개 카테고리
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Bulk category */}
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <select
                      value={bulkCategory}
                      onChange={e => setBulkCategory(e.target.value as MediaCategory | '')}
                      className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg pl-2.5 pr-7 py-1.5 text-gray-400 focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
                    >
                      <option value="">
                        {selectedFilter === 'all'
                          ? '전체 일괄변경...'
                          : `${CATEGORY_META[selectedFilter as MediaCategory]?.label ?? ''} 일괄변경...`}
                      </option>
                      {ALL_IMAGE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="bg-[#0f0f1a]">
                          {CATEGORY_META[cat].label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={10}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600"
                    />
                  </div>
                  {bulkCategory && (
                    <button
                      onClick={handleBulkApply}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium"
                    >
                      적용
                    </button>
                  )}
                </div>

                {/* Re-upload */}
                <button
                  onClick={() => {
                    classifiedItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
                    setClassifiedItems([]);
                    setSelectedFilter('all');
                    setIsSaved(false);
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
                >
                  <RotateCcw size={12} /> 재업로드
                </button>

                {/* Save */}
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    isSaved
                      ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                      : 'btn-primary'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <Check size={12} /> 저장됨
                    </>
                  ) : (
                    <>
                      <Save size={12} /> 저장
                    </>
                  )}
                </button>

                {/* Clear all */}
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1.5"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                selectedFilter === 'all'
                  ? 'bg-white/10 border-white/20 text-white font-medium'
                  : 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/10'
              }`}
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
                  className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                    selectedFilter === cat
                      ? `${meta.badgeClass} font-medium`
                      : 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/10'
                  }`}
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
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.93 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <MediaCard item={item} onChange={updateItem} onRemove={removeItem} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-sm">
                이 카테고리에 해당하는 사진이 없습니다.
              </p>
              <button
                onClick={() => setSelectedFilter('all')}
                className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                전체 보기
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Loading state */}
      {isClassifying && (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center min-h-[280px]">
          <Loader2 size={32} className="text-primary animate-spin mb-4" />
          <p className="text-gray-300 font-medium mb-1">AI가 사진을 분석하고 있습니다</p>
          <p className="text-gray-600 text-sm">
            {uploadedFiles.length > 0 ? `${uploadedFiles.length}장` : ''} 잠시만 기다려 주세요...
          </p>
        </div>
      )}

      {/* Empty state */}
      {showEmpty && (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center min-h-[280px]">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Image size={26} className="text-gray-700" />
          </div>
          <p className="text-gray-400 font-medium mb-1">분류 결과가 여기에 표시됩니다</p>
          <p className="text-gray-600 text-sm">
            사진을 업로드하고 AI 분류를 실행하면 카테고리별로 정리됩니다
          </p>
        </div>
      )}
    </div>
  );
}
