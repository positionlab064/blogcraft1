import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Loader2, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { api, SeoRes, SeoIssue } from '../../lib/api';

function ScoreCircle({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const label =
    score >= 80 ? '우수' : score >= 60 ? '양호' : score >= 40 ? '보통' : '개선 필요';

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" className="stroke-white/[0.07]" strokeWidth="7" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{score}</span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

function StatRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-2 border-b border-white/[0.05] last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={ok === undefined ? 'text-white' : ok ? 'text-green-400' : 'text-yellow-400'}>
        {value}
      </span>
    </div>
  );
}

const IssueItem: React.FC<{ issue: SeoIssue }> = ({ issue }) => {
  const cfg = {
    error:   { Icon: AlertCircle,   cls: 'text-red-400',    bg: 'bg-red-400/[0.06]' },
    warning: { Icon: AlertTriangle, cls: 'text-yellow-400', bg: 'bg-yellow-400/[0.06]' },
    info:    { Icon: Info,          cls: 'text-blue-400',   bg: 'bg-blue-400/[0.06]' },
  }[issue.type];

  return (
    <div className={`flex gap-2.5 text-sm rounded-lg px-3 py-2.5 ${cfg.bg}`}>
      <cfg.Icon size={15} className={`${cfg.cls} shrink-0 mt-0.5`} />
      <span className="text-gray-300">{issue.message}</span>
    </div>
  );
}

export default function SeoPage() {
  const [keyword, setKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeoRes | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!keyword.trim() || !content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeSeo({
        keyword: keyword.trim(),
        title: title.trim() || undefined,
        content: content.trim(),
        meta_description: metaDesc.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white mb-1">SEO 분석</h1>
        <p className="text-gray-500 text-sm">작성한 콘텐츠의 SEO 점수를 분석하고 개선 제안을 받으세요.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-5">
        {/* ── Form ── */}
        <div className="glass-card rounded-2xl p-6 space-y-4 h-fit">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
              목표 키워드 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="예: 서울 맛집"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">제목</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="블로그 포스트 제목"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">메타 설명</label>
            <input
              type="text"
              value={metaDesc}
              onChange={e => setMetaDesc(e.target.value)}
              placeholder="검색 결과에 표시될 설명 (150~160자 권장)"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <div className={`text-right text-xs mt-1 ${metaDesc.length > 160 ? 'text-red-400' : 'text-gray-700'}`}>
              {metaDesc.length}/160
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
              본문 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="분석할 블로그 본문을 붙여넣으세요..."
              rows={12}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none font-mono leading-relaxed"
            />
            <div className="text-right text-xs text-gray-700 mt-1">{content.length}자</div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !keyword.trim() || !content.trim()}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> 분석 중...</>
              : <><BarChart3 size={16} /> SEO 분석하기</>}
          </button>
        </div>

        {/* ── Results ── */}
        <div className="space-y-4">
          {error && (
            <div className="glass-card rounded-2xl p-4 border border-red-500/20 bg-red-500/5 text-red-400 text-sm flex gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {result ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Score */}
              <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
                <ScoreCircle score={result.score} />
              </div>

              {/* Stats */}
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">분석 지표</h3>
                <StatRow label="단어 수" value={`${result.word_count}자`} />
                <StatRow
                  label="키워드 밀도"
                  value={`${result.keyword_density}%`}
                  ok={result.keyword_density >= 1 && result.keyword_density <= 3}
                />
                <StatRow label="소제목 수" value={`${result.heading_count}개`} ok={result.heading_count >= 2} />
                <StatRow
                  label="메타 설명"
                  value={result.has_meta_description ? '있음' : '없음'}
                  ok={result.has_meta_description}
                />
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    발견된 문제 <span className="text-gray-600 font-normal">({result.issues.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {result.issues.map((issue, i) => <IssueItem key={i} issue={issue} />)}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">개선 제안</h3>
                  <ul className="space-y-2.5">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
                        <span className="text-gray-300 leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : !loading && (
            <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[280px]">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                <BarChart3 size={26} className="text-gray-700" />
              </div>
              <p className="text-gray-400 font-medium mb-1">분석 결과가 여기에 표시됩니다</p>
              <p className="text-gray-600 text-sm">키워드와 본문을 입력하고 분석을 시작하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
