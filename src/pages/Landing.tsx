import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  Menu,
  Rocket,
  PlayCircle,
  CheckCircle2,
  Edit3,
  Image as ImageIcon,
  BarChart3,
  Layers,
  Star,
  Globe,
  Send,
  Mail,
  ChevronRight,
} from 'lucide-react';

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-background-dark/70 backdrop-blur-xl border-b border-white/[0.08]">
    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-white">
          <Sparkles size={20} />
        </div>
        <h1 className="font-display font-bold text-xl tracking-tight text-white">BlogCraft AI</h1>
      </div>
      <div className="hidden md:flex items-center gap-10">
        {['기능', '사용법', '요금제', '후기'].map((item) => (
          <a key={item} href={`#${item}`} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            {item}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <Link to="/dashboard/generate" className="hidden sm:flex btn-primary px-6 py-2.5 text-sm items-center gap-2">
          무료 시작 <ArrowRight size={16} />
        </Link>
        <button className="md:hidden text-white">
          <Menu size={24} />
        </button>
      </div>
    </div>
  </nav>
);

const Hero = () => (
  <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
    <div className="absolute inset-0 z-[-1] bg-[radial-gradient(at_50%_0%,_hsla(275,80%,50%,0.15)_0,_transparent_50%),_radial-gradient(at_100%_0%,_hsla(339,100%,55%,0.1)_0,_transparent_50%)]" />

    <div className="max-w-7xl mx-auto text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm"
      >
        <span className="flex h-2 w-2 rounded-full bg-accent-pink animate-pulse" />
        <span className="text-xs font-medium text-gray-300 tracking-wide">NEW: 이미지 자동 최적화 기능 출시</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.15] mb-6 tracking-tight"
      >
        블로그 원고부터 <br className="hidden md:block" />
        <span className="text-gradient">사진 정리까지, AI가 다 해줍니다</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto mb-10 leading-relaxed"
      >
        키워드 하나면 충분해요. SEO 최적화 원고 자동 생성은 기본,<br className="hidden sm:block" />
        복잡한 사진 폴더 자동 분류까지 한 번에 끝내세요.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
      >
        <Link to="/dashboard/generate" className="w-full sm:w-auto btn-primary px-8 py-4 text-lg flex items-center justify-center gap-2">
          <Rocket size={20} /> 무료로 시작하기
        </Link>
        <button className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-lg px-8 py-4 rounded-full backdrop-blur-md transition-colors flex items-center justify-center gap-2 group">
          <PlayCircle size={20} className="group-hover:scale-110 transition-transform" /> 데모 영상 보기
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="relative max-w-5xl mx-auto animate-float"
      >
        <div className="absolute -inset-10 bg-gradient-to-r from-primary/20 to-accent-pink/20 rounded-full blur-[80px] opacity-60" />
        <div className="relative glass-card rounded-2xl overflow-hidden p-2">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#171122]/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 text-center">
              <div className="inline-block px-3 py-1 rounded-md bg-white/5 text-[10px] text-gray-400 font-mono">blogcraft-ai.app</div>
            </div>
          </div>
          <div className="bg-[#0f0b15] aspect-[16/9] w-full relative overflow-hidden">
            <img
              alt="Dashboard"
              className="w-full h-full object-cover opacity-80"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFHztbayEvoONuPTnqyEfDK_JGFoaBw18LGiCpM39WPqIdty-fwVmMPUWOVqDnyowMsHjnJNZvpL4avn9lFmgsKycvigXQyTyg5apfMdoqUhKHqwg8iZ2Imolt7ijhzjklRCcPHWrYbcJkxYFimQe1nSoVla6wF9jBrqqfa6rMII0ZY4W_fmYfM9N05-aP0C-_hAG9-b1G9m1ElSxcdKgwbVpuICnoLluOMVqXMC4jqGjjW299ehnHdXgyfPRdAyR2QBwQ90AaXZi8"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-8 left-8 w-64 glass-card p-4 rounded-xl border border-white/10 hidden md:block">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-500/20 text-green-400 p-1.5 rounded-lg">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-sm font-bold text-white">SEO 점수 98점</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[98%]" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

const Features = () => (
  <section className="py-24 px-6 relative" id="기능">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">이런 게 가능해요</h2>
        <p className="text-gray-400 text-lg">블로그 운영의 모든 과정을 자동화하여 창작에만 집중하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-8 md:col-span-2 group hover:border-primary/50 transition-colors">
          <div className="bg-primary/20 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-6">
            <Sparkles size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">원클릭 AI 원고 작성</h3>
          <p className="text-gray-400 mb-8 max-w-md">주제만 입력하면 서론, 본론, 결론이 완벽한 구조의 글이 생성됩니다. 네이버, 티스토리 등 플랫폼별 스타일에 맞춰 톤앤매너를 조절할 수 있습니다.</p>
          <div className="bg-[#0f0b15]/50 rounded-xl p-4 border border-white/5">
            <div className="flex gap-3 mb-3">
              <div className="h-2 w-1/3 bg-white/20 rounded-full" />
              <div className="h-2 w-1/4 bg-white/10 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-1.5 w-full bg-white/10 rounded-full" />
              <div className="h-1.5 w-[90%] bg-white/10 rounded-full" />
            </div>
            <div className="mt-3 flex gap-2">
              <span className="px-2 py-1 rounded bg-primary/20 text-primary text-[10px]">#여행</span>
              <span className="px-2 py-1 rounded bg-primary/20 text-primary text-[10px]">#맛집</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-8 group hover:border-accent-pink/50 transition-colors">
          <div className="bg-accent-pink/20 w-12 h-12 rounded-xl flex items-center justify-center text-accent-pink mb-6">
            <ImageIcon size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">사진 자동 분류</h3>
          <p className="text-gray-400 mb-6 text-sm">수백 장의 사진을 업로드만 하세요. AI가 음식, 풍경, 인물별로 자동 분류하여 폴더를 정리해드립니다.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="aspect-square rounded-lg overflow-hidden relative border border-white/10">
              <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7Jm8s-OisKrGb_eVnwpDc1mUMEYZXw2oOw0jNziODD5bWKWwC6zdRkbGBXjt9PvTWQoKy5BG56JKLQXQAxApZ6Ioe7Cxl77tjR0Iy1cf0Ltg_aO2C1Sd3Fxx4i_t5tdPnY4bCyiLcgykgHT_sPsy17f85DIY8Fy79B9jwVf4xCVwnJptjIaUQcBi3YeTZPaLe4EAZtR8Qi8JE8ZOZs5HrLkkgDf4vMioqUqSQuJubRL7Cf1zXQiye8uFKjdPvW-jLx4MVq-gfxJ5q" referrerPolicy="no-referrer" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[8px] text-center">음식</div>
            </div>
            <div className="aspect-square rounded-lg overflow-hidden relative border border-white/10">
              <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGP3nR551FbFZJF-q-NahLcJiFzdQ-1j8rNpVpexhhZTV1aJNfgTqhCuU9POBA4XQ4cmWJFsYSvHrDwJkYKqaG0vAc9y8g0ZuCq4z6PO2J0uZld_uyFIDhfxlJBvN_f00GDjjriYCQsTGg3Dxit4148uSqLgarfg_EfRnYTnbzMMeVZUaefshX_APmnMc1pzdBE9kYvenXkuCDZNID_VYUKDG0oRjzEMFSUw5tlFjBT8DGh42fPlg8BwfTnFTdGNxp3WfZs799A6pB" referrerPolicy="no-referrer" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[8px] text-center">풍경</div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-8 group hover:border-accent-cyan/50 transition-colors">
          <div className="bg-accent-cyan/20 w-12 h-12 rounded-xl flex items-center justify-center text-accent-cyan mb-6">
            <BarChart3 size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">실시간 SEO 분석</h3>
          <p className="text-gray-400 mb-6 text-sm">상위 노출을 위한 키워드 밀도와 구조를 실시간으로 제안합니다. 점수로 직관적인 확인이 가능합니다.</p>
          <div className="flex items-center justify-center py-4">
            <div className="relative size-32">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/10" strokeWidth="2" />
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-accent-cyan" strokeWidth="2" strokeDasharray="92, 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white font-display">92</span>
                <span className="text-[10px] text-gray-400">점수</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-8 md:col-span-2 flex items-center justify-between group hover:border-white/20 transition-colors">
          <div className="max-w-md">
            <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6">
              <Layers size={24} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">다양한 플랫폼 연동</h3>
            <p className="text-gray-400">네이버 블로그, 티스토리, 워드프레스까지. 작성한 글을 원하는 플랫폼으로 즉시 발행하세요.</p>
          </div>
          <div className="hidden md:flex gap-4 opacity-50 group-hover:opacity-100 transition-opacity">
            {['N', 'T', 'W'].map(l => (
              <div key={l} className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold">{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section className="py-24 px-6 bg-black/20" id="사용법">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">어떻게 작동하나요?</h2>
        <p className="text-gray-400 text-lg">복잡한 과정 없이 3단계로 끝나는 블로그 포스팅</p>
      </div>
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px border-t border-dashed border-white/20" />
        {[
          { step: 1, title: '키워드 입력', desc: '작성하고 싶은 주제나 핵심 키워드를 입력하세요. 관련 검색어까지 AI가 분석합니다.' },
          { step: 2, title: 'AI 원고 & 이미지 생성', desc: '단 몇 초 만에 SEO 최적화된 글이 완성되고, 어울리는 이미지가 자동 배치됩니다.', active: true },
          { step: 3, title: '확인 및 발행', desc: '내용을 검토하고 버튼 한 번으로 원하는 블로그에 포스팅을 발행하세요.' },
        ].map((item) => (
          <div key={item.step} className="relative z-10 flex flex-col items-center text-center">
            <div className={`w-24 h-24 rounded-full glass-card flex items-center justify-center mb-8 ${item.active ? 'border-primary/50 bg-primary/10 shadow-[0_0_30px_-10px_rgba(124,59,237,0.5)]' : ''}`}>
              <span className={`text-4xl font-display font-bold ${item.active ? 'text-primary' : 'text-white'}`}>{item.step}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const EditorPreview = () => (
  <section className="py-24 px-6">
    <div className="max-w-7xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1e1b4b]/50 to-[#312e81]/50 p-8 md:p-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-accent-pink/10 border border-accent-pink/20 text-accent-pink text-xs font-bold mb-6">
              EDITOR PREVIEW
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
              직관적인 에디터로<br />
              <span className="text-gradient">수정까지 완벽하게</span>
            </h2>
            <ul className="space-y-4 mb-8">
              {[
                '드래그 앤 드롭으로 문단 순서 변경',
                '실시간 맞춤법 검사 및 교정',
                '이미지 필터 및 크기 자동 조절',
              ].map(text => (
                <li key={text} className="flex items-center gap-3 text-gray-300">
                  <CheckCircle2 size={18} className="text-primary" />
                  {text}
                </li>
              ))}
            </ul>
            <Link to="/dashboard/generate" className="text-white font-medium border-b border-white hover:border-primary hover:text-primary transition-colors pb-1 inline-flex items-center gap-2">
              에디터 기능 더 알아보기 <ChevronRight size={16} />
            </Link>
          </div>
          <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-[#1F1D2B] px-4 py-3 flex gap-2 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="p-6 flex gap-6">
              <div className="w-12 flex flex-col gap-4 items-center border-r border-white/5 pr-4">
                <Edit3 size={20} className="text-primary" />
                <ImageIcon size={20} className="text-gray-500" />
                <Layers size={20} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="h-6 bg-white/10 rounded w-3/4 mb-4" />
                <div className="space-y-2 mb-6">
                  <div className="h-2 bg-white/5 rounded w-full" />
                  <div className="h-2 bg-white/5 rounded w-5/6" />
                </div>
                <div className="h-32 bg-white/5 rounded border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 gap-2">
                  <ImageIcon size={24} />
                  <span className="text-xs">이미지 드래그</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Testimonials = () => (
  <section className="py-24 px-6" id="후기">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">사용자들의 리얼 후기</h2>
        <p className="text-gray-400 text-lg">이미 10,000명 이상의 블로거가 BlogCraft AI와 함께하고 있습니다.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: '김민지', role: '여행 블로거', text: '"매일 2시간씩 걸리던 포스팅 작업이 15분으로 줄었어요. 특히 사진 정리가 너무 귀찮았는데 AI가 알아서 폴더링해주니 신세계입니다."', color: 'primary', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-1rF3F2ij8Zs2nJyCI6qfC-dQAgsluauanFbAz8hwzbAUKKG0BvV1d7OD2LOqbrTWAvlP5DuRtdK2UIUjPOc7h5zdI1x4A6tbhFm4ZJfgekNH0CUhm3nX9egyf3XO4DKEdtJRTpDeB-XqOtLwwMZcxfRSMByNndUdd9tMbD76vTCJtWk5HeGr_m3oR6go6Cg-OC2A8zBYZaSlKC_XQHrnOI0ltDz9aFH6o10_Q6JjDYm0BlZWRSD041OsKuMGyyNyWR8ZCBGLKm4F' },
          { name: '박서준', role: 'IT 리뷰어', text: '"SEO 점수를 미리 볼 수 있어서 상위 노출 확률이 확실히 올라갔어요. 키워드 추천 기능도 정말 유용하게 쓰고 있습니다."', color: 'accent-pink', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn4uP7jlrdNEMNv0oIIZld918Rdb7vHW_jNOl-15dGo5WIc4TPeVrGkk0xcEpd5OkDpmqyy66THzFaH7p0J9UAu89CGVoomFJqG8JycfJdC_i7VZu4hPjCG7Oh0LBCWCPgTfS0l_UGvA42oLpU76w5sHof9NdzPG_0XIioonpJWKbhw_99TttScKkUtfROv-Iy3qOV7giECwSsdXN8kTD_azRriHmLUPxb79ZsT5oMxf8-TJI23H8-aVGZD5tWxfaqiAtM-s7Yb5Ld' },
          { name: '이수진', role: '맛집 인플루언서', text: '"초보자도 쉽게 쓸 수 있는 UI가 마음에 듭니다. 무엇보다 글의 퀄리티가 기계적이지 않고 자연스러워서 수정할 게 별로 없어요."', color: 'accent-cyan', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARxz-ssMUzMMzqMIFVctRMdtUugJXTXWjxFeW3zp1iCCzl9CBBIS4z3BQsrd3OLvCATJdNpvQJpSCNS0zQN5YkIbjg2gbTCaRyUWk0aEchpbqUcsum1PtXEDtSb4lXhC_DiuzvGVibMXZXY3W8HnoTMxkYuAKwcbCCFERaV62IXmXllNxoiH0O-TB1NTfu3w_vDyeh1lipChufod6UbJj-HDHQFSWTtqvXlycb_Ta_4XzMbM6m3eUAB0yaSsuLzET2-XfbLUGpGOGe' },
        ].map((item) => (
          <div key={item.name} className={`glass-card rounded-2xl p-6 border-t-2 border-t-${item.color}`}>
            <div className="flex items-center gap-1 mb-4 text-yellow-400">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">{item.text}</p>
            <div className="flex items-center gap-3">
              <img className="w-10 h-10 rounded-full object-cover" src={item.avatar} referrerPolicy="no-referrer" />
              <div>
                <div className="text-white font-bold text-sm">{item.name}</div>
                <div className="text-gray-500 text-xs">{item.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-white/5 bg-[#0a0a0c] pt-20 pb-10 px-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="size-6 rounded bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-white">
              <Sparkles size={14} />
            </div>
            <span className="font-display font-bold text-lg text-white">BlogCraft AI</span>
          </div>
          <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
            인공지능 기반의 블로그 자동화 솔루션.<br />
            창작의 고통에서 벗어나 콘텐츠의 가치를 높이세요.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { title: '제품', links: ['기능 소개', '요금제', '업데이트'] },
            { title: '리소스', links: ['사용 가이드', 'API 문서', '커뮤니티'] },
            { title: '회사', links: ['소개', '채용', '연락처'] },
            { title: '법적 고지', links: ['이용약관', '개인정보처리방침'] },
          ].map(group => (
            <div key={group.title} className="flex flex-col gap-4">
              <h4 className="text-white font-bold text-sm">{group.title}</h4>
              {group.links.map(link => (
                <a key={link} href="#" className="text-gray-500 text-sm hover:text-white transition-colors">{link}</a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5">
        <p className="text-gray-600 text-xs">© 2024 BlogCraft AI Inc. All rights reserved.</p>
        <div className="flex gap-4">
          {[Globe, Send, Mail].map((Icon, i) => (
            <a key={i} href="#" className="text-gray-500 hover:text-white transition-colors">
              <Icon size={18} />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <EditorPreview />
      <Testimonials />
      <Footer />
    </div>
  );
}
