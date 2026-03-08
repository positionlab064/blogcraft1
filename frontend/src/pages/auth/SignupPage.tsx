import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Eye, EyeOff, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [phone, setPhone] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const pwMismatch = !!confirmPw && password !== confirmPw;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwMismatch) return;
    setLoading(true);
    setError(null);
    try {
      await signup(email, password, username, name.trim(), nickname.trim() || undefined, phone.trim() || undefined);
      navigate('/dashboard/generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background-dark relative">
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,_hsla(275,80%,50%,0.12)_0,_transparent_60%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center">
            <Sparkles size={19} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white group-hover:opacity-80 transition-opacity">
            BlogCraft AI
          </span>
        </Link>

        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">회원가입</h1>
          <p className="text-gray-500 text-sm mb-7">무료로 시작하세요.</p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="홍길동"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
              />
            </div>

            {/* 닉네임 */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                닉네임 <span className="normal-case font-normal text-gray-600">(선택)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                autoComplete="nickname"
                placeholder="블로그에서 사용할 닉네임"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
              />
            </div>

            {/* 아이디 */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                아이디
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="영문, 숫자, _ 사용 가능 (3~20자)"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                비밀번호 <span className="normal-case font-normal text-gray-600">(6자 이상)</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 p-1 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className={`w-full bg-white/[0.04] border rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors ${
                  pwMismatch
                    ? 'border-red-500/50 focus:border-red-500/70'
                    : 'border-white/10 focus:border-primary/50 focus:bg-white/[0.06]'
                }`}
              />
              {pwMismatch && (
                <p className="text-red-400 text-xs mt-1.5">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@example.com"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                전화번호 <span className="normal-case font-normal text-gray-600">(선택)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="010-0000-0000"
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
                />
                <button
                  type="button"
                  disabled
                  title="통신사 인증 (준비 중)"
                  className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-gray-600 cursor-not-allowed shrink-0"
                >
                  <Phone size={13} />
                  PASS 인증
                </button>
              </div>
              <p className="text-gray-700 text-[11px] mt-1.5">통신사 인증은 추후 지원 예정입니다.</p>
            </div>

            <button
              type="submit"
              disabled={loading || pwMismatch}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm !mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> 가입 중...</>
                : '무료로 시작하기'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              로그인
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-700 mt-5">
          <Link to="/" className="hover:text-gray-500 transition-colors">
            ← 홈으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
