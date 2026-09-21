import React from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Activity, 
  ArrowLeftRight, 
  LogOut,
  GraduationCap,
  HelpCircle
} from 'lucide-react';
import { InstructorViewMode } from '../../types/instructor';
import { CURRENT_INSTRUCTOR } from '../../data/instructorData';

interface Props {
  currentView: InstructorViewMode;
  onNavigate: (view: InstructorViewMode) => void;
  onSwitchToLearner: () => void;
  onLogout: () => void;
  onOpenTutorial?: () => void;
}

export const InstructorNavbar: React.FC<Props> = ({
  currentView,
  onNavigate,
  onSwitchToLearner,
  onLogout,
  onOpenTutorial
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* 1. Logo & Badge */}
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 group select-none"
            title="Về Tổng quan Quản lý lớp"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md group-hover:scale-105 transition">
              <GraduationCap className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight font-display text-white">
                  Promptify
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Instructor View
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Cổng Điều phối Workshop & Quản lý Lớp học
              </p>
            </div>
          </div>

          {/* 2. Navigation Tabs */}
          <nav data-tour="instructor-nav-tabs" className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner flex-shrink-0">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Tổng quan</span>
            </button>

            <button
              onClick={() => onNavigate('classes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'classes' || currentView === 'class_detail'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Lớp học</span>
            </button>

            <button
              onClick={() => onNavigate('learners')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'learners'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Học viên (86)</span>
            </button>

            <button
              onClick={() => onNavigate('activity')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'activity'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Nhật ký hoạt động</span>
            </button>
          </nav>

          {/* 3. Actions & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Tutorial button for current tab */}
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-semibold text-xs transition cursor-pointer"
                title="Xem lại hướng dẫn thao tác cho tab hiện tại"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Hướng dẫn</span>
              </button>
            )}

            {/* Quick Switch to Learner View */}
            <button
              data-tour="instructor-switch-role"
              onClick={onSwitchToLearner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md transition cursor-pointer"
              title="Chuyển sang giao diện Học viên để làm bài thực hành"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chuyển sang Học viên</span>
            </button>

            {/* Instructor Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-indigo-700 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {CURRENT_INSTRUCTOR.avatarInitials}
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <span className="font-semibold text-slate-200 block truncate max-w-[140px]">
                  {CURRENT_INSTRUCTOR.name}
                </span>
                <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                  {CURRENT_INSTRUCTOR.department}
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

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-2 py-1 rounded ${currentView === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => onNavigate('classes')}
            className={`px-2 py-1 rounded ${currentView === 'classes' || currentView === 'class_detail' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            Lớp học
          </button>
          <button
            onClick={() => onNavigate('learners')}
            className={`px-2 py-1 rounded ${currentView === 'learners' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            Học viên
          </button>
          <button
            onClick={() => onNavigate('activity')}
            className={`px-2 py-1 rounded ${currentView === 'activity' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            Nhật ký
          </button>
          {onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="px-2 py-1 text-emerald-400 font-bold flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>HD</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

