import { useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Image, Upload, Loader2, X, AlertCircle } from 'lucide-react';
import { api, ClassifyRes } from '../../lib/api';

interface ImageFile {
  file: File;
  previewUrl: string;
  filename: string;
}

const CATEGORY_STYLES: Record<string, string> = {
  '음식': 'text-orange-300 bg-orange-400/10 border-orange-400/25',
  '풍경': 'text-sky-300 bg-sky-400/10 border-sky-400/25',
  '인물': 'text-pink-300 bg-pink-400/10 border-pink-400/25',
  '동물': 'text-green-300 bg-green-400/10 border-green-400/25',
  '건물/인테리어': 'text-violet-300 bg-violet-400/10 border-violet-400/25',
  '제품': 'text-cyan-300 bg-cyan-400/10 border-cyan-400/25',
  '텍스트/문서': 'text-yellow-300 bg-yellow-400/10 border-yellow-400/25',
  '기타': 'text-gray-400 bg-gray-400/10 border-gray-400/25',
};

function categoryStyle(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES['기타'];
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotosPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: File[]) => {
      const valid = files
        .filter(f => f.type.startsWith('image/'))
        .slice(0, Math.max(0, 20 - images.length));
      const next: ImageFile[] = valid.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        filename: file.name,
      }));
      setImages(prev => [...prev, ...next]);
    },
    [images.length],
  );

  const removeImage = (idx: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setResult(null);
    setError(null);
  };

  const handleClassify = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const b64Images = await Promise.all(
        images.map(async img => ({
          filename: img.filename,
          base64: await toBase64(img.file),
        })),
      );
      const res = await api.classifyPhotos(b64Images);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분류 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white mb-1">사진 자동 분류</h1>
        <p className="text-gray-500 text-sm">사진을 업로드하면 AI가 음식, 풍경, 인물 등으로 자동 분류합니다.</p>
      </div>

      {/* Drop Zone */}
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
          accept="image/*"
          className="hidden"
          onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ''; } }}
        />
        <div className="flex flex-col items-center text-center pointer-events-none">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
            isDragging ? 'bg-primary/30' : 'bg-white/[0.04]'
          }`}>
            <Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-600'} />
          </div>
          <p className="text-white font-medium mb-1">
            {isDragging ? '여기에 놓으세요!' : '사진을 끌어다 놓거나 클릭하여 선택'}
          </p>
          <p className="text-gray-600 text-sm">JPG, PNG, WebP · 최대 20장</p>
        </div>
      </div>

      {/* Preview Grid */}
      {images.length > 0 && (
        <div className="glass-card rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-300">{images.length}장 선택됨</span>
            <button onClick={clearAll} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
              전체 제거
            </button>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative group aspect-square">
                <img
                  src={img.previewUrl}
                  alt={img.filename}
                  className="w-full h-full object-cover rounded-lg border border-white/[0.07]"
                />
                <button
                  onClick={e => { e.stopPropagation(); removeImage(idx); }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/90 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={9} className="text-white" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleClassify}
            disabled={loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> AI 분류 중...</>
              : <><Image size={16} /> AI 분류 시작</>}
          </button>
        </div>
      )}

      {error && (
        <div className="glass-card rounded-2xl p-4 border border-red-500/20 bg-red-500/5 text-red-400 text-sm mb-5 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Summary */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">분류 요약 — 총 {result.total}장</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {result.summary.map(s => (
                <div
                  key={s.category}
                  className={`rounded-xl p-3.5 border text-center ${categoryStyle(s.category)}`}
                >
                  <div className="text-2xl font-bold mb-0.5">{s.count}</div>
                  <div className="text-xs font-medium">{s.category}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Grouped */}
          {(Object.entries(result.grouped) as [string, typeof result.results]).map(([category, photos]) => (
            <div key={category} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryStyle(category)}`}>
                  {category}
                </span>
                <span className="text-gray-600 text-sm">{photos.length}장</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map(photo => {
                  const original = images.find(img => img.filename === photo.filename);
                  return (
                    <div key={photo.filename} className="space-y-1.5">
                      {original && (
                        <img
                          src={original.previewUrl}
                          alt={photo.filename}
                          className="w-full aspect-square object-cover rounded-xl border border-white/[0.07]"
                        />
                      )}
                      <p className="text-xs text-gray-400 truncate">{photo.filename}</p>
                      {photo.description && photo.description !== '분류 실패' && (
                        <p className="text-xs text-gray-600">{photo.description}</p>
                      )}
                      <p className="text-xs text-gray-700">신뢰도 {Math.round(photo.confidence * 100)}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {!loading && !result && images.length === 0 && (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center min-h-[280px]">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Image size={26} className="text-gray-700" />
          </div>
          <p className="text-gray-400 font-medium mb-1">분류 결과가 여기에 표시됩니다</p>
          <p className="text-gray-600 text-sm">사진을 업로드하면 AI가 자동으로 분류해드립니다</p>
        </div>
      )}
    </div>
  );
}
