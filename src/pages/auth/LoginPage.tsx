import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/dashboard/generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background-dark relative">
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,_hsla(275,80%,50%,0.12)_0,_transparent_60%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center">
            <Sparkles size={19} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white group-hover:opacity-80 transition-opacity">
            BlogCraft AI
          </span>
        </Link>

        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">로그인</h1>
          <p className="text-gray-500 text-sm mb-7">계정에 로그인하여 시작하세요.</p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="아이디를 입력하세요"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm !mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> 로그인 중...</>
                : '로그인'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
              무료 회원가입
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
