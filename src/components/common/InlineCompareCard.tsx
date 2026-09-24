import React from 'react';
import { GitCompare, ArrowRight, Sparkles } from 'lucide-react';
import { LabStep } from '../../types';

interface Props {
  lab: LabStep;
  runCount: number;
  onOpenFullCompare: () => void;
  currentPrompt?: string;
}

/**
 * Compare trigger banner on the main workspace:
 * - Hidden when runCount < 2
 * - When runCount >= 2, displays an elegant banner with "Compare with Previous Attempt"
 */
export const InlineCompareCard: React.FC<Props> = ({ 
  runCount, 
  onOpenFullCompare,
}) => {
  if (runCount < 2) return null;

  return (
    <div 
      data-tour="tour-compare"
      className="bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 animate-fadeIn shadow-2xs font-sans"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
          <GitCompare className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              You've run {runCount} attempts on this lesson!
            </h4>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Progress Comparison
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Open side-by-side comparison to inspect prompt diffs and measure quality improvements.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenFullCompare}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition transform active:scale-98 whitespace-nowrap"
      >
        <GitCompare className="w-4 h-4 text-emerald-400" />
        <span>Compare with Previous Attempt</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
