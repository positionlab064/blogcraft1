import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Loader2 } from 'lucide-react';
import { api, HistoryItem, GenerateRes } from '../../lib/api';
import { MarkdownContent } from '../../components/MarkdownContent';

const PLATFORM_LABELS: Record<string, string> = {
  naver: '네이버',
  tistory: '티스토리',
  wordpress: '워드프레스',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GenerateRes | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.getHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = async (id: number) => {
    if (selected?.id === id) { setSelected(null); return; }
    setDetailLoading(true);
    try {
      const detail = await api.getContent(id);
      setSelected(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white mb-1">생성 히스토리</h1>
        <p className="text-gray-500 text-sm">이전에 생성한 원고 목록입니다.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Clock size={26} className="text-gray-700" />
          </div>
          <p className="text-gray-400 font-medium mb-1">아직 생성된 원고가 없습니다</p>
          <p className="text-gray-600 text-sm">원고 생성 탭에서 첫 번째 원고를 만들어보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-5">
          {/* List */}
          <div className="space-y-2">
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => loadDetail(item.id)}
                className={`w-full glass-card rounded-xl p-4 flex items-start gap-4 text-left transition-all hover:border-white/15 ${
                  selected?.id === item.id ? 'border-primary/40 bg-primary/[0.04]' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate mb-1.5">
                    {item.title ?? item.keyword}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="bg-white/[0.06] px-2 py-0.5 rounded-md">#{item.keyword}</span>
                    <span>{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                    <span>·</span>
                    <span>{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 tabular-nums ${scoreColor(item.seo_score)}`}>
                  {item.seo_score}점
                </span>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div>
            {detailLoading ? (
              <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-primary" />
              </div>
            ) : selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-2xl p-5 space-y-4 sticky top-24"
              >
                <div>
                  <h2 className="text-white font-bold text-base leading-snug mb-1.5">{selected.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{PLATFORM_LABELS[selected.platform] ?? selected.platform}</span>
                    <span>·</span>
                    <span className={scoreColor(selected.seo_score)}>SEO {selected.seo_score}점</span>
                  </div>
                </div>

                {selected.meta_description && (
                  <p className="text-gray-500 text-xs leading-relaxed border-t border-white/[0.06] pt-3">
                    {selected.meta_description}
                  </p>
                )}

                {selected.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs border border-primary/20">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="bg-[#0a0812] rounded-xl p-4 max-h-[400px] overflow-y-auto border border-white/[0.06]">
                  <MarkdownContent content={selected.content} />
                </div>
              </motion.div>
            ) : (
              <div className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                <p className="text-gray-600 text-sm">목록에서 항목을 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
