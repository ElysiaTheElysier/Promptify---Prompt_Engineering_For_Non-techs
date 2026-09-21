import React from 'react';
import { 
  BookOpen, 
  Sliders, 
  Columns, 
  Building2, 
  Cpu, 
  History, 
  UserCheck, 
  Zap, 
  Key,
  HelpCircle,
  Bookmark
} from 'lucide-react';
import { UIMode, ClassCohort, ApiConfig, PromptRun } from '../../types';

interface Props {
  currentMode: UIMode;
  onSelectMode: (mode: UIMode) => void;
  selectedCohort: ClassCohort;
  cohorts: ClassCohort[];
  onSelectCohort: (cohort: ClassCohort) => void;
  apiConfig: ApiConfig;
  onOpenApiModal: () => void;
  history: PromptRun[];
  onOpenHistory: () => void;
  onOpenTutorial?: () => void;
  onOpenPromptLibrary?: () => void;
}

export const Header: React.FC<Props> = ({
  currentMode,
  onSelectMode,
  selectedCohort,
  cohorts,
  onSelectCohort,
  apiConfig,
  onOpenApiModal,
  history,
  onOpenHistory,
  onOpenTutorial,
  onOpenPromptLibrary,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight font-display text-white">
                  PromptLab
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                  Thử nghiệm
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                Thực hành Prompt cho Cán bộ Nghiệp vụ
              </p>
            </div>
          </div>

          {/* Bộ chuyển đổi 3 Giao diện (Tabs) */}
          <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner flex-shrink-0">
            <button
              onClick={() => onSelectMode('notebook')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                currentMode === 'notebook'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Chế độ Sổ tay: Học từng bước như Jupyter Notebook"
            >
              <BookOpen className="w-4 h-4" />
              <span>1. Sổ tay tuần tự</span>
            </button>

            <button
              onClick={() => onSelectMode('playground')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                currentMode === 'playground'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Chế độ Phòng thực nghiệm: 2 cột độc lập"
            >
              <Sliders className="w-4 h-4" />
              <span>2. Phòng thực nghiệm</span>
            </button>

            <button
              onClick={() => onSelectMode('hybrid')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                currentMode === 'hybrid'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Chế độ Tích hợp: Vừa xem đề bài bên trái vừa thực hành bên phải"
            >
              <Columns className="w-4 h-4" />
              <span>3. Tích hợp song song</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded uppercase font-bold">Khuyên dùng</span>
            </button>
          </nav>

          {/* Tiện ích bên phải */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Chọn Mã Lớp */}
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 font-medium">Mã Lớp:</span>
              <select
                value={selectedCohort.id}
                onChange={(e) => {
                  const found = cohorts.find((c) => c.id === e.target.value);
                  if (found) onSelectCohort(found);
                }}
                className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer pr-1"
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.id} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Động cơ AI */}
            <button
              onClick={onOpenApiModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
                apiConfig.mode === 'simulated'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/40'
                  : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60 hover:bg-indigo-900/40'
              }`}
              title="Cài đặt Động cơ AI (Mô phỏng hoặc kết nối Gemini API)"
            >
              {apiConfig.mode === 'simulated' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mô phỏng</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Gemini Trực tiếp</span>
                </>
              )}
            </button>

            {/* Nút Xem lại hướng dẫn Onboarding */}
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white text-xs font-semibold border border-emerald-500/30 transition whitespace-nowrap"
                title="Xem lại toàn bộ quy trình làm bài (Guided Walkthrough)"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Xem lại hướng dẫn</span>
              </button>
            )}

            {/* Nút Thư viện Prompt (SOP Library) */}
            {onOpenPromptLibrary && (
              <button
                onClick={onOpenPromptLibrary}
                data-tour="tour-library"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-semibold border border-amber-500/30 transition whitespace-nowrap"
                title="Mở Thư viện Prompt Chuẩn Nghiệp vụ (SOP Library)"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Thư viện Prompt</span>
              </button>
            )}

            {/* Lịch sử Telemetry */}
            <button
              onClick={onOpenHistory}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Xem Nhật ký thực hành & Điểm số"
            >
              <History className="w-5 h-5" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>

            {/* Tài khoản học viên */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                LP
              </div>
              <div className="text-left text-[11px] leading-tight">
                <span className="font-semibold text-slate-200 block">linh.pham@agribank.com.vn</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                  <UserCheck className="w-3 h-3" /> Cán bộ Agribank
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
