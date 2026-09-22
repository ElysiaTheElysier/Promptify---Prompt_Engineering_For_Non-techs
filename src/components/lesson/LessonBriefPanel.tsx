import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, FileText, HelpCircle, Target } from 'lucide-react';
import { LabStep } from '../../types';
import { COMPONENT_METADATA } from '../../services/promptStructureAnalyzer';

interface Props {
  lab: LabStep;
  onCopyData: () => void;
  isDataCopied: boolean;
}

export const LessonBriefPanel: React.FC<Props> = ({ lab, onCopyData, isDataCopied }) => {
  const [showData, setShowData] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const estimatedDuration = lab.badge.match(/\d+\s*[-–]\s*\d+\s*(?:phút|minutes?)/i)?.[0];
  const taskBullets = [
    lab.taskGoal,
    lab.rubricCriteria.task,
    lab.rubricCriteria.guardrails,
    lab.expectedOutputFormat,
  ].filter((item, index, items) => item && items.indexOf(item) === index).slice(0, 5);

  return (
    <aside className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-5" data-tour="tour-scenario">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">1. Đọc đề bài · Bài {lab.order}</span>
          {estimatedDuration && <span className="text-[11px] text-slate-500">{estimatedDuration}</span>}
        </div>
        <h2 className="text-lg font-bold text-slate-900 leading-snug">{lab.title}</h2>
      </div>

      <div className="rounded-xl bg-emerald-50/70 p-3.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
          <Target className="w-3.5 h-3.5 text-emerald-700" /> Mục tiêu
        </div>
        <p className="text-xs text-emerald-950 leading-relaxed">{lab.focusSkill}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-800">Nhiệm vụ</p>
        <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
          {taskBullets.map((item, index) => <li key={index} className="flex gap-2"><span className="text-emerald-600">•</span><span>{item}</span></li>)}
        </ul>
      </div>

      <div className="border-t border-slate-100 pt-3">
          <button type="button" onClick={() => setShowData(!showData)} className="w-full flex items-center justify-between text-xs font-semibold text-indigo-950 hover:text-indigo-700">
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-indigo-600" />Xem dữ liệu bài tập</span>
            {showData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showData && (
            <div className="mt-3 space-y-2 animate-fadeIn">
              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{lab.scenario}</p>
              {lab.sampleInputContext && <div className="flex justify-end">
                <button type="button" onClick={onCopyData} className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1">
                  {isDataCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {isDataCopied ? 'Đã sao chép' : 'Sao chép dữ liệu'}
                </button>
              </div>}
              {lab.sampleInputContext && <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-[11px] leading-relaxed text-slate-700">{lab.sampleInputContext}</pre>}
            </div>
          )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-800">Kỹ năng đang luyện</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">{lab.focusSkill}</span>
          {(lab.focusComponents || []).slice(0, 3).map((type) => <span key={type} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">{COMPONENT_METADATA[type].shortLabel}</span>)}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <button type="button" onClick={() => setShowGuidance(!showGuidance)} className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-950">
          <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-slate-500" />Rubric & gợi ý nâng cao</span>
          {showGuidance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showGuidance && (
          <div className="mt-3 space-y-3 animate-fadeIn text-xs text-slate-600 leading-relaxed">
            <p className="rounded-lg bg-slate-50 p-3 italic">{lab.conceptExplanation}</p>
            <ul className="list-disc space-y-1 pl-4">{lab.hints.map((hint, index) => <li key={index}>{hint}</li>)}</ul>
          </div>
        )}
      </div>
    </aside>
  );
};
