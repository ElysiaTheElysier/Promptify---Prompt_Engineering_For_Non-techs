import React, { useState } from 'react';
import { Award, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';
import { RubricAudit } from '../../types';

interface Props {
  audit: RubricAudit;
  compact?: boolean;
}

export const RubricScorecard: React.FC<Props> = ({ audit, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Determine badge color
  const getBadgeStyle = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 50) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 18) return 'bg-emerald-500';
    if (score >= 12) return 'bg-amber-500';
    return 'bg-rose-400';
  };

  const criteria = [
    { name: '1. Role & Persona Clarity (Role)', score: audit.personaScore, note: audit.personaNote },
    { name: '2. Explicit Task & Deliverable Objective (Task)', score: audit.taskScore, note: audit.taskNote },
    { name: '3. Guardrails & Risk Constraints (Constraints)', score: audit.guardrailsScore, note: audit.guardrailsNote },
    { name: '4. Parameterization & Variable Inputs {{variable}}', score: audit.variableScore, note: audit.variableNote },
    { name: '5. Target Output Layout (Markdown Table)', score: audit.formatScore, note: audit.formatNote },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Scorecard Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Automated Prompt Scorecard
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getBadgeStyle(audit.totalScore)}`}>
                {audit.totalScore} / 100 pts
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {audit.actionableAdvice}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
          >
            {isExpanded ? 'Collapse' : 'Details'}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* Progress Bars */}
          <div className="space-y-3">
            {criteria.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{item.name}</span>
                  <span className="font-mono font-bold text-slate-600">{item.score} / 20</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(item.score)}`}
                    style={{ width: `${(item.score / 20) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 pl-1">{item.note}</p>
              </div>
            ))}
          </div>

          {/* Actionable Advice Box */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Diagnosis & Iteration Recommendations:
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              {audit.actionableAdvice}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
