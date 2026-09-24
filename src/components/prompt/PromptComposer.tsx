import React, { useState } from 'react';
import { 
  Play, 
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Eye, 
  Plus, 
  Copy, 
  Check, 
  X, 
  BookOpen,
  Sparkles,
  Info,
  Key,
  Zap
} from 'lucide-react';
import { LabStep, PromptVersion, ApiConfig } from '../../types';
import { AiEvaluationResult } from '../../types/database';
import { PromptStructurePanel } from './PromptStructurePanel';
import { PromptVersionBar } from '../common/PromptVersionBar';
import { 
  PromptAnalysis, 
  PromptSpan, 
  PromptComponentType 
} from '../../services/promptStructureAnalyzer';
import { 
  getTabnineContextualSuggestion, 
  TabnineSuggestion,
  detectPiiEntities,
  sanitizePii
} from '../../services/labComplianceService';
import { InlineDiffSuggestionCard, DiffSuggestionItem } from './InlineDiffSuggestionCard';

interface PromptComposerProps {
  lab: LabStep;
  promptText: string;
  setPromptText: (text: string) => void;
  systemText: string;
  setSystemText: (text: string) => void;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
  isRunning: boolean;
  runStatus: 'idle' | 'generating' | 'evaluating' | 'error';
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  onRun: () => void;
  versions: PromptVersion[];
  selectedVersionNumber: number;
  onSelectVersion: (vNum: number) => void;
  onRestorePrompt: (restored: string) => void;
  onOpenCompare: () => void;
  onSaveToLibrary: (ver: PromptVersion) => void;
  promptAnalysis: PromptAnalysis;
  selectedSpan: PromptSpan | null;
  onSelectComponent: (type: PromptComponentType) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  apiConfig?: ApiConfig;
  onOpenApiModal?: () => void;
  aiEvaluation?: AiEvaluationResult | null;
  lastEvaluatedPromptText?: string | null;
  onManualPromptChange?: (text: string) => void;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  lab,
  promptText,
  setPromptText,
  systemText,
  setSystemText,
  showAdvancedSettings,
  setShowAdvancedSettings,
  isRunning,
  runStatus,
  errorMessage,
  setErrorMessage,
  onRun,
  versions,
  selectedVersionNumber,
  onSelectVersion,
  onRestorePrompt,
  onOpenCompare,
  onSaveToLibrary,
  promptAnalysis,
  selectedSpan,
  onSelectComponent,
  textareaRef,
  apiConfig,
  onOpenApiModal,
  aiEvaluation,
  lastEvaluatedPromptText,
  onManualPromptChange,
}) => {
  const [showSampleModal, setShowSampleModal] = useState<boolean>(false);
  const [isSampleCopied, setIsSampleCopied] = useState<boolean>(false);

  // Tabnine-style contextual suggestion
  const [tabnineSuggestion, setTabnineSuggestion] = useState<TabnineSuggestion | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState<boolean>(false);

  // Manage diff suggestion state post LLM evaluation
  const [dismissedDiffIds, setDismissedDiffIds] = useState<string[]>([]);
  const [activeHighlightedDiffId, setActiveHighlightedDiffId] = useState<string | null>(null);

  // Refresh suggestions when a new evaluation arrives
  React.useEffect(() => {
    setDismissedDiffIds([]);
    setActiveHighlightedDiffId(null);
  }, [aiEvaluation]);

  // Diff & suggestions ONLY apply after prompt has been evaluated by the AI Judge
  const isCurrentPromptEvaluated = Boolean(
    aiEvaluation &&
    lastEvaluatedPromptText &&
    promptText === lastEvaluatedPromptText &&
    runStatus === 'idle'
  );

  const evaluatedDiffItems: DiffSuggestionItem[] = React.useMemo(() => {
    if (!isCurrentPromptEvaluated || !aiEvaluation) return [];

    const items: DiffSuggestionItem[] = [];

    // 1. Scan sensitive PII in prompt
    const piiCheck = detectPiiEntities(promptText);
    if (piiCheck.hasPii) {
      const lines = promptText.split('\n');
      piiCheck.piiItems.forEach((item, idx) => {
        let replacement = '{{VARIABLE}}';
        if (item.type === 'cccd') replacement = '{{SSN_OR_ID}}';
        else if (item.type === 'phone') replacement = '{{PHONE_NUMBER}}';
        else if (item.type === 'bank_account') replacement = '{{BANK_ACCOUNT}}';
        else if (item.type === 'contract_id') replacement = '{{CONTRACT_ID}}';
        else if (item.type === 'person_name') {
          if (item.value.includes('Tèo')) replacement = '{{CUSTOMER_NAME}}';
          else if (item.value.includes('Mận')) replacement = '{{SPOUSE_NAME}}';
          else replacement = '{{PERSON_NAME}}';
        } else if (item.type === 'serial_id') {
          replacement = '{{DOCUMENT_SERIAL}}';
        }

        const fullOrig = lines.find(l => l.includes(item.value)) || item.value;
        const fullRepl = fullOrig.replace(item.value, replacement);

        items.push({
          id: `diff-pii-${idx}-${item.value}`,
          originalText: item.value,
          replacementText: replacement,
          label: `PII Redactor: Sanitize ${item.label}`,
          fullOriginalLine: fullOrig.trim(),
          fullReplacementLine: fullRepl.trim()
        });
      });
    }

    // 2. Scan scoring criteria from AI Judge if < 10/10
    const scores = aiEvaluation.scores;
    if (scores) {
      const promptLower = promptText.toLowerCase();

      // Task completion
      if (scores.taskCompletion < 2 && !promptLower.includes('task') && !promptLower.includes('nhiệm vụ')) {
        const repl = `TASK: ${lab.taskGoal || `Execute requirements for lesson ${lab.title}.`}`;
        items.push({
          id: 'diff-task',
          originalText: '(Task objective not explicitly defined)',
          replacementText: repl,
          label: 'Structure: Add task objective',
          fullOriginalLine: '(No explicit task defined)',
          fullReplacementLine: repl,
        });
      }

      // Format adherence
      if (scores.formatAdherence < 2 && !promptLower.includes('format') && !promptLower.includes('table') && !promptLower.includes('định dạng') && !promptLower.includes('bảng') && !promptText.includes('|')) {
        const repl = `OUTPUT FORMAT: ${lab.expectedOutputFormat || 'Present output concisely, clearly, and adhering to required structure.'}`;
        items.push({
          id: 'diff-format',
          originalText: '(Target output format not specified)',
          replacementText: repl,
          label: 'Structure: Add markdown format specification',
          fullOriginalLine: '(No output format specified)',
          fullReplacementLine: repl
        });
      }

      // Constraint compliance
      if (scores.constraintCompliance < 2 && !promptLower.includes('constraint') && !promptLower.includes('ràng buộc') && !promptLower.includes('tuyệt đối')) {
        const repl = `CONSTRAINTS: ${lab.systemInstruction || 'Only rely on provided context; do not extrapolate or hallucinate ungrounded facts.'}`;
        items.push({
          id: 'diff-constraint',
          originalText: '(Missing safety constraints and guardrails)',
          replacementText: repl,
          label: 'Structure: Add safety constraints',
          fullOriginalLine: '(No safety constraints)',
          fullReplacementLine: repl
        });
      }

      // Groundedness
      if (scores.groundedness < 2 && !promptLower.includes('context') && !promptLower.includes('bối cảnh') && !promptLower.includes('căn cứ')) {
        const repl = `CONTEXT / INPUT DATA: ${lab.sampleInputContext || lab.scenario || 'Specify source data required for this task.'}`;
        items.push({
          id: 'diff-context',
          originalText: '(Context or input data not grounded)',
          replacementText: repl,
          label: 'Structure: Add context / input data',
          fullOriginalLine: '(No context or input data)',
          fullReplacementLine: repl
        });
      }

      // Business usability
      if (scores.businessUsability < 2 && !promptLower.includes('role') && !promptLower.includes('vai trò') && !promptLower.includes('bạn là')) {
        const repl = `ROLE: You are an expert specialist tailored for "${lab.title}".`;
        items.push({
          id: 'diff-role',
          originalText: '(Professional role not specified)',
          replacementText: repl,
          label: 'Structure: Add expert persona role',
          fullOriginalLine: '(No professional role)',
          fullReplacementLine: repl
        });
      }
    }

    return items;
  }, [isCurrentPromptEvaluated, aiEvaluation, promptText, lab]);

  // Filter out dismissed items
  const activeDiffItems = evaluatedDiffItems.filter(item => !dismissedDiffIds.includes(item.id));

  // 1. Navigate to & highlight diff item in textarea
  const handleNavigateToDiffItem = (item: DiffSuggestionItem) => {
    setActiveHighlightedDiffId(item.id);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const target = item.originalText;
    const index = promptText.indexOf(target);

    if (index !== -1) {
      const textBefore = promptText.substring(0, index);
      const lineNumber = textBefore.split('\n').length;
      const lineHeight = 22;
      textarea.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight);

      textarea.focus();
      textarea.setSelectionRange(index, index + target.length);
    } else {
      textarea.focus();
      textarea.scrollTop = textarea.scrollHeight;
      textarea.setSelectionRange(promptText.length, promptText.length);
    }

    textarea.classList.remove('ring-4', 'ring-amber-400', 'border-amber-400');
    void textarea.offsetWidth;
    textarea.classList.add('ring-4', 'ring-amber-400', 'border-amber-400');

    setTimeout(() => {
      textarea.classList.remove('ring-4', 'ring-amber-400', 'border-amber-400');
    }, 1600);
  };

  // 2. Accept single diff item
  const handleAcceptSingleDiffItem = (item: DiffSuggestionItem) => {
    const textarea = textareaRef.current;
    let newPrompt = promptText;
    let newCursorPos = -1;

    const index = promptText.indexOf(item.originalText);
    if (index !== -1) {
      newPrompt = promptText.substring(0, index) + item.replacementText + promptText.substring(index + item.originalText.length);
      newCursorPos = index + item.replacementText.length;
    } else {
      newPrompt = promptText.trim() ? `${promptText.trim()}\n\n${item.replacementText}` : item.replacementText;
      newCursorPos = newPrompt.length;
    }

    setPromptText(newPrompt);
    setDismissedDiffIds(prev => [...prev, item.id]);
    if (activeHighlightedDiffId === item.id) {
      setActiveHighlightedDiffId(null);
    }

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        if (newCursorPos !== -1) {
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
        textarea.classList.add('ring-4', 'ring-emerald-500', 'border-emerald-500');
        setTimeout(() => {
          textarea.classList.remove('ring-4', 'ring-emerald-500', 'border-emerald-500');
        }, 1200);
      }
    }, 40);
  };

  // 3. Reject single diff item
  const handleRejectSingleDiffItem = (item: DiffSuggestionItem) => {
    setDismissedDiffIds(prev => [...prev, item.id]);
    if (activeHighlightedDiffId === item.id) {
      setActiveHighlightedDiffId(null);
    }
  };

  // 4. Accept all diff items
  const handleAcceptAllDiffItems = () => {
    let updatedText = promptText;

    for (const item of activeDiffItems) {
      const idx = updatedText.indexOf(item.originalText);
      if (idx !== -1) {
        updatedText = updatedText.substring(0, idx) + item.replacementText + updatedText.substring(idx + item.originalText.length);
      } else if (!item.originalText.startsWith('(')) {
        updatedText = updatedText.replace(item.originalText, item.replacementText);
      } else {
        updatedText = updatedText.trim() ? `${updatedText.trim()}\n\n${item.replacementText}` : item.replacementText;
      }
    }

    const piiCheck = detectPiiEntities(updatedText);
    if (piiCheck.hasPii) {
      updatedText = sanitizePii(updatedText);
    }

    setPromptText(updatedText);
    setDismissedDiffIds(prev => [...prev, ...activeDiffItems.map(i => i.id)]);
    setActiveHighlightedDiffId(null);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.classList.add('ring-4', 'ring-emerald-500', 'border-emerald-500');
      setTimeout(() => {
        textarea.classList.remove('ring-4', 'ring-emerald-500', 'border-emerald-500');
      }, 1500);
    }
  };

  // 5. Reject all diff items
  const handleRejectAllDiffItems = () => {
    setDismissedDiffIds(prev => [...prev, ...activeDiffItems.map(i => i.id)]);
    setActiveHighlightedDiffId(null);
  };

  const handleCheckSuggestion = (text: string, cursorPos: number) => {
    if (suggestionDismissed || !isCurrentPromptEvaluated) {
      setTabnineSuggestion(null);
      return;
    }
    const suggestion = getTabnineContextualSuggestion(text, cursorPos, lab);
    setTabnineSuggestion(suggestion);
  };

  const handleAcceptTabnine = () => {
    if (!tabnineSuggestion || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? promptText.length;
    const end = textarea.selectionEnd ?? promptText.length;

    const newText = promptText.substring(0, start) + tabnineSuggestion.suggestionText + promptText.substring(end);
    setPromptText(newText);
    const newPos = start + tabnineSuggestion.suggestionText.length;
    setTabnineSuggestion(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 30);
  };

  // Insert scaffold tag into prompt
  const insertScaffoldTag = (label: string) => {
    const textarea = textareaRef.current;
    const tagToInsert = `\n${label}: `;

    if (!promptText.trim()) {
      const initial = `${label}: `;
      setPromptText(initial);
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(initial.length, initial.length);
        }
      }, 50);
      return;
    }

    if (textarea) {
      const start = textarea.selectionStart ?? promptText.length;
      const end = textarea.selectionEnd ?? promptText.length;
      const newText = promptText.substring(0, start) + tagToInsert + promptText.substring(end);
      setPromptText(newText);
      const newCursorPos = start + tagToInsert.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 50);
    } else {
      setPromptText(promptText + tagToInsert);
    }
  };

  // Insert full 5-element skeleton
  const insertFullSkeleton = () => {
    const skeleton = `Role: \nContext: \nTask: \nConstraints: \nOutput Format: `;
    setPromptText(skeleton);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(6, 6); // placed after "Role: "
      }
    }, 50);
  };

  const handleCopySample = () => {
    if (lab.improvedPrompt) {
      navigator.clipboard.writeText(lab.improvedPrompt);
      setIsSampleCopied(true);
      setTimeout(() => setIsSampleCopied(false), 1500);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4" data-tour="tour-prompt">
      {/* 1. Header: Title & Assistance levels */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Prompt Composer
          </h3>
          <span className="text-[11px] text-slate-500 font-normal hidden sm:inline">
            (Draft manually to build intuition)
          </span>

          {/* AI Engine Status Badge & Modal Trigger */}
          {onOpenApiModal && (
            <button
              type="button"
              onClick={onOpenApiModal}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer border shadow-2xs ${
                apiConfig?.mode === 'simulated'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
              }`}
              title="Configure API key, switch model, or inspect provider settings"
            >
              {apiConfig?.mode === 'simulated' ? (
                <>
                  <Zap className="w-3 h-3 text-emerald-600" />
                  <span>Simulated</span>
                </>
              ) : (
                <>
                  <Key className="w-3 h-3 text-indigo-600" />
                  <span>Live: {apiConfig?.model || 'gemini-2.5-flash'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Reference prompt modal trigger */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowSampleModal(true)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 transition cursor-pointer"
            title="View reference prompt (will not overwrite your draft)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Reference</span>
          </button>
        </div>
      </div>

      {/* 2. Version Navigation Bar */}
      {versions.length > 0 && (
        <PromptVersionBar
          versions={versions}
          selectedVersionNumber={selectedVersionNumber}
          onSelectVersion={onSelectVersion}
          onRestorePrompt={onRestorePrompt}
          onOpenCompare={onOpenCompare}
          onSaveToLibrary={onSaveToLibrary}
          currentPromptText={promptText}
        />
      )}

      {/* 3. Scaffold / Structure Panel */}
      <PromptStructurePanel
        analysis={promptAnalysis}
        selectedSpan={selectedSpan}
        onSelectComponent={onSelectComponent}
        onInsertTag={insertScaffoldTag}
        onInsertSkeleton={insertFullSkeleton}
        focusComponents={lab.focusComponents}
      />

      {/* 4. Textarea Input Field */}
      <div className="relative rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-50/50 transition overflow-hidden">
        <textarea
          ref={textareaRef}
          value={promptText}
          rows={7}
          onChange={(e) => {
            const val = e.target.value;
            setPromptText(val);
            if (onManualPromptChange) {
              onManualPromptChange(val);
            }
            if (isCurrentPromptEvaluated) {
              handleCheckSuggestion(val, e.target.selectionStart);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && tabnineSuggestion && isCurrentPromptEvaluated && !suggestionDismissed) {
              e.preventDefault();
              handleAcceptTabnine();
            } else if (e.key === 'Escape' && tabnineSuggestion) {
              setTabnineSuggestion(null);
              setSuggestionDismissed(true);
            }
          }}
          placeholder={lab.promptPlaceholder || "Enter your prompt here... (e.g., You are an expert business analyst...)"}
          className="w-full p-4 text-xs sm:text-sm font-mono text-slate-900 bg-transparent focus:outline-none leading-relaxed transition resize-y custom-scrollbar-light"
        />

        {/* Inline Suggestion (Tabnine style) */}
        {isCurrentPromptEvaluated && tabnineSuggestion && !suggestionDismissed && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white text-xs border-t border-emerald-500/40 animate-fadeIn">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
              <span className="font-bold text-emerald-400 shrink-0 text-[11px]">
                Inline suggestion (Tabnine style):
              </span>
              <span className="text-slate-200 font-mono text-[11px] truncate">
                "{tabnineSuggestion.suggestionText.trim()}"
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAcceptTabnine}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                title="Press Tab to accept"
              >
                <span>Insert</span>
                <kbd className="bg-emerald-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-mono shadow-2xs">Tab ⇥</kbd>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTabnineSuggestion(null);
                  setSuggestionDismissed(true);
                }}
                className="text-slate-400 hover:text-white px-1.5 py-0.5 text-xs transition cursor-pointer"
                title="Dismiss (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Inline Diff Suggestion Card */}
        {isCurrentPromptEvaluated && activeDiffItems.length > 0 && (
          <div className="border-t border-slate-700/80 p-2.5 bg-[#12121a]">
            <InlineDiffSuggestionCard
              items={activeDiffItems}
              title="Optimal suggestions based on AI Judge rubric evaluation"
              evaluationScore={aiEvaluation?.total}
              activeItemId={activeHighlightedDiffId}
              onItemClick={handleNavigateToDiffItem}
              onAcceptItem={handleAcceptSingleDiffItem}
              onRejectItem={handleRejectSingleDiffItem}
              onAcceptAll={handleAcceptAllDiffItems}
              onRejectAll={handleRejectAllDiffItems}
            />
          </div>
        )}
      </div>

      {/* 5. Advanced Settings (System Instruction) */}
      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Advanced Settings (System Instruction)</span>
          {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvancedSettings && (
          <div className="mt-2.5 p-3 bg-slate-50 rounded-xl space-y-1.5 animate-fadeIn border border-slate-200">
            <label className="text-xs font-semibold text-slate-700 block">
              System Instruction (Background steering for AI):
            </label>
            <input
              type="text"
              value={systemText}
              onChange={(e) => setSystemText(e.target.value)}
              placeholder="e.g. You are an expert specialist for this task..."
              className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
            />
          </div>
        )}
      </div>

      {/* 6. Error Message Display */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 7. Primary CTA: Run Prompt */}
      <button
        type="button"
        onClick={onRun}
        disabled={isRunning || !promptText.trim()}
        data-tour="tour-run"
        className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
        <span>
          {runStatus === 'generating' 
            ? 'Generating response...' 
            : runStatus === 'evaluating' 
            ? 'AI is evaluating prompt...' 
            : isRunning 
            ? 'Processing...' 
            : 'Run Prompt'}
        </span>
      </button>

      {/* 8. Reference Prompt Modal */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Reference Prompt — {lab.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 flex items-start gap-2 border border-amber-200/70">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>This is one high-performing approach, not the only answer.</strong> Compare it against your own drafted prompt structure. Reference does not overwrite your workspace.
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Reference Prompt Content:</span>
                <button
                  type="button"
                  onClick={handleCopySample}
                  disabled={!lab.improvedPrompt.trim()}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 transition"
                >
                  {isSampleCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isSampleCopied ? 'Copied' : 'Copy Reference'}</span>
                </button>
              </div>

              {lab.improvedPrompt.trim() ? (
                <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-slate-800">{lab.improvedPrompt}</pre>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">No reference prompt available for this lesson.</p>
              )}
            </div>

            {lab.expectedOutputFormat && (
              <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                <span className="font-semibold text-slate-700">Expected Format:</span> {lab.expectedOutputFormat}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
