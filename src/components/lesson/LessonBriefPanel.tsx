import React, { useEffect, useRef, useState } from 'react';
import { 
  BookOpen, 
  FileText, 
  Lightbulb, 
  KeyRound, 
  Lock, 
  Check, 
  Copy, 
  ChevronRight, 
  Target, 
  Sparkles, 
  HelpCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { LabStep } from '../../types';
import { MarkdownView } from '../common/MarkdownView';

export interface LessonBriefPanelProps {
  lab: LabStep;
  showDataAccordion?: boolean;
  setShowDataAccordion?: (show: boolean) => void;
  isDataCopied: boolean;
  onCopySampleData: () => void;
  hasViewedHints: boolean;
  hasViewedSolution: boolean;
  onRequestViewHints: () => void;
  onRequestViewSolution: () => void;
}

export type LessonPanelTab = 'theory' | 'exercise' | 'hints' | 'solution';

export const LessonBriefPanel: React.FC<LessonBriefPanelProps> = ({
  lab,
  isDataCopied,
  onCopySampleData,
  hasViewedHints,
  hasViewedSolution,
  onRequestViewHints,
  onRequestViewSolution,
}) => {
  const [activeTab, setActiveTab] = useState<LessonPanelTab>('theory');
  const [isSolutionCopied, setIsSolutionCopied] = useState<boolean>(false);
  const [tutorialShowsData, setTutorialShowsData] = useState<boolean>(false);
  const tabBeforeTutorialRef = useRef<LessonPanelTab>('theory');
  const tutorialChangedTabRef = useRef<boolean>(false);

  useEffect(() => {
    const handleTutorialStep = (event: Event) => {
      const detail = (event as CustomEvent).detail as { isOpen?: boolean; demoAction?: string };
      if (!detail?.isOpen) {
        setTutorialShowsData(false);
        if (tutorialChangedTabRef.current) {
          setActiveTab(tabBeforeTutorialRef.current);
          tutorialChangedTabRef.current = false;
        }
        return;
      }
      if (detail.demoAction === 'show-data') {
        if (!tutorialChangedTabRef.current) {
          tabBeforeTutorialRef.current = activeTab;
          tutorialChangedTabRef.current = true;
        }
        setTutorialShowsData(true);
        setActiveTab('exercise');
      }
    };
    window.addEventListener('promptify:tutorial-step', handleTutorialStep);
    return () => window.removeEventListener('promptify:tutorial-step', handleTutorialStep);
  }, [activeTab]);

  const tutorialData = lab.sampleInputContext || (tutorialShowsData
    ? `SAMPLE CONTROL DATA — Tutorial demo mode\nTask: ${lab.taskGoal}\nExpected Output Format: ${lab.expectedOutputFormat}`
    : '');

  const handleCopySolution = () => {
    if (lab.improvedPrompt) {
      navigator.clipboard.writeText(lab.improvedPrompt);
      setIsSolutionCopied(true);
      setTimeout(() => setIsSolutionCopied(false), 2000);
    }
  };

  return (
    <div 
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-6rem)] sm:max-h-[780px] transition-all"
      data-tour="tour-scenario"
    >
      {/* 1. LESSON HEADER */}
      <div className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Lesson {lab.order} Mission
          </span>
          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
            {lab.badge}
          </span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2">
          {lab.title}
        </h2>
        {lab.focusSkill && (
          <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 pt-1 line-clamp-1">
            <Target className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Focus: {lab.focusSkill}</span>
          </p>
        )}
      </div>

      {/* 2. PEDAGOGY TAB BAR */}
      <div className="grid grid-cols-4 bg-slate-100/90 p-1 border-b border-slate-200 text-xs font-semibold select-none">
        {/* Tab 1: Theory */}
        <button
          type="button"
          onClick={() => setActiveTab('theory')}
          className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'theory'
              ? 'bg-white text-emerald-800 shadow-xs font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          title="Core concept and enterprise framing"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">Theory</span>
        </button>

        {/* Tab 2: Assignment */}
        <button
          type="button"
          data-tour="tour-data-trigger"
          onClick={() => setActiveTab('exercise')}
          className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'exercise'
              ? 'bg-white text-emerald-800 shadow-xs font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          title="Business scenario and task inputs"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">Assignment</span>
        </button>

        {/* Tab 3: Hints */}
        <button
          type="button"
          onClick={() => setActiveTab('hints')}
          className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'hints'
              ? 'bg-white text-amber-800 shadow-xs font-bold border border-amber-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          title="Step-by-step thinking hints"
        >
          <Lightbulb className={`w-3.5 h-3.5 shrink-0 ${hasViewedHints ? 'text-amber-500' : 'text-slate-400'}`} />
          <span className="text-[11px] sm:text-xs flex items-center gap-0.5">
            <span>Hints</span>
            {!hasViewedHints && <Lock className="w-2.5 h-2.5 text-slate-400" />}
          </span>
        </button>

        {/* Tab 4: Solution */}
        <button
          type="button"
          onClick={() => setActiveTab('solution')}
          className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'solution'
              ? 'bg-white text-rose-800 shadow-xs font-bold border border-rose-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          title="Reference prompt and solution breakdown"
        >
          <KeyRound className={`w-3.5 h-3.5 shrink-0 ${hasViewedSolution ? 'text-rose-600' : 'text-slate-400'}`} />
          <span className="text-[11px] sm:text-xs flex items-center gap-0.5">
            <span>Solution</span>
            {!hasViewedSolution && <Lock className="w-2.5 h-2.5 text-rose-400" />}
          </span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar-light scroll-smooth">
        {/* TAB 1: THEORY */}
        {activeTab === 'theory' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Core Concept & Enterprise Principles</span>
              </span>
              <span className="text-[10px] text-slate-500 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-semibold border border-emerald-200/60">
                Recommended Reading
              </span>
            </div>

            <div className="text-slate-700 bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200/80 space-y-3">
              <MarkdownView content={lab.theoryContent || lab.conceptExplanation} size="sm" />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('exercise')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <span>Start Assignment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: EXERCISE */}
        {activeTab === 'exercise' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Scenario */}
            <div className="space-y-1.5 text-sm text-slate-600 leading-6">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Business Scenario:</span>
              </span>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-slate-700">
                <MarkdownView content={lab.scenario} size="sm" />
              </div>
            </div>

            {/* Task Goal */}
            <div className="p-4 bg-emerald-50/80 rounded-xl text-sm text-emerald-950 leading-6 border border-emerald-200/70 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Goal & Deliverables:</span>
              </div>
              <MarkdownView content={lab.taskGoal} size="sm" />
            </div>

            {/* Sample Input Data */}
            {tutorialData && (
              <div data-tour="tour-data" className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Control Data:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (lab.sampleInputContext) onCopySampleData();
                      else void navigator.clipboard.writeText(tutorialData);
                    }}
                    className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    {isDataCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isDataCopied ? 'Copied' : 'Copy Data'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800 custom-scrollbar-dark leading-relaxed">
                  {tutorialData}
                </pre>
              </div>
            )}

            {/* Rubrics */}
            {lab.rubricCriteria && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                  Grading Rubric:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600">
                  {Object.entries(lab.rubricCriteria).map(([key, val]) => (
                    <div key={key} className="flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HINTS */}
        {activeTab === 'hints' && (
          <div className="space-y-4 animate-fadeIn">
            {!hasViewedHints ? (
              <div className="p-6 bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl text-center space-y-3.5">
                <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-700 shadow-xs">
                  <Lock className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-950">
                    Reasoning Hints are Locked
                  </h4>
                  <p className="text-xs text-amber-900/90 max-w-xs mx-auto leading-relaxed">
                    We encourage analyzing the scenario independently first. Unlocking hints is recorded for learning analytics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestViewHints}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Unlock Lesson Hints</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-amber-100">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span>Reasoning Hints & Guidance</span>
                  </span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Unlocked
                  </span>
                </div>

                <div className="space-y-2">
                  {lab.hints && lab.hints.length > 0 ? (
                    lab.hints.map((hint, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-amber-950 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <MarkdownView content={hint} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No supplemental hints for this lesson.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SOLUTION */}
        {activeTab === 'solution' && (
          <div className="space-y-4 animate-fadeIn">
            {!hasViewedSolution ? (
              <div className="p-6 bg-rose-50/70 border-2 border-dashed border-rose-300 rounded-2xl text-center space-y-3.5">
                <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-700 shadow-xs">
                  <KeyRound className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-rose-950">
                    Reference Solution is Locked
                  </h4>
                  <p className="text-xs text-rose-900/90 max-w-xs mx-auto leading-relaxed">
                    This will mark <strong>"Solution Viewed"</strong> in your learning profile. Please attempt at least one prompt run before unlocking!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestViewSolution}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Confirm & Unlock Solution</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-rose-100">
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-rose-600" />
                    <span>Detailed Solution & Reference Prompt</span>
                  </span>
                  <span className="text-[10px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                    Solution Viewed
                  </span>
                </div>

                {/* Reference Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Reference Prompt:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopySolution}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Copy full reference prompt"
                      >
                        {isSolutionCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isSolutionCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-3 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-xl border border-slate-800 whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar-dark leading-relaxed">
                    {lab.improvedPrompt}
                  </pre>
                </div>

                {/* Step-by-step breakdown */}
                {lab.solutionSteps && lab.solutionSteps.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      Step-by-step Breakdown:
                    </span>

                    <div className="space-y-2.5">
                      {lab.solutionSteps.map((step) => (
                        <div 
                          key={step.stepNumber}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs text-slate-700"
                        >
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-mono shrink-0">
                              #{step.stepNumber}
                            </span>
                            <span>{step.title}</span>
                          </div>

                          <p className="text-slate-600 leading-relaxed text-[11px] pl-7">
                            {step.explanation}
                          </p>

                          {step.snippet && (
                            <div className="ml-7 p-2 bg-white rounded-lg border border-slate-200 font-mono text-[10px] text-slate-800 whitespace-pre-wrap">
                              {step.snippet}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comparison highlights */}
                {lab.comparisonHighlights && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5 text-xs text-emerald-950">
                    <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-emerald-900">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Why does this prompt succeed?</span>
                    </span>
                    <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                      {lab.comparisonHighlights.whyBetter}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
