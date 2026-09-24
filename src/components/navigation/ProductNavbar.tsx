import React from 'react';
import { 
  Home, 
  Map, 
  Bookmark, 
  History, 
  LogOut, 
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { AppView, ClassCohort, Learner } from '../../types';
import { PromptifyMark } from '../common/PromptifyMark';

interface Props {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  selectedCohort?: ClassCohort | null;
  availableCohorts: ClassCohort[];
  onSelectClass: (cohort: ClassCohort) => Promise<boolean>;
  onChangeClass: () => void;
  learner?: Learner | null;
  onLogout: () => void;
}

export const ProductNavbar: React.FC<Props> = ({
  currentView,
  onNavigate,
  selectedCohort,
  availableCohorts,
  onSelectClass,
  onChangeClass,
  learner,
  onLogout,
}) => {
  const handleClassChange = (classId: string) => {
    const cohort = availableCohorts.find((item) => item.id === classId);
    if (cohort && cohort.id !== selectedCohort?.id) {
      void onSelectClass(cohort);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/80 sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* 1. Brand Logo */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 flex-shrink-0 select-none rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            title="Return to Home and class overview"
          >
            <PromptifyMark className="h-8 w-8" />
            <div>
              <span className="font-extrabold text-base tracking-tight font-display text-slate-950">
                Promptify
              </span>
              <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap hidden sm:block">
                Prompt Engineering Portal
              </p>
            </div>
          </button>

          {/* 2. Main Navigation Tabs */}
          <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-shrink-0">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold border border-emerald-200/60'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => onNavigate('learning_path')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'learning_path' || currentView === 'lesson'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold border border-emerald-200/60'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Learning Path</span>
            </button>

            <button
              onClick={() => onNavigate('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'library'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold border border-emerald-200/60'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Prompt Library</span>
            </button>

            <button
              onClick={() => onNavigate('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'history'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold border border-emerald-200/60'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </nav>

          {/* 3. Class Badge + Actions + User Profile */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Current Class Badge & Change Class */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/90 text-xs transition">
              <div className="text-left">
                <span className="text-[10px] text-slate-500 block font-medium">Active Class:</span>
                <div className="relative flex items-center">
                  {availableCohorts.length > 1 ? (
                    <>
                      <select
                        value={selectedCohort?.id || ''}
                        onChange={(event) => handleClassChange(event.target.value)}
                        className="appearance-none bg-transparent pr-5 text-emerald-700 font-bold truncate max-w-[190px] cursor-pointer outline-none"
                        aria-label="Select active class"
                        title="Select an enrolled class"
                      >
                        {availableCohorts.map((cohort) => (
                          <option key={cohort.id} value={cohort.id} className="bg-white text-slate-900">
                            {cohort.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-slate-500" />
                    </>
                  ) : (
                    <span className="text-emerald-700 font-bold truncate max-w-[220px]">
                      {selectedCohort?.name || availableCohorts[0]?.name || 'English Review'}
                    </span>
                  )}
                </div>
              </div>
              {availableCohorts.length > 1 && (
                <button
                  onClick={onChangeClass}
                  className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                  title="Switch class"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Learner Avatar & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-600/30 flex items-center justify-center text-xs font-bold text-white shadow-2xs">
                {learner?.avatarInitials || 'RV'}
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <span className="font-semibold text-slate-900 block truncate max-w-[130px]">
                  {learner?.name || 'Reviewer'}
                </span>
                <span className="text-[10px] text-slate-500 block truncate max-w-[130px]">
                  {learner?.email || ''}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-200/80 text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-2 py-1 rounded-lg ${currentView === 'dashboard' ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-slate-600'}`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('learning_path')}
            className={`px-2 py-1 rounded-lg ${currentView === 'learning_path' || currentView === 'lesson' ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-slate-600'}`}
          >
            Path
          </button>
          <button
            onClick={() => onNavigate('library')}
            className={`px-2 py-1 rounded-lg ${currentView === 'library' ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-slate-600'}`}
          >
            Library
          </button>
          <button
            onClick={() => onNavigate('history')}
            className={`px-2 py-1 rounded-lg ${currentView === 'history' ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-slate-600'}`}
          >
            History
          </button>
        </div>

        {/* Class switcher for tablet and mobile */}
        <div className="flex lg:hidden items-center gap-2 border-t border-slate-200/80 py-2">
          <span className="shrink-0 text-[10px] font-medium text-slate-500">Class:</span>
          {availableCohorts.length > 1 ? (
            <>
              <div className="relative min-w-0 flex-1">
                <select
                  value={selectedCohort?.id || ''}
                  onChange={(event) => handleClassChange(event.target.value)}
                  className="w-full appearance-none truncate rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-7 text-xs font-semibold text-emerald-700 outline-none focus:border-emerald-500"
                  aria-label="Select active class"
                >
                  {availableCohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id} className="bg-white text-slate-900">
                      {cohort.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </div>
              <button
                onClick={onChangeClass}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="View all available classes"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span className="text-emerald-700 font-semibold text-xs truncate">
              {selectedCohort?.name || availableCohorts[0]?.name || 'English Review'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
