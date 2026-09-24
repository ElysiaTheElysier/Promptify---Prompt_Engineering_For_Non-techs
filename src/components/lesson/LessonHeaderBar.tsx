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
    <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 sticky top-16 z-30 shadow-2xs">
      <div className="max-w-[1560px] mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Breadcrumb & Back button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition cursor-pointer active:scale-95"
            title="Return to Class Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Back to Dashboard</span>
          </button>

          {/* Breadcrumb text */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-slate-700 font-medium truncate max-w-[140px] md:max-w-[200px]">
              {cohort.name}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
              Lesson {activeLab.order}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 font-bold truncate max-w-[220px] md:max-w-[320px]">
              {activeLab.title}
            </span>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          {/* AI Engine Status */}
          <button
            onClick={onOpenApiModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-2xs ${
              apiConfig?.mode === 'simulated'
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Configure AI Engine"
          >
            {apiConfig?.mode === 'simulated' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>AI: Simulated</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI: Live Server</span>
              </>
            )}
          </button>

          {/* Quick Library button */}
          <button
            onClick={onOpenPromptLibrary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition cursor-pointer shadow-2xs"
            title="Open Prompt Library"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">Library</span>
          </button>

          {/* Tutorial button */}
          <button
            onClick={onOpenTutorial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer shadow-2xs"
            title="View Guided Walkthrough"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
};
