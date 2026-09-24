import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitCompare, 
  Sparkles, 
  BookmarkPlus, 
  ChevronRight, 
  Lightbulb, 
  CheckCircle2, 
  FileCheck, 
  Tag 
} from 'lucide-react';
import { LabStep, PromptVersion, BusinessEvaluation } from '../../types';
import { 
  detectPromptComponents, 
  evaluateBusinessMetrics,
  generateLearningInsight 
} from '../../services/businessEvaluationService';
import { MarkdownView } from './MarkdownView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lab: LabStep;
  versions: PromptVersion[];
  initialBeforeIndex?: number;
  initialAfterIndex?: number;
  onSavePromptToLibrary?: (version: PromptVersion) => void;
}

/**
 * Side-by-side Compare Mode tailored for business users:
 * - Independent scrolling columns for Before vs After
 * - Responsive layout (stacked on mobile)
 * - 3 structured sections:
 *    A. Prompt Comparison (highlighting 6 core elements: Role, Context, Task, Constraint, Format, Example)
 *    B. AI Output Comparison (rendered Markdown tables and lists)
 *    C. Learning Insights & 5-factor Business Self-check
 */
export const ABCompareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lab,
  versions,
  initialBeforeIndex,
  initialAfterIndex,
  onSavePromptToLibrary,
}) => {
  const defaultBefore = initialBeforeIndex !== undefined && versions[initialBeforeIndex]
    ? initialBeforeIndex
    : Math.max(0, versions.length - 2);
  const defaultAfter = initialAfterIndex !== undefined && versions[initialAfterIndex]
    ? initialAfterIndex
    : Math.max(0, versions.length - 1);

  const [beforeIdx, setBeforeIdx] = useState<number>(defaultBefore);
  const [afterIdx, setAfterIdx] = useState<number>(defaultAfter);

  const [showSelfCheck, setShowSelfCheck] = useState<boolean>(false);

  useEffect(() => {
    if (versions.length >= 2) {
      setBeforeIdx(Math.max(0, versions.length - 2));
      setAfterIdx(Math.max(0, versions.length - 1));
    }
  }, [versions.length]);

  const beforeVer = versions[beforeIdx] || {
    id: 'v-before-mock',
    versionNumber: 1,
    labId: lab.id,
    promptText: lab.baselinePrompt,
    output: lab.simulatedBaselineOutput,
    techniqueUsed: 'Initial draft prompt',
    detectedChanges: detectPromptComponents(lab.baselinePrompt),
    timestamp: 'Initial',
    businessEvaluation: evaluateBusinessMetrics(lab.baselinePrompt, lab.simulatedBaselineOutput, lab.sampleInputContext),
  };

  const afterVer = versions[afterIdx] || {
    id: 'v-after-mock',
    versionNumber: 2,
    labId: lab.id,
    promptText: lab.improvedPrompt,
    output: lab.simulatedImprovedOutput,
    techniqueUsed: 'Optimized prompt',
    detectedChanges: detectPromptComponents(lab.improvedPrompt),
    timestamp: 'Latest',
    businessEvaluation: evaluateBusinessMetrics(lab.improvedPrompt, lab.simulatedImprovedOutput, lab.sampleInputContext),
  };

  const [selfCheck, setSelfCheck] = useState<BusinessEvaluation>(() => afterVer.businessEvaluation);

  useEffect(() => {
    setSelfCheck(afterVer.businessEvaluation);
  }, [afterIdx, afterVer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bComp = detectPromptComponents(beforeVer.promptText);
  const aComp = detectPromptComponents(afterVer.promptText);

  const promptComponents = [
    {
      key: 'Role',
      label: 'Expert Persona (Role)',
      desc: 'Assigns specialized professional authority to AI',
      before: bComp.hasRole,
      after: aComp.hasRole,
    },
    {
      key: 'Context',
      label: 'Case Background (Context)',
      desc: 'Operational context, customer or dossier records',
      before: bComp.hasContext,
      after: aComp.hasContext,
    },
    {
      key: 'Task',
      label: 'Explicit Assignment (Task)',
      desc: 'Defines the exact action and deliverables',
      before: bComp.hasTask,
      after: aComp.hasTask,
    },
    {
      key: 'Constraint',
      label: 'Safety Guardrails (Constraint)',
      desc: 'Risk controls, limits, and negative rules',
      before: bComp.hasConstraint,
      after: aComp.hasConstraint,
    },
    {
      key: 'Format',
      label: 'Output Layout (Output Format)',
      desc: 'Markdown table, JSON, or structured list requirements',
      before: bComp.hasFormat,
      after: aComp.hasFormat,
    },
    {
      key: 'Example',
      label: 'Demonstrations / Grounding (Example / Evidence)',
      desc: 'Few-shot samples or referenced source material',
      before: bComp.hasExample || bComp.hasGrounding,
      after: aComp.hasExample || aComp.hasGrounding,
    },
  ];

  const learningInsight = generateLearningInsight(
    beforeVer.promptText,
    afterVer.promptText,
    beforeVer.output,
    afterVer.output,
    lab.comparisonHighlights
  );

  const businessCriteria = [
    {
      key: 'formatAdherence',
      title: 'Format Adherence',
      desc: 'Does the output conform to the requested Markdown table or structured layout?',
      checked: selfCheck.formatAdherence,
    },
    {
      key: 'completeness',
      title: 'Completeness',
      desc: 'Are all essential business dimensions and questions addressed?',
      checked: selfCheck.completeness,
    },
    {
      key: 'actionability',
      title: 'Actionability',
      desc: 'Can business specialists immediately use or act upon these recommendations?',
      checked: selfCheck.actionability,
    },
    {
      key: 'groundedness',
      title: 'Groundedness',
      desc: 'Are facts and figures anchored strictly in the provided reference dossier?',
      checked: selfCheck.groundedness,
    },
    {
      key: 'toneFit',
      title: 'Tone & Style',
      desc: 'Is the tone objective, professional, and compliant with enterprise standards?',
      checked: selfCheck.toneFit,
    },
  ];

  const totalPassed = Object.values(selfCheck).filter(val => val === true).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden">
        
        {/* =================================================================== */}
        {/* HEADER MODAL                                                        */}
        {/* =================================================================== */}
        <div data-tour="tour-compare-demo" className="bg-slate-900 text-white px-5 sm:px-7 py-3.5 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base tracking-tight">
                  Progress Comparison (Compare Mode)
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Side-by-Side View
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lab.title} · Controlled reference scenario across attempts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Version Selector if > 2 versions */}
            {versions.length > 2 && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400 text-[11px]">Previous:</span>
                <select
                  value={beforeIdx}
                  onChange={(e) => setBeforeIdx(Number(e.target.value))}
                  className="bg-slate-900 text-slate-200 rounded px-1.5 py-0.5 font-semibold text-xs border border-slate-700 focus:outline-none"
                >
                  {versions.map((v, i) => (
                    <option key={v.id || i} value={i}>
                      Attempt {v.versionNumber}
                    </option>
                  ))}
                </select>

                <ChevronRight className="w-3 h-3 text-slate-500" />

                <span className="text-emerald-400 text-[11px] font-semibold">Current:</span>
                <select
                  value={afterIdx}
                  onChange={(e) => setAfterIdx(Number(e.target.value))}
                  className="bg-slate-900 text-emerald-300 rounded px-1.5 py-0.5 font-bold text-xs border border-emerald-500/50 focus:outline-none"
                >
                  {versions.map((v, i) => (
                    <option key={v.id || i} value={i}>
                      Attempt {v.versionNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close comparison window (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MAIN SCROLLABLE CONTENT                                             */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ================================================================= */}
          {/* SECTION A: PROMPT COMPARISON                                      */}
          {/* ================================================================= */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                  A
                </span>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                  Prompt Comparison (Before vs After)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Identifies 6 structural components: Role, Context, Task, Constraint, Format, Example
              </span>
            </div>

            {/* 6 Structural Component Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {promptComponents.map((item) => {
                const isNewlyAdded = !item.before && item.after;
                const isAlreadyPresent = item.before && item.after;

                return (
                  <div
                    key={item.key}
                    className={`p-2.5 rounded-xl border text-xs space-y-1 transition ${
                      isNewlyAdded
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                        : isAlreadyPresent
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-white border-dashed border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] block truncate" title={item.label}>
                        {item.key}
                      </span>
                      {isNewlyAdded ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-600 text-white whitespace-nowrap">
                          + Added
                        </span>
                      ) : isAlreadyPresent ? (
                        <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap">
                          ✓ Present
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 whitespace-nowrap">
                          Missing
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight truncate" title={item.desc}>
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 2 Side-by-Side Prompt Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              
              {/* Left Column: Before */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold text-slate-700">
                      Left Column: Attempt {beforeVer.versionNumber} (Initial Prompt)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {beforeVer.promptText.length} chars
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Initial prompt was minimal with fewer constraints:
                </p>

                <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3 max-h-48 overflow-y-auto">
                  <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {beforeVer.promptText}
                  </pre>
                </div>
              </div>

              {/* Right Column: After */}
              <div className="bg-emerald-50/40 rounded-2xl border border-emerald-300 p-4 space-y-2 flex flex-col shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">
                      Right Column: Attempt {afterVer.versionNumber} (Optimized Prompt)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono font-medium">
                    {afterVer.promptText.length} chars
                  </span>
                </div>

                {/* Newly Added Component Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {learningInsight.chips.map((chip, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300"
                    >
                      <Tag className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{chip}</span>
                    </span>
                  ))}
                </div>

                <div className="flex-1 bg-white rounded-xl border border-emerald-200 p-3 max-h-48 overflow-y-auto">
                  <pre className="font-mono text-xs text-slate-900 whitespace-pre-wrap leading-relaxed font-medium">
                    {afterVer.promptText}
                  </pre>
                </div>
              </div>

            </div>
          </section>

          {/* ================================================================= */}
          {/* SECTION B: AI OUTPUT COMPARISON                                   */}
          {/* ================================================================= */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                  B
                </span>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                  AI Output Comparison (Independent Scrolling & Markdown)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Independent scroll containers allow convenient side-by-side data verification
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              
              {/* Output Left (Before) */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Output: Attempt {beforeVer.versionNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                      Unstructured
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Scroll ↕
                  </span>
                </div>

                <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 max-h-[380px] overflow-y-auto leading-relaxed">
                  <MarkdownView content={beforeVer.output || 'No output recorded.'} />
                </div>
              </div>

              {/* Output Right (After) */}
              <div className="bg-emerald-50/40 rounded-2xl border border-emerald-300 p-4 space-y-2 flex flex-col shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">
                      Output: Attempt {afterVer.versionNumber} (Enhanced)
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded border border-emerald-300">
                      Structured Table
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                    Scroll ↕
                  </span>
                </div>

                <div className="flex-1 bg-white rounded-xl border border-emerald-200 p-4 max-h-[380px] overflow-y-auto leading-relaxed shadow-inner">
                  <MarkdownView content={afterVer.output} />
                </div>
              </div>

            </div>
          </section>

          {/* ================================================================= */}
          {/* SECTION C: LEARNING INSIGHTS & SELF-CHECK                         */}
          {/* ================================================================= */}
          <section className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                  C
                </span>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Learning Insights & Analysis</span>
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setShowSelfCheck(!showSelfCheck)}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition cursor-pointer"
              >
                <span>{showSelfCheck ? 'Collapse Business Standards' : 'View 5 Business Standards & Self-Check'}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showSelfCheck ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* 4 Core Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* 1. What changed in prompt */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">1</span>
                  <span>What changed in the prompt?</span>
                </div>
                <ul className="space-y-1 text-slate-600 pl-1">
                  {learningInsight.promptChanges.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1 leading-tight text-[11px]">
                      <span className="text-emerald-600 font-bold">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Output improvement */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">2</span>
                  <span>How did the output improve?</span>
                </div>
                <div className="space-y-1.5 text-[11px] leading-tight">
                  <div className="text-slate-500 line-through">
                    {learningInsight.outputImprovements.beforeDesc}
                  </div>
                  <div className="text-emerald-900 font-semibold flex items-start gap-1">
                    <span>➔</span>
                    <span>{learningInsight.outputImprovements.afterDesc}</span>
                  </div>
                </div>
              </div>

              {/* 3. Why better */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">3</span>
                  <span>Why is this more effective?</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {learningInsight.whyBetter}
                </p>
              </div>

              {/* 4. Takeaway */}
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Key Takeaway</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                  {learningInsight.takeaway}
                </p>
              </div>

            </div>

            {/* Expandable 5 Business Standards Checklist */}
            {showSelfCheck && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>5 Business Evaluation Standards (Quality Checklist)</span>
                  </h5>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    totalPassed >= 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {totalPassed} / 5 Criteria Met
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs overflow-hidden">
                  {businessCriteria.map((c) => (
                    <div key={c.key} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800">{c.title}</span>
                        <p className="text-[11px] text-slate-500">{c.desc}</p>
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 select-none flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={c.checked}
                          onChange={(e) => {
                            setSelfCheck(prev => ({
                              ...prev,
                              [c.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                        />
                        <span className={`text-xs font-semibold ${c.checked ? 'text-emerald-800' : 'text-slate-500'}`}>
                          {c.checked ? 'Passed' : 'Needs Work'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>

        {/* =================================================================== */}
        {/* FOOTER MODAL                                                        */}
        {/* =================================================================== */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Comparison complete: Attempt {afterVer.versionNumber} demonstrates clear structural and quality gains over Attempt {beforeVer.versionNumber}.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {onSavePromptToLibrary && (
              <button
                type="button"
                onClick={() => {
                  onSavePromptToLibrary(afterVer);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs transition shadow-2xs cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
                <span>Save Attempt {afterVer.versionNumber} to Prompt Library</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
            >
              Close Comparison
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
