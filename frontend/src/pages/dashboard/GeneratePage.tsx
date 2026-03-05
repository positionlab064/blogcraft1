import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { api, GenerateRes, Platform, Tone } from '../../lib/api';
import { MarkdownContent } from '../../components/MarkdownContent';

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'naver', label: '네이버 블로그' },
  { value: 'tistory', label: '티스토리' },
  { value: 'wordpress', label: '워드프레스' },
];

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: 'casual', label: '친근한', desc: '구어체, 편안한 말투' },
  { value: 'professional', label: '전문적인', desc: '격식체, 신뢰감' },
  { value: 'informative', label: '설명형', desc: '정보 전달 중심' },
];

function SeoGauge({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative size-14 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" className="stroke-white/10" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const [keyword, setKeyword] = useState('');
  const [platform, setPlatform] = useState<Platform>('naver');
  const [tone, setTone] = useState<Tone>('casual');
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const tags = tagInput ? tagInput.split(',').map(t => t.trim()).filter(Boolean) : [];
      const res = await api.generate({ keyword: keyword.trim(), platform, tone, tags });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white mb-1">AI 원고 생성</h1>
        <p className="text-gray-500 text-sm">키워드 하나로 SEO 최적화된 블로그 원고를 자동 생성합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-5">
        {/* ── Form ── */}
        <div className="glass-card rounded-2xl p-5 space-y-5 h-fit lg:sticky lg:top-24">
          {/* Keyword */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
              핵심 키워드 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="예: 서울 맛집 추천"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">플랫폼</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    platform === p.value
                      ? 'bg-primary/25 border border-primary/50 text-white'
                      : 'bg-white/[0.03] border border-white/[0.08] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">톤앤매너</label>
            <div className="space-y-1.5">
              {TONES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-sm transition-all ${
                    tone === t.value
                      ? 'bg-primary/20 border border-primary/40 text-white'
                      : 'bg-white/[0.03] border border-white/[0.07] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
                  }`}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="text-[11px] opacity-60">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
              태그 <span className="normal-case text-gray-600 font-normal">(쉼표 구분)</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="예: 여행, 맛집, 서울"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !keyword.trim()}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> 원고 생성 중...</>
              : <><Sparkles size={16} /> 원고 생성하기</>}
          </button>
        </div>

        {/* ── Results ── */}
        <div className="min-h-[400px]">
          {error && (
            <div className="glass-card rounded-2xl p-4 border border-red-500/20 bg-red-500/5 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Sparkles size={28} className="text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-2xl border border-primary/30 animate-ping" />
              </div>
              <p className="text-white font-semibold mb-1">AI가 원고를 작성하고 있어요</p>
              <p className="text-gray-500 text-sm">키워드를 분석하고 SEO를 최적화하는 중...</p>
            </div>
          )}

          {!loading && result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6 space-y-5"
            >
              {/* Title row */}
              <div className="flex items-start gap-3">
                <h2 className="flex-1 text-xl font-bold text-white leading-snug">{result.title}</h2>
                <button
                  onClick={() => copy(result.title, 'title')}
                  title="제목 복사"
                  className="p-1.5 text-gray-600 hover:text-white transition-colors shrink-0"
                >
                  {copied === 'title' ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                </button>
              </div>

              {/* SEO score */}
              <div className="flex items-center gap-4 p-3.5 bg-white/[0.04] rounded-xl border border-white/[0.07]">
                <SeoGauge score={result.seo_score} />
                <div>
                  <p className="text-white font-semibold text-sm">SEO 점수 {result.seo_score}점</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {result.seo_score >= 80
                      ? '우수 — 상위 노출 가능성이 높습니다'
                      : result.seo_score >= 60
                      ? '양호 — 일부 개선이 권장됩니다'
                      : '개선 필요 — SEO 최적화를 추천합니다'}
                  </p>
                </div>
              </div>

              {/* Meta description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">메타 설명</span>
                  <button onClick={() => copy(result.meta_description, 'meta')} className="p-1 text-gray-600 hover:text-white transition-colors">
                    {copied === 'meta' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                  {result.meta_description}
                </p>
              </div>

              {/* Tags */}
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">태그</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/25">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">본문</span>
                  <button
                    onClick={() => copy(result.content, 'content')}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-all"
                  >
                    {copied === 'content' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    {copied === 'content' ? '복사됨!' : '마크다운 복사'}
                  </button>
                </div>
                <div className="bg-[#0a0812] rounded-xl p-5 max-h-[560px] overflow-y-auto border border-white/[0.06]">
                  <MarkdownContent content={result.content} />
                </div>
              </div>
            </motion.div>
          )}

          {!loading && !result && !error && (
            <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center h-full min-h-[360px]">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                <Sparkles size={26} className="text-gray-700" />
              </div>
              <p className="text-gray-400 font-medium mb-1">원고가 여기에 표시됩니다</p>
              <p className="text-gray-600 text-sm">키워드를 입력하고 생성 버튼을 누르세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
