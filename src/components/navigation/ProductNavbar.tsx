import React from 'react';
import { 
  Building2, 
  Home, 
  Map, 
  Sliders, 
  Bookmark, 
  History, 
  HelpCircle, 
  LogOut, 
  RefreshCw,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { AppView, ClassCohort, Learner } from '../../types';

interface Props {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  selectedCohort?: ClassCohort | null;
  onChangeClass: () => void;
  learner?: Learner | null;
  onLogout: () => void;
  onOpenTutorial: () => void;
  onResetAll?: () => void;
}

export const ProductNavbar: React.FC<Props> = ({
  currentView,
  onNavigate,
  selectedCohort,
  onChangeClass,
  learner,
  onLogout,
  onOpenTutorial,
  onResetAll,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* 1. Brand Logo */}
          <div 
            className="flex items-center gap-2.5 flex-shrink-0 select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight font-display text-white">
                Promptify
              </span>
              <p className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden sm:block">
                Prompt Engineering Portal
              </p>
            </div>
          </div>

          {/* 2. Main Navigation Tabs */}
          <nav className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner flex-shrink-0">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </button>

            <button
              onClick={() => onNavigate('learning_path')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'learning_path' || currentView === 'lesson'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Lộ trình học</span>
            </button>

            <button
              onClick={() => onNavigate('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'library'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Thư viện Prompt</span>
            </button>

            <button
              onClick={() => onNavigate('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'history'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử</span>
            </button>
          </nav>

          {/* 3. Class Badge + Actions + User Profile */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Current Class Badge & Change Class */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-medium">Lớp đang học:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[170px] block">
                  {selectedCohort?.name || 'Đang tải lớp học...'}
                </span>
              </div>
              <button
                onClick={onChangeClass}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition cursor-pointer"
                title="Đổi lớp học khác"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Xem lại hướng dẫn (Tutorial) */}
            <button
              onClick={onOpenTutorial}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white text-xs font-semibold border border-emerald-500/30 transition cursor-pointer whitespace-nowrap"
              title="Xem lại hướng dẫn cách học (Visual Walkthrough)"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Xem lại hướng dẫn</span>
            </button>

            {/* Learner Avatar & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {learner?.avatarInitials || 'LP'}
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <span className="font-semibold text-slate-200 block truncate max-w-[130px]">
                  {learner?.name || 'Học viên'}
                </span>
                <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                  {learner?.department || ''}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 transition cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-2 py-1 rounded ${currentView === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            Trang chủ
          </button>
          <button
            onClick={() => onNavigate('learning_path')}
            className={`px-2 py-1 rounded ${currentView === 'learning_path' || currentView === 'lesson' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            Lộ trình
          </button>
          <button
            onClick={() => onNavigate('library')}
            className={`px-2 py-1 rounded ${currentView === 'library' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            Thư viện
          </button>
          <button
            onClick={() => onNavigate('history')}
            className={`px-2 py-1 rounded ${currentView === 'history' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            Lịch sử
          </button>
        </div>
      </div>
    </header>
  );
};

