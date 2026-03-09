import { useState } from 'react';
import { Star, ChevronDown, X, MessageSquare } from 'lucide-react';
import type { ClassifiedMediaItem } from '../../lib/media/classifyMedia';
import { CATEGORY_META, ALL_IMAGE_CATEGORIES } from '../../lib/media/categoryMeta';

interface Props {
  item: ClassifiedMediaItem;
  onChange: (id: string, patch: Partial<ClassifiedMediaItem>) => void;
  onRemove: (id: string) => void;
}

function confidenceColor(c: number) {
  if (c >= 0.85) return 'text-green-400';
  if (c >= 0.70) return 'text-yellow-400';
  return 'text-red-400';
}

export default function MediaCard({ item, onChange, onRemove }: Props) {
  const [showMemo, setShowMemo] = useState(false);
  const meta = CATEGORY_META[item.confirmedCategory];

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-white/[0.06] flex flex-col">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-black/20 overflow-hidden">
        <img
          src={item.previewUrl}
          alt={item.fileName}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />

        {/* Representative toggle */}
        <button
          onClick={() => onChange(item.id, { isRepresentative: !item.isRepresentative })}
          title={item.isRepresentative ? '대표사진 해제' : '대표사진으로 설정'}
          className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-sm transition-all ${
            item.isRepresentative
              ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
              : 'bg-black/50 text-gray-500 hover:text-yellow-400 border border-white/10'
          }`}
        >
          <Star size={12} fill={item.isRepresentative ? 'currentColor' : 'none'} />
        </button>

        {/* Remove */}
        <button
          onClick={() => onRemove(item.id)}
          title="제거"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-gray-500 hover:text-red-400 border border-white/10 backdrop-blur-sm transition-colors"
        >
          <X size={12} />
        </button>

        {/* Confidence badge */}
        <div
          className={`absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm ${confidenceColor(item.confidence)}`}
        >
          {Math.round(item.confidence * 100)}%
        </div>

        {/* Representative ribbon */}
        {item.isRepresentative && (
          <div className="absolute bottom-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 backdrop-blur-sm">
            대표
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Filename */}
        <p className="text-[11px] text-gray-300 truncate font-medium" title={item.fileName}>
          {item.fileName}
        </p>

        {/* Category select */}
        <div className="relative">
          <select
            value={item.confirmedCategory}
            onChange={e =>
              onChange(item.id, {
                confirmedCategory: e.target.value as ClassifiedMediaItem['confirmedCategory'],
              })
            }
            className={`w-full text-[11px] font-semibold px-2.5 py-1.5 pr-6 rounded-lg border appearance-none cursor-pointer bg-transparent focus:outline-none focus:ring-1 focus:ring-white/20 ${meta.badgeClass}`}
          >
            {ALL_IMAGE_CATEGORIES.map(cat => (
              <option key={cat} value={cat} className="bg-[#0f0f1a] text-white font-normal">
                {CATEGORY_META[cat].label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={10}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
          />
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-600 border border-white/[0.05]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Memo */}
        <button
          onClick={() => setShowMemo(v => !v)}
          className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          <MessageSquare size={10} />
          {showMemo ? '메모 닫기' : item.memo ? item.memo.slice(0, 14) + (item.memo.length > 14 ? '…' : '') : '메모 추가'}
        </button>

        {showMemo && (
          <textarea
            value={item.memo}
            onChange={e => onChange(item.id, { memo: e.target.value })}
            placeholder="메모를 입력하세요..."
            rows={2}
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 text-gray-300 placeholder:text-gray-700 resize-none focus:outline-none focus:border-white/20"
          />
        )}
      </div>
    </div>
  );
}
