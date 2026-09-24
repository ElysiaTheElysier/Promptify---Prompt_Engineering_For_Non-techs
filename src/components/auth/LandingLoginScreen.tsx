import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Mail,
  FileSpreadsheet,
  Layers,
  Search,
  Users,
  Lock,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { PromptifyMark } from '../common/PromptifyMark';
import { RevealOnScroll } from '../landing/RevealOnScroll';
import { AnimatedBrandWatermark } from '../landing/AnimatedBrandWatermark';

export const LandingLoginScreen: React.FC = () => {
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Luồng Google OAuth thực tế - Giữ nguyên 100% logic
  const handleRealGoogleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setLoginError(error.message);
        setIsLoggingIn(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Không thể kết nối đến máy chủ xác thực.');
      setIsLoggingIn(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col overflow-x-hidden">
      {/* Dynamic Background Watermark Logo & Ambient Bloom */}
      <AnimatedBrandWatermark />

      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <PromptifyMark className="h-8 w-8 sm:h-9 sm:w-9" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-950 font-display">
                  Promptify
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Doanh nghiệp
                </span>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              onClick={() => scrollToSection('problems')}
              className="hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
            >
              Thực trạng
            </button>
            <button
              onClick={() => scrollToSection('core-principles')}
              className="hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
            >
              Nguyên tắc làm việc
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
            >
              Cách hoạt động
            </button>
            <button
              onClick={() => scrollToSection('practical-values')}
              className="hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
            >
              Ứng dụng thực tế
            </button>
          </nav>

          {/* Quick Login CTA - Nút nền trắng sáng, border slate-200, icon chuẩn */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRealGoogleLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300 text-xs sm:text-sm font-semibold py-2 px-3.5 sm:px-4 rounded-xl transition-all duration-200 shadow-none hover:shadow-2xs cursor-pointer disabled:opacity-60 active:scale-[0.98]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoggingIn ? 'Đang kết nối...' : 'Đăng nhập'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1 relative z-10">
        
        {/* 2. HERO SECTION - BỐ CỤC 55/45: TRÁI ACTION, PHẢI BRAND MANIFESTO */}
        <section className="pt-16 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 border-b border-slate-200/70 bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              {/* CỘT TRÁI (55%): Headline lớn, Mô tả, CTAs */}
              <div className="lg:col-span-7 space-y-7 animate-hero-fade">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs sm:text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Kỹ năng làm việc thực chiến với AI</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-extrabold tracking-tight text-slate-950 leading-[1.08] text-balance">
                    Học cách làm việc hiệu quả với AI.
                  </h1>
                  <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl text-balance font-normal">
                    Thực hành trên tình huống công việc thật, nhận phản hồi ngay và hiểu cách cải thiện prompt - không cần nền tảng kỹ thuật.
                  </p>
                </div>

                {/* CTAs */}
                <div className="space-y-4 pt-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                    <button
                      type="button"
                      onClick={handleRealGoogleLogin}
                      disabled={isLoggingIn}
                      className="group inline-flex items-center justify-center gap-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base py-4 px-7 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>{isLoggingIn ? 'Đang kết nối...' : 'Bắt đầu học với Google'}</span>
                      <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollToSection('how-it-works')}
                      className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base py-4 px-6 rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer shadow-2xs"
                    >
                      <span>Xem cách hoạt động</span>
                    </button>
                  </div>

                  {loginError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold block">Không thể đăng nhập:</span>
                        <span>{loginError}</span>
                      </div>
                      <button onClick={() => setLoginError(null)} className="text-rose-600 hover:text-rose-900 font-bold ml-1">✕</button>
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-slate-500 pt-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dành cho nhân sự văn phòng, không yêu cầu kiến thức lập trình</span>
                  </p>
                </div>
              </div>

              {/* CỘT PHẢI (45%): BRAND STATEMENT / MANIFESTO (EDITORIAL, KHÔNG CARD) */}
              <div className="lg:col-span-5 pt-6 lg:pt-0 animate-hero-fade">
                <div className="border-l-4 border-emerald-600 pl-6 sm:pl-9 py-3 space-y-4">
                  <p className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-slate-950 leading-[1.18] tracking-tight">
                    Đừng chỉ dùng AI.<br />
                    Hãy biết cách{' '}
                    <span className="text-emerald-700 underline decoration-emerald-400 decoration-4 underline-offset-8">
                      làm việc với AI.
                    </span>
                  </p>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal pt-2">
                    Rõ yêu cầu. Kiểm soát kết quả. Áp dụng được vào công việc.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. SECTION THỰC TRẠNG - NỀN TRẮNG SÁNG, PHÂN CÁCH RÕ RÀNG */}
        <section id="problems" className="py-20 sm:py-28 lg:py-32 bg-white border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
            <RevealOnScroll direction="up" delay={0}>
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 text-balance leading-snug">
                  Dùng AI nhiều không có nghĩa là dùng AI hiệu quả.
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
                  Nhiều nhân sự đã quen đặt câu hỏi cho AI, nhưng phần lớn thời gian làm việc vẫn bị lãng phí vì kết quả đầu ra chưa thể dùng ngay.
                </p>
              </div>
            </RevealOnScroll>

            {/* 3 Thực trạng dạng Editorial Top-Dividers với Stagger Animation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-2">
              <RevealOnScroll direction="up" delay={80}>
                <div className="border-t-2 border-slate-200 pt-6 space-y-3">
                  <span className="text-sm font-mono font-bold text-slate-400">01</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Kết quả không ổn định
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Cùng một công việc nhưng mỗi lần hỏi AI lại trả về một kiểu khác nhau, lúc trúng ý lúc lan man thiếu trọng tâm.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={180}>
                <div className="border-t-2 border-slate-200 pt-6 space-y-3">
                  <span className="text-sm font-mono font-bold text-slate-400">02</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Phải sửa lại nhiều lần
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Mất nhiều thời gian giải thích thêm vì chưa biết cách giao việc đủ ngữ cảnh, ràng buộc và định dạng mong muốn ngay từ đầu.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={280}>
                <div className="border-t-2 border-slate-200 pt-6 space-y-3">
                  <span className="text-sm font-mono font-bold text-slate-400">03</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Khó biết prompt sai ở đâu
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Khi kết quả chưa đạt, người dùng thường chỉ gõ lại ngẫu nhiên mà không rõ mình đang thiếu thành phần nào trong câu lệnh.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* 4. SECTION NGUYÊN TẮC LÀM VIỆC - NỀN XANH MINT NHẸ, PHÂN CÁCH NỔI BẬT */}
        <section id="core-principles" className="py-20 sm:py-28 lg:py-32 bg-emerald-50/30 border-b border-emerald-100/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
            <RevealOnScroll direction="up" delay={0}>
              <div className="max-w-2xl space-y-3">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 leading-snug">
                  Ba nguyên tắc làm việc với AI
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  Nắm vững cách kiểm soát đầu ra để ứng dụng an toàn và chuẩn xác trong công việc hằng ngày.
                </p>
              </div>
            </RevealOnScroll>

            {/* 3 CỘT KHÔNG CARD: Typography + Whitespace + Top Divider + Emerald Accent */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              <RevealOnScroll direction="up" delay={100}>
                <div className="border-t-2 border-emerald-600 pt-6 space-y-3.5">
                  <span className="text-sm font-mono font-bold text-emerald-700">01</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Giao việc rõ ràng
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Biết cách nói cho AI chính xác mình cần gì và kết quả nên trông thế nào.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={200}>
                <div className="border-t-2 border-slate-300 hover:border-emerald-600 transition-colors duration-200 pt-6 space-y-3.5">
                  <span className="text-sm font-mono font-bold text-slate-400">02</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Kiểm soát kết quả
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Dùng ví dụ, giới hạn và cấu trúc để giảm việc phải sửa đi sửa lại.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={300}>
                <div className="border-t-2 border-slate-300 hover:border-emerald-600 transition-colors duration-200 pt-6 space-y-3.5">
                  <span className="text-sm font-mono font-bold text-slate-400">03</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Làm việc với dữ liệu đáng tin cậy
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Biết khi nào AI cần bám tài liệu, nguồn dữ liệu hoặc quy định có sẵn.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* 5. SECTION CÁCH HOẠT ĐỘNG - NỀN TRẮNG, 3 BƯỚC TUẦN TỰ */}
        <section id="how-it-works" className="py-20 sm:py-28 lg:py-32 bg-white border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
            <RevealOnScroll direction="up" delay={0}>
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 text-balance leading-snug">
                  Cách Promptify giúp bạn tiến bộ
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
                  Học qua thực hành có đối chiếu: viết, thử nghiệm và nhận phản hồi tức thì để hình thành phản xạ giao việc chuẩn xác.
                </p>
              </div>
            </RevealOnScroll>

            {/* 3 Bước thực hành tuần tự với Stagger Reveal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <RevealOnScroll direction="up" delay={100}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 tracking-wide uppercase">Bước đầu tiên</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Viết prompt theo tình huống thật
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Đối diện trực tiếp với tài liệu, tờ trình hoặc email thực tế. Tự tay viết câu lệnh giao việc theo tư duy nghiệp vụ của bạn.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={220}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center">
                      2
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 tracking-wide uppercase">Thực thi trực tiếp</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Chạy với mô hình AI
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Gửi câu lệnh tới AI và quan sát ngay kết quả tạo ra. Kiểm tra xem văn bản có đúng ý định và đúng yêu cầu công việc hay chưa.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={340}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center">
                      3
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 tracking-wide uppercase">Cải thiện liên tục</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Nhận feedback và cải thiện
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Hệ thống phân tích cấu trúc prompt, chỉ ra điểm làm tốt, phần còn thiếu và gợi ý cách điều chỉnh để lần chạy sau đạt kết quả cao hơn.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* 6. SECTION ỨNG DỤNG THỰC TẾ - NỀN XÁM NHẠT, 6 CARDS RÕ RÀNG */}
        <section id="practical-values" className="py-20 sm:py-28 lg:py-32 bg-slate-50/70 border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
            <RevealOnScroll direction="up" delay={0}>
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 text-balance leading-snug">
                  Áp dụng ngay vào công việc hằng ngày
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
                  Biến kỹ năng giao việc cho AI thành năng suất cụ thể cho các tác vụ văn phòng quen thuộc.
                </p>
              </div>
            </RevealOnScroll>

            {/* 6 Work use cases dạng Card hoàn chỉnh, stagger delay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              <RevealOnScroll direction="up" delay={50}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Soạn thảo Email</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Soạn thư từ chối, giải thích quy định hoặc trao đổi đối tác đúng chuẩn mực.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={120}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Lập báo cáo</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Tổng hợp thông tin đa nguồn thành báo cáo định kỳ rõ ràng, mạch lạc.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={190}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Tóm tắt văn bản dài</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Rút ngắn tờ trình, hợp đồng, biên bản họp thành các điểm mấu chốt.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={260}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Phân loại hồ sơ</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Phân luồng phản ánh khách hàng, mức độ ưu tiên hoặc tiêu chí phân loại.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={330}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Trích xuất bảng biểu</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Bóc tách chỉ tiêu từ văn bản thô dán thẳng vào bảng tính Excel hoặc Sheets.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={400}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Tra cứu tài liệu nội bộ</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Tìm kiếm điều khoản và căn cứ trong cẩm nang quy trình nghiệp vụ.</p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* 7. SECTION FINAL CTA - CONTAINER SÁNG CAO CẤP, KHÔNG HỘP ĐEN */}
        <section className="py-20 sm:py-28 lg:py-32 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <RevealOnScroll direction="up" delay={50} duration={700}>
              <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 border-2 border-emerald-200/80 text-center space-y-7 shadow-xs">
                <div className="space-y-3 max-w-xl mx-auto">
                  <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-slate-950 leading-tight">
                    Bắt đầu làm việc với AI rõ ràng hơn.
                  </h2>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                    Thực hành ngay hôm nay để biến AI thành cộng sự đắc lực trong công việc của bạn.
                  </p>
                </div>

                {/* Google CTA: Nền trắng, viền emerald nổi bật, không hộp đen */}
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleRealGoogleLogin}
                    disabled={isLoggingIn}
                    className="group inline-flex items-center justify-center gap-3.5 bg-white hover:bg-emerald-50 text-slate-950 font-bold text-base sm:text-lg py-4 px-8 rounded-xl border-2 border-emerald-600 shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isLoggingIn ? 'Đang chuyển hướng sang Google...' : 'Đăng nhập với Google'}</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Môi trường đào tạo nội bộ an toàn và bảo mật</span>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      </main>

      {/* 8. FOOTER */}
      <footer className="relative z-10 border-t border-slate-200 py-10 px-4 sm:px-6 bg-slate-50 text-center text-sm text-slate-500">
        <p>
          Promptify © 2026 • Nền tảng thực hành kỹ năng Prompt Engineering cho nhân sự doanh nghiệp
        </p>
      </footer>
    </div>
  );
};
