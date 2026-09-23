import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  Lock, 
  AlertCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { PromptifyMark } from '../common/PromptifyMark';

export const LandingLoginScreen: React.FC = () => {
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 1. Luồng Google OAuth THỰC SỰ — Không truy vấn DB trước khi OAuth hoàn tất
  const handleRealGoogleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      console.log('[Auth] Initiating Supabase Google OAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('[Auth] Supabase signInWithOAuth error:', error);
        setLoginError(error.message);
        setIsLoggingIn(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('[Auth] Unexpected error during Google login:', err);
      setLoginError(err?.message || 'Không thể kết nối đến máy chủ xác thực.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Simple Brand Bar */}
      <header className="border-b border-slate-800/80 px-6 py-4 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PromptifyMark />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-display">
                  Promptify
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  Học tập
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Nền tảng thực hành Prompt Engineering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Supabase & Google OAuth Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full" title="Dual-Mode MVP: Sẵn sàng kết nối Supabase qua .env">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Dual-Mode DB (Local Active)</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Môi trường đào tạo an toàn</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Login Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Value Proposition for Business Users */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chương trình tập huấn kỹ năng AI thực chiến</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Học Prompt Engineering qua các <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">tình huống công việc thực tế</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Không cần học lập trình. Thực hành cách giao việc cho AI, kiểm soát đầu ra và áp dụng vào công việc hằng ngày.
            </p>

            {/* 3 Core Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white">Xuất bảng biểu ngay</h4>
                <p className="text-xs text-slate-400">Định dạng bảng Markdown chuẩn chỉnh để dán vào Excel/Sheets.</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white">Chống bịa đặt</h4>
                <p className="text-xs text-slate-400">Buộc AI trả lời bám sát tài liệu quy định, nói có sách mách có chứng.</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white">Đúng mục tiêu</h4>
                <p className="text-xs text-slate-400">Định hình giọng văn và cấu trúc phù hợp với tình huống sử dụng.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Login Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-xl font-bold text-white">
                  Đăng nhập vào lớp học
                </h3>
                <p className="text-xs text-slate-400">
                  Sử dụng tài khoản Google đã được cấp quyền
                </p>
              </div>

              {/* Primary Google Login Button */}
              <button
                type="button"
                onClick={handleRealGoogleLogin}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded-xl transition duration-150 shadow-md hover:shadow-lg disabled:opacity-75 cursor-pointer"
              >
                {/* Official Google 'G' icon svg */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <span>{isLoggingIn ? 'Đang chuyển hướng sang Google...' : 'Đăng nhập bằng Google'}</span>
              </button>

              {/* Thông báo lỗi đăng nhập nếu có */}
              {loginError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in-50">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">Lỗi kết nối OAuth:</span>
                    <span>{loginError}</span>
                  </div>
                  <button onClick={() => setLoginError(null)} className="text-rose-400 hover:text-white font-bold ml-1">✕</button>
                </div>
              )}

              {/* Security guarantee note */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Không có tài khoản mẫu hoặc đăng nhập bỏ qua xác thực</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950/40">
        <p>
          Promptify © 2026 • Nền tảng đào tạo kỹ năng Prompt Engineering
        </p>
      </footer>
    </div>
  );
};

