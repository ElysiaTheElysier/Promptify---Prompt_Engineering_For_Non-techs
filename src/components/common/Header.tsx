import React from 'react';
import { 
  BookOpen, 
  Sliders, 
  Columns, 
  Cpu, 
  History, 
  UserCheck, 
  Zap, 
  Key,
  HelpCircle,
  Bookmark
} from 'lucide-react';
import { UIMode, ClassCohort, ApiConfig, PromptRun } from '../../types';
import { PromptifyMark } from './PromptifyMark';

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
            <PromptifyMark />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight font-display text-white">
                  Promptify
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                  Review
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                Prompt Engineering for Business Teams
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner flex-shrink-0">
            <button
              onClick={() => onSelectMode('notebook')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                currentMode === 'notebook'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Notebook Mode: Sequential step-by-step learning"
            >
              <BookOpen className="w-4 h-4" />
              <span>1. Notebook</span>
            </button>

            <button
              onClick={() => onSelectMode('playground')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                currentMode === 'playground'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Playground Mode: Independent 2-column sandbox"
            >
              <Sliders className="w-4 h-4" />
              <span>2. Playground</span>
            </button>

            <button
              onClick={() => onSelectMode('hybrid')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                currentMode === 'hybrid'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Hybrid Mode: Brief on the left, workspace on the right"
            >
              <Columns className="w-4 h-4" />
              <span>3. Hybrid Workspace</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded uppercase font-bold">Recommended</span>
            </button>
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Class Selector */}
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 font-medium">Class:</span>
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

            {/* AI Engine */}
            <button
              onClick={onOpenApiModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
                apiConfig.mode === 'simulated'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/40'
                  : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60 hover:bg-indigo-900/40'
              }`}
              title="AI Engine Settings (Simulated or Live LLM)"
            >
              {apiConfig.mode === 'simulated' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Simulated</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live AI</span>
                </>
              )}
            </button>

            {/* Tutorial Walkthrough */}
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white text-xs font-semibold border border-emerald-500/30 transition whitespace-nowrap"
                title="Review guided tutorial walkthrough"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Tutorial</span>
              </button>
            )}

            {/* Prompt Library */}
            {onOpenPromptLibrary && (
              <button
                onClick={onOpenPromptLibrary}
                data-tour="tour-library"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-semibold border border-amber-500/30 transition whitespace-nowrap"
                title="Open Standard Prompt Library (SOPs)"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Prompt Library</span>
              </button>
            )}

            {/* Telemetry History */}
            <button
              onClick={onOpenHistory}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="View Practice History & Telemetry"
            >
              <History className="w-5 h-5" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>

            {/* Reviewer Account */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                RV
              </div>
              <div className="text-left text-[11px] leading-tight">
                <span className="font-semibold text-slate-200 block">reviewer@promptify.internal</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                  <UserCheck className="w-3 h-3" /> External Reviewer
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
