import React, { useState } from 'react';
import { 
  Building2, 
  Megaphone, 
  Briefcase, 
  ArrowRight, 
  BookOpen, 
  LogOut, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { ClassCohort, Learner, Enrollment } from '../../types';
import { PromptifyMark } from '../common/PromptifyMark';

interface Props {
  learner?: Learner | null;
  cohorts: ClassCohort[];
  enrollments: Record<string, Enrollment>;
  totalLabCount: number;
  onSelectClass: (cohort: ClassCohort) => Promise<boolean>;
  onLogout: () => void;
}

export const ClassSelectionScreen: React.FC<Props> = ({
  learner,
  cohorts,
  enrollments,
  totalLabCount,
  onSelectClass,
  onLogout,
}) => {
  const [joinError, setJoinError] = useState<string>('');

  const getCohortIcon = (iconName: string) => {
    switch (iconName) {
      case 'Megaphone':
        return <Megaphone className="w-5 h-5 text-emerald-400" />;
      case 'Building2':
        return <Building2 className="w-5 h-5 text-teal-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      default:
        return <Briefcase className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <PromptifyMark />
            <div>
              <span className="font-extrabold text-base tracking-tight text-white font-display">
                Promptify
              </span>
              <span className="text-[11px] text-slate-400 block">
                Executive Prompt Engineering Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700 text-xs">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
                {learner?.avatarInitials || 'RV'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="font-semibold text-slate-200 block">{learner?.name || 'Reviewer'}</span>
                <span className="text-[10px] text-slate-400">{learner?.email || ''}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Sign out of account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Your Learning Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Select Your Cohort
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Welcome, <strong>{learner?.name || 'Reviewer'}</strong>. Open cohorts are immediately accessible; private enterprise cohorts appear once enrolled by an instructor.
          </p>
          {joinError && (
            <p className="text-xs text-rose-600 font-medium">{joinError}</p>
          )}
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cohorts.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <ShieldAlert className="mx-auto h-9 w-9 text-amber-600" />
              <h2 className="mt-3 text-base font-bold text-amber-950">No Enrolled Classes Found</h2>
              <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-amber-800">
                Please contact your administrator or instructor to be added to a cohort. Signing in does not grant automatic access without enrollment.
              </p>
            </div>
          )}
          {cohorts.map((cohort) => {
            const enrollmentKey = learner ? `${learner.id}_${cohort.id}` : '';
            const enrollment = enrollments[enrollmentKey];
            const completedCount = enrollment ? enrollment.completedLabIds.length : 0;
            const cohortTotal = cohort.totalLessons ?? totalLabCount;
            const safeTotal = Math.max(1, cohortTotal);
            const progressPercent = Math.round((completedCount / safeTotal) * 100);

            return (
              <div
                key={cohort.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-lg hover:border-emerald-500/60 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Header of Card */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      {getCohortIcon(cohort.iconName)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cohort.isPublic && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Open Access
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                      {cohort.name}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {cohort.description}
                  </p>

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Curriculum Progress:</span>
                      <span className="font-bold text-slate-800">{completedCount} / {cohortTotal} lessons ({progressPercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      const ok = await onSelectClass(cohort);
                      if (!ok) setJoinError('Class access has expired or was revoked.');
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <span>{completedCount > 0 ? 'Continue Learning' : cohort.isPublic ? 'Join Review Cohort' : 'Enter Class'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
};
