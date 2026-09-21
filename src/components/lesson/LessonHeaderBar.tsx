import React from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Columns, 
  HelpCircle, 
  Bookmark, 
  History, 
  ChevronRight,
  Sliders,
  Zap,
  Key
} from 'lucide-react';
import { ClassCohort, LabStep, UIMode, ApiConfig } from '../../types';

interface Props {
  cohort: ClassCohort;
  activeLab: LabStep;
  currentMode: UIMode;
  onSelectMode: (mode: UIMode) => void;
  onBackToDashboard: () => void;
  onOpenTutorial: () => void;
  onOpenPromptLibrary: () => void;
  onOpenHistory: () => void;
  apiConfig: ApiConfig;
  onOpenApiModal: () => void;
}

export const LessonHeaderBar: React.FC<Props> = ({
  cohort,
  activeLab,
  currentMode,
  onSelectMode,
  onBackToDashboard,
  onOpenTutorial,
  onOpenPromptLibrary,
  onOpenHistory,
  apiConfig,
  onOpenApiModal,
}) => {
  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-2.5 sticky top-16 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Breadcrumb & Back button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Quay lại Trang chủ Dashboard của lớp học"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Quay lại Lớp học</span>
          </button>

          {/* Breadcrumb text */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-300 font-medium truncate max-w-[140px] md:max-w-[180px]">
              {cohort.name}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-400 font-mono text-[11px]">
              Bài {activeLab.order}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-emerald-400 font-semibold truncate max-w-[200px] md:max-w-[280px]">
              {activeLab.title}
            </span>
          </div>
        </div>

        {/* Right: UI Mode Switcher (Notebook vs Hybrid) & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Layout switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onSelectMode('hybrid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                currentMode === 'hybrid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Giao diện song song: Vừa xem đề bài vừa thực hành"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Song song (Khuyên dùng)</span>
              <span className="md:hidden">Song song</span>
            </button>

            <button
              onClick={() => onSelectMode('notebook')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                currentMode === 'notebook'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Giao diện sổ tay: Làm từng bước tuần tự"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sổ tay tuần tự</span>
              <span className="md:hidden">Sổ tay</span>
            </button>
          </div>

          {/* Quick Library button */}
          <button
            onClick={onOpenPromptLibrary}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition cursor-pointer"
            title="Mở Thư viện Prompt Mẫu"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Thư viện</span>
          </button>

          {/* Tutorial button */}
          <button
            onClick={onOpenTutorial}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition cursor-pointer"
            title="Xem lại hướng dẫn thao tác"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Hướng dẫn</span>
          </button>
        </div>
      </div>
    </div>
  );
};

