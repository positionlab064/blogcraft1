import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Sparkles, Edit3, Image, BarChart3, Clock, ArrowLeft, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/dashboard/generate', icon: Edit3, label: '원고 생성', color: 'text-primary' },
  { to: '/dashboard/photos', icon: Image, label: '사진 분류', color: 'text-accent-pink' },
  { to: '/dashboard/seo', icon: BarChart3, label: 'SEO 분석', color: 'text-accent-cyan' },
  { to: '/dashboard/history', icon: Clock, label: '생성 히스토리', color: 'text-gray-400' },
] as const;

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="min-h-screen flex bg-background-dark">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 w-60 z-30 flex flex-col
          bg-[#08060f] border-r border-white/[0.06]
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-white shrink-0">
              <Sparkles size={17} />
            </div>
            <span className="font-display font-bold text-white tracking-tight">BlogCraft AI</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-3">
            도구
          </p>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={17}
                    className={isActive ? item.color : 'text-gray-600 group-hover:text-gray-400'}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3 shrink-0 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-300 hover:bg-white/[0.04] transition-all"
          >
            <ArrowLeft size={15} />
            홈으로 돌아가기
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all"
          >
            <LogOut size={15} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 flex items-center px-5 gap-4 border-b border-white/[0.06] sticky top-0 bg-background-dark/80 backdrop-blur-xl z-10 shrink-0">
          <button
            className="lg:hidden text-gray-500 hover:text-white transition-colors p-1"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex-1" />

          <span className="text-xs text-gray-600 hidden sm:block">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>

          {/* User info */}
          <div className="flex items-center gap-2.5 pl-4 border-l border-white/[0.06]">
            <div className="size-8 rounded-full bg-gradient-to-br from-primary/60 to-accent-pink/60 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              {user?.name && (
                <span className="text-xs font-medium text-gray-300 truncate max-w-[120px]">
                  {user.name}
                </span>
              )}
              <span className="text-[11px] text-gray-600 truncate max-w-[120px]">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
