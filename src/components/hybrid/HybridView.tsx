import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  Copy, 
  Check, 
  GitCompare, 
  Sparkles, 
  Award, 
  ArrowRight,
  Settings2,
  RotateCcw,
  BookmarkPlus,
  Compass,
  AlertCircle,
  ThumbsUp,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';
import { LabStep, ApiConfig, PromptRun, PromptVersion } from '../../types';
import { AiEvaluationResult } from '../../types/database';
import { executePromptStream, evaluatePromptLive, mapAiEvaluationToRubricAudit, evaluatePromptRubric } from '../../services/llmService';
import { detectPromptComponents, evaluateBusinessMetrics } from '../../services/businessEvaluationService';
import { dbService } from '../../services/dbService';
import { InlineCompareCard } from '../common/InlineCompareCard';
import { PromptStructurePanel } from '../prompt/PromptStructurePanel';
import { PromptComposer, PromptSupportMode } from '../prompt/PromptComposer';
import { LessonBriefPanel } from '../lesson/LessonBriefPanel';
import { 
  analyzePromptStructure, 
  PromptAnalysis, 
  PromptSpan, 
  PromptComponentType 
} from '../../services/promptStructureAnalyzer';
import { PromptVersionBar } from '../common/PromptVersionBar';
import { ABCompareModal } from '../common/ABCompareModal';
import { SavePromptModal } from '../common/SavePromptModal';
import { MarkdownView } from '../common/MarkdownView';

interface Props {
  labs: LabStep[];
  apiConfig: ApiConfig;
  onRecordRun: (run: PromptRun) => void;
  onOpenCompare: (lab: LabStep) => void;
  onActiveContextChange?: (lab: LabStep, prompt: string, runCount: number) => void;
  onOpenTutorial?: () => void;
  initialLabId?: string;
  onSelectLab?: (labId: string) => void;
  currentLearnerId?: string;
  currentClassId?: string;
}

export const HybridView: React.FC<Props> = ({
  labs,
  apiConfig,
  onRecordRun,
  onOpenCompare,
  onActiveContextChange,
  onOpenTutorial,
  initialLabId,
  onSelectLab,
  currentLearnerId,
  currentClassId,
}) => {
  // Chỉ số bài lab hiện tại (0 -> labs.length - 1)
  const [currentLabIndex, setCurrentLabIndex] = useState<number>(() => {
    if (initialLabId) {
      const idx = labs.findIndex((l) => l.id === initialLabId);
      if (idx !== -1) return idx;
    }
    return 0;
  });
  const currentLab = labs[currentLabIndex] || labs[0];

  useEffect(() => {
    if (initialLabId) {
      const idx = labs.findIndex((l) => l.id === initialLabId);
      if (idx !== -1) {
        setCurrentLabIndex(idx);
      }
    }
  }, [initialLabId, labs]);

  // Tiến trình bước trong bài (1: Prompt ban đầu -> 2: Cải tiến cấu trúc -> 3: Hoàn thành)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Đếm số lần chạy theo từng bài lab (chỉ hiển thị đối chiếu Trước/Sau khi user đã chạy ít nhất 2 lần)
  const [runCountsByLab, setRunCountsByLab] = useState<Record<string, number>>({});
  const currentLabRunCount = runCountsByLab[currentLab.id] || 0;

  // Prompt always starts empty: learners author the response instead of editing a prefilled example.
  const [promptText, setPromptText] = useState<string>('');
  const [supportMode, setSupportMode] = useState<PromptSupportMode>('structure');
  const [systemText, setSystemText] = useState<string>(currentLab.systemInstruction || 'Bạn là trợ lý AI chuyên nghiệp hỗ trợ cán bộ ngân hàng Agribank.');
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runStatus, setRunStatus] = useState<'idle' | 'generating' | 'evaluating' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiEvaluation, setAiEvaluation] = useState<AiEvaluationResult | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDataCopied, setIsDataCopied] = useState<boolean>(false);

  // Accordions (mặc định đóng theo đúng yêu cầu để giảm visual noise)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState<boolean>(false);

  // Kết quả sau khi chạy
  const [scoreResult, setScoreResult] = useState<ReturnType<typeof evaluatePromptRubric> | null>(null);
  const [metrics, setMetrics] = useState<{ tokens: number; latency: number; mode: string } | null>(null);

  // Quản lý các phiên bản câu lệnh (Prompt Versioning) theo từng lab
  const [versionsByLab, setVersionsByLab] = useState<Record<string, PromptVersion[]>>({});
  const currentLabVersions = versionsByLab[currentLab.id] || [];
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number>(0);
  const [isABModalOpen, setIsABModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [versionToSave, setVersionToSave] = useState<PromptVersion | null>(null);

  // Phân tích cấu trúc Prompt 7 thành phần & inline highlight
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [promptAnalysis, setPromptAnalysis] = useState<PromptAnalysis>(() => analyzePromptStructure(''));
  const [selectedSpan, setSelectedSpan] = useState<PromptSpan | null>(null);
  const [currentSpanIndexByType, setCurrentSpanIndexByType] = useState<Record<string, number>>({});

  // Debounce phân tích cấu trúc prompt (500ms) để không lag UI khi gõ và 0 LLM call
  useEffect(() => {
    const timer = setTimeout(() => {
      const analysis = analyzePromptStructure(promptText);
      setPromptAnalysis(analysis);
      if (selectedSpan) {
        const stillExists = analysis.components.find(c => c.type === selectedSpan.type && c.text === selectedSpan.text);
        if (!stillExists) {
          setSelectedSpan(null);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [promptText]);

  const handleSelectComponent = (type: PromptComponentType) => {
    const matchingSpans = promptAnalysis.components.filter(c => c.type === type);
    if (matchingSpans.length === 0) {
      setSelectedSpan(null);
      return;
    }

    // Nếu có nhiều span cùng type, lần lượt chuyển qua từng span khi click nhiều lần
    const lastIndex = currentSpanIndexByType[type] ?? -1;
    const nextIndex = (lastIndex + 1) % matchingSpans.length;
    setCurrentSpanIndexByType(prev => ({ ...prev, [type]: nextIndex }));

    const targetSpan = matchingSpans[nextIndex];
    setSelectedSpan(targetSpan);

    if (textareaRef.current) {
      textareaRef.current.focus();
      try {
        textareaRef.current.setSelectionRange(targetSpan.start, targetSpan.end);
      } catch (err) {
        console.error('Error selecting text range:', err);
      }
    }
  };

  const insertPromptBlock = (template: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? promptText.length;
    const end = textarea?.selectionEnd ?? promptText.length;
    const prefix = promptText.slice(0, start);
    const suffix = promptText.slice(end);
    const separator = prefix && !prefix.endsWith('\n') ? '\n' : '';
    const nextPrompt = `${prefix}${separator}${template}${suffix}`;
    const caret = prefix.length + separator.length + template.length;

    setPromptText(nextPrompt);
    setSelectedSpan(null);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(caret, caret);
    });
  };

  // Đồng bộ khi chuyển bài lab
  useEffect(() => {
    setPromptText('');
    setSupportMode('structure');
    setSystemText(currentLab.systemInstruction || 'Bạn là trợ lý AI chuyên nghiệp hỗ trợ cán bộ ngân hàng Agribank.');
    setOutput('');
    setScoreResult(null);
    setAiEvaluation(null);
    setErrorMessage(null);
    setMetrics(null);
    setCurrentStep(1);
    setSelectedVersionNumber(0);
    setShowAdvancedSettings(false);
    setShowTechDetails(false);
    setShowScoreBreakdown(false);
    setSelectedSpan(null);
    setCurrentSpanIndexByType({});
    setPromptAnalysis(analyzePromptStructure(''));
  }, [currentLabIndex]);

  // Tải lịch sử các lần chạy thật (Prompt Attempts) từ Supabase DB / LocalStore
  useEffect(() => {
    let isMounted = true;
    if (currentLearnerId && currentClassId) {
      dbService.getPromptAttempts(currentLearnerId, currentClassId, currentLab.id)
        .then((attempts) => {
          if (!isMounted || !attempts || attempts.length === 0) return;

          const mappedVersions: PromptVersion[] = attempts.map(a => ({
            id: a.id,
            versionNumber: a.attempt_number,
            labId: a.lesson_id,
            promptText: a.prompt_text,
            systemInstruction: systemText,
            output: a.ai_output,
            techniqueUsed: currentLab.badge,
            detectedChanges: detectPromptComponents(a.prompt_text),
            timestamp: a.created_at ? new Date(a.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
            businessEvaluation: evaluateBusinessMetrics(a.prompt_text, a.ai_output, currentLab.sampleInputContext),
            aiEvaluation: a.evaluation_json,
            tokenCount: Math.round(a.ai_output.length / 3.8),
            latencyMs: a.latency_ms
          }));

          setVersionsByLab(prev => ({
            ...prev,
            [currentLab.id]: mappedVersions
          }));

          setRunCountsByLab(prev => ({
            ...prev,
            [currentLab.id]: mappedVersions.length
          }));

          const latest = mappedVersions[mappedVersions.length - 1];
          if (latest) {
            setSelectedVersionNumber(latest.versionNumber);
            setOutput(latest.output);
            if (latest.aiEvaluation) {
              setAiEvaluation(latest.aiEvaluation);
              setScoreResult(mapAiEvaluationToRubricAudit(latest.aiEvaluation));
            }
          }
        })
        .catch(err => {
          console.warn('[HybridView] Lỗi tải prompt_attempts:', err);
        });
    }
    return () => { isMounted = false; };
  }, [currentLab.id, currentLearnerId, currentClassId]);

  // Cập nhật ngữ cảnh ra ngoài cho AI Coach
  useEffect(() => {
    if (onActiveContextChange) {
      onActiveContextChange(currentLab, promptText, currentLabRunCount);
    }
  }, [currentLab.id, promptText, currentLabRunCount]);

  const handleRun = async () => {
    if (!promptText.trim()) {
      setErrorMessage('Vui lòng nhập câu lệnh prompt trước khi nhấn Chạy.');
      return;
    }

    setIsRunning(true);
    setRunStatus('generating');
    setErrorMessage(null);
    setOutput('');

    // Tăng số lượt chạy của bài lab hiện tại
    setRunCountsByLab(prev => ({
      ...prev,
      [currentLab.id]: (prev[currentLab.id] || 0) + 1
    }));

    try {
      // 1. GỬI PROMPT THỰC TẾ ĐẾN MÁY CHỦ LLM (POST /api/generate)
      const result = await executePromptStream(
        promptText,
        systemText,
        currentLab,
        apiConfig,
        (chunk) => {
          setOutput(chunk);
        },
        currentClassId,
      );

      // Hiển thị ngay kết quả AI để học viên đọc được lập tức
      setOutput(result.output);
      setIsRunning(false);
      setMetrics({
        tokens: result.tokenCount,
        latency: result.latencyMs,
        mode: result.mode
      });

      // 2. GỌI AI EVALUATION ĐỘC LẬP THEO RUBRIC MVP (POST /api/evaluate)
      setRunStatus('evaluating');
      let evalResult: AiEvaluationResult;
      try {
        evalResult = await evaluatePromptLive({
          lessonId: currentLab.id,
          classId: currentClassId,
          scenario: currentLab.scenario,
          controlData: currentLab.sampleInputContext,
          taskRequirement: currentLab.taskGoal,
          lessonRubric: currentLab.rubricCriteria,
          learnerPrompt: promptText,
          generatedOutput: result.output
        });
      } catch (judgeErr: any) {
        console.warn('[HybridView] AI Judge failed:', judgeErr);
        throw new Error(`AI đã tạo kết quả nhưng chấm điểm thất bại: ${judgeErr.message || 'Vui lòng thử lại.'}`);
      }

      setAiEvaluation(evalResult);
      const evaluatedScore = mapAiEvaluationToRubricAudit(evalResult);
      setScoreResult(evaluatedScore);
      setRunStatus('idle');

      // Cập nhật bước tiến trình nếu đang ở bước 1
      if (currentStep === 1) {
        setCurrentStep(2);
      } else if (currentStep === 2 && evalResult.total >= 7) {
        setCurrentStep(3);
      }

      onRecordRun({
        id: `run-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        labId: currentLab.id,
        promptText,
        systemInstruction: systemText,
        output: result.output,
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
        mode: result.mode,
        versionTag: promptText.length > 250 ? 'improved' : 'baseline'
      });

      // 3. PERSIST ATTEMPT VÀO SUPABASE DATABASE (Bảng prompt_attempts)
      const labVers = versionsByLab[currentLab.id] || [];
      const newVerNum = labVers.length + 1;

      if (currentLearnerId && currentClassId) {
        await dbService.recordPromptAttempt({
            learner_id: currentLearnerId,
            class_id: currentClassId,
            lesson_id: currentLab.id,
            lesson_ref_id: /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(currentLab.id)
              ? currentLab.id
              : null,
            attempt_number: newVerNum,
            prompt_text: promptText,
            ai_output: result.output,
            evaluation_json: evalResult,
            model: result.model,
            latency_ms: result.latencyMs
        });
      }

      // 4. LƯU PHIÊN BẢN (PROMPT VERSIONING CHO COMPARE MODE)
      const bizEval = evaluateBusinessMetrics(promptText, result.output, currentLab.sampleInputContext);
      const newVer: PromptVersion = {
        id: `ver-${currentLab.id}-${newVerNum}-${Date.now()}`,
        versionNumber: newVerNum,
        labId: currentLab.id,
        promptText,
        systemInstruction: systemText,
        output: result.output,
        techniqueUsed: currentLab.badge,
        detectedChanges: detectPromptComponents(promptText),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        businessEvaluation: bizEval,
        aiEvaluation: evalResult,
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
      };

      setVersionsByLab(prev => ({
        ...prev,
        [currentLab.id]: [...(prev[currentLab.id] || []), newVer]
      }));
      setSelectedVersionNumber(newVerNum);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Đã xảy ra lỗi khi thực thi câu lệnh. Vui lòng thử lại.');
      setOutput('');
    } finally {
      setIsRunning(false);
      setRunStatus('idle');
    }
  };

  const handleNextStepOrLab = () => {
    if (currentStep === 1) {
      // Never inject a complete sample into learner work; step two keeps the learner's own draft.
      setSupportMode('structure');
      setCurrentStep(2);
    } else if (currentLabIndex < labs.length - 1) {
      // Chuyển sang bài tiếp theo
      const nextIndex = currentLabIndex + 1;
      setCurrentLabIndex(nextIndex);
      onSelectLab?.(labs[nextIndex].id);
    } else {
      // Đã hoàn thành toàn bộ bài lab
      setCurrentStep(3);
    }
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleCopySampleData = () => {
    if (currentLab.sampleInputContext) {
      navigator.clipboard.writeText(currentLab.sampleInputContext);
      setIsDataCopied(true);
      setTimeout(() => setIsDataCopied(false), 1500);
    }
  };

  // Tên bước tiến trình
  const stepLabel = currentStep === 1 
    ? 'Bước 1 / 3: Thử nghiệm ban đầu' 
    : currentStep === 2 
    ? 'Bước 2 / 3: Cải tiến cấu trúc' 
    : 'Bước 3 / 3: Hoàn thành đạt chuẩn';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 1. THANH TIẾN ĐỘ MẢNH & ĐIỀU HƯỚNG TỐI GIẢN */}
      <div className="space-y-3">
        {/* Progress bar mảnh ở đầu lesson */}
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round(((currentLabIndex + (currentStep === 3 ? 1 : currentStep === 2 ? 0.66 : 0.33)) / labs.length) * 100))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-1 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {/* Dropdown chuyển bài gọn nhẹ */}
            <div className="relative">
              <select
                value={currentLabIndex}
                onChange={(e) => {
                  const nextIndex = Number(e.target.value);
                  setCurrentLabIndex(nextIndex);
                  onSelectLab?.(labs[nextIndex].id);
                }}
                className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-1.5 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-none transition"
              >
                {labs.map((lab, index) => (
                  <option key={lab.id} value={index}>
                    Bài {lab.order} / {labs.length}: {lab.badge}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            <span className="text-slate-400 font-medium">·</span>

            {/* Nhãn bước: Bài X / 5 · Bước Y / 3 */}
            <span className="text-xs sm:text-sm font-semibold text-slate-600">
              {stepLabel}
            </span>

            {/* Trạng thái Đã hoàn thành nhẹ nhàng khi làm xong */}
            {(currentStep === 3 || (scoreResult && scoreResult.totalScore >= 75)) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-fadeIn">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Đã hoàn thành</span>
              </span>
            )}
          </div>

          {/* Nút hành động (Tiếp tục & Hướng dẫn) */}
          <div className="flex items-center gap-2.5">
            {onOpenTutorial && (
              <button
                type="button"
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 transition"
                title="Xem lại quy trình làm bài (Guided Walkthrough)"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xem lại hướng dẫn</span>
              </button>
            )}

            {/* Nút Tiếp tục (chỉ hiện khi đã chạy có kết quả) */}
            {output && !isRunning && (
              <button
                onClick={handleNextStepOrLab}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm animate-fadeIn"
              >
                <span>{currentStep === 1 ? 'Tiếp tục bước 2' : currentLabIndex < labs.length - 1 ? 'Sang bài tiếp theo' : 'Đã hoàn thành'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. BỐ CỤC CHÍNH (HYBRID 35% - 65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 1. Read: concise brief; data and advanced guidance stay collapsed. */}
        <div className="lg:col-span-4 lg:sticky lg:top-20">
          <LessonBriefPanel lab={currentLab} onCopyData={handleCopySampleData} isDataCopied={isDataCopied} />
        </div>

        {/* CỘT PHẢI (65%): TẬP TRUNG HOÀN TOÀN VÀO THỰC HÀNH */}
        <div className="lg:col-span-8 space-y-5">
          {/* Vùng soạn thảo Prompt chính */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4" data-tour="tour-prompt">
            <PromptComposer
              promptText={promptText}
              supportMode={supportMode}
              promptPlaceholder={supportMode === 'structure'
                ? 'Vai trò: ...\nBối cảnh: ...\nNhiệm vụ: ...\nRàng buộc: ...\nĐầu ra mong muốn: ...'
                : 'Tự viết prompt của bạn tại đây...'}
              samplePrompt={currentLab.improvedPrompt}
              textareaRef={textareaRef}
              onChange={(value) => { setPromptText(value); if (errorMessage) setErrorMessage(null); }}
              onSupportModeChange={setSupportMode}
              onInsertBlock={insertPromptBlock}
              history={currentLabVersions.length > 0 ? (
                <PromptVersionBar
                  versions={currentLabVersions}
                  selectedVersionNumber={selectedVersionNumber}
                  onSelectVersion={(vNum) => setSelectedVersionNumber(vNum)}
                  onRestorePrompt={(restored) => { setPromptText(restored); setSelectedSpan(null); }}
                  onOpenCompare={() => setIsABModalOpen(true)}
                  onSaveToLibrary={(ver) => { setVersionToSave(ver); setIsSaveModalOpen(true); }}
                />
              ) : undefined}
            />

            <PromptStructurePanel
              analysis={promptAnalysis}
              promptText={promptText}
              focusComponents={currentLab.focusComponents}
              selectedSpan={selectedSpan}
              onSelectComponent={handleSelectComponent}
            />

            {/* Thiết lập nâng cao (Mặc định đóng) */}
            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Thiết lập nâng cao (Vai trò hệ thống)</span>
                {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvancedSettings && (
                <div className="mt-2.5 p-3 bg-slate-50 rounded-xl space-y-1.5 animate-fadeIn">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Vai trò hệ thống (Chỉ dẫn ngầm cho AI):
                  </label>
                  <input
                    type="text"
                    value={systemText}
                    onChange={(e) => setSystemText(e.target.value)}
                    placeholder="Ví dụ: Bạn là chuyên viên phân tích ngân hàng..."
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Một CTA chính duy nhất: CHẠY PROMPT */}
            <button
              onClick={handleRun}
              disabled={isRunning || !promptText.trim()}
              data-tour="tour-run"
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold text-sm shadow-sm hover:shadow transition flex items-center justify-center gap-2"
            >
              <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
              <span>
                {runStatus === 'generating' 
                  ? 'Đang tạo câu trả lời...' 
                  : runStatus === 'evaluating' 
                  ? 'AI đang đánh giá câu lệnh...' 
                  : isRunning 
                  ? 'Đang xử lý...' 
                  : 'Chạy Prompt'}
              </span>
            </button>
          </div>

          {/* VÙNG KẾT QUẢ SAU KHI RUN HOẶC KHI CHỌN VERSION */}
          {(output || isRunning || (selectedVersionNumber > 0 && currentLabVersions.length > 0)) && (
            <div className="space-y-4 animate-fadeIn">
              {/* Output xuất hiện ngay dưới prompt */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-3" data-tour="tour-output">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      3. Kết quả AI & chấm điểm
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      (Lần thử {selectedVersionNumber > 0 ? selectedVersionNumber : currentLabRunCount})
                    </span>

                    {/* Nút lưu nhanh version này vào thư viện Prompt */}
                    {selectedVersionNumber > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const ver = currentLabVersions.find(v => v.versionNumber === selectedVersionNumber);
                          if (ver) {
                            setVersionToSave(ver);
                            setIsSaveModalOpen(true);
                          }
                        }}
                        className="text-[11px] font-semibold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300 transition flex items-center gap-1 shadow-2xs"
                        title="Lưu phiên bản này thành Prompt chuẩn (SOP)"
                      >
                        <BookmarkPlus className="w-3 h-3 text-amber-600" />
                        <span>Lưu vào Thư viện</span>
                      </button>
                    )}
                  </div>

                  {(output || selectedVersionNumber > 0) && (
                    <button
                      onClick={handleCopyOutput}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Đã sao chép' : 'Sao chép kết quả'}</span>
                    </button>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed overflow-x-auto min-h-[140px]">
                  {runStatus === 'generating' && !output ? (
                    <div className="flex items-center gap-2 text-slate-500 py-6">
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Đang nhận phản hồi từ mô hình...</span>
                    </div>
                  ) : (selectedVersionNumber > 0 ? currentLabVersions.find(v => v.versionNumber === selectedVersionNumber)?.output : output) ? (
                    <div className="text-xs sm:text-sm leading-relaxed">
                      <MarkdownView 
                        content={selectedVersionNumber > 0 
                          ? (currentLabVersions.find(v => v.versionNumber === selectedVersionNumber)?.output || output) 
                          : output} 
                      />
                    </div>
                  ) : (
                    <div className="text-slate-400 py-4 text-xs">
                      Chưa có kết quả phản hồi.
                    </div>
                  )}
                </div>

                {/* Chi tiết kỹ thuật (mặc định đóng, giấu tokens và latency vào đây) */}
                {metrics && (
                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                    <button
                      onClick={() => setShowTechDetails(!showTechDetails)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition"
                    >
                      <span>Chi tiết kỹ thuật</span>
                      {showTechDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showTechDetails && (
                      <span className="text-[11px] font-mono text-slate-500">
                        {metrics.latency}ms · {metrics.tokens} tokens · {metrics.mode === 'simulated' ? 'Mô phỏng' : 'Gemini'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Trạng thái AI đang đánh giá Rubric (không che khuất kết quả) */}
              {runStatus === 'evaluating' && !aiEvaluation && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center gap-2.5 text-xs text-emerald-800 animate-fadeIn">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="font-semibold">AI đang phân tích và chấm điểm câu lệnh theo 5 tiêu chí Rubric...</span>
                </div>
              )}

              {/* Card chấm điểm & AI Feedback phía dưới output */}
              {(() => {
                const activeAiEval = (selectedVersionNumber > 0 
                  ? currentLabVersions.find(v => v.versionNumber === selectedVersionNumber)?.aiEvaluation 
                  : null) || aiEvaluation;

                if (activeAiEval) {
                  return (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3.5 animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-800">
                            AI Feedback & Đánh giá Rubric:
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            activeAiEval.total >= 8 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : activeAiEval.total >= 5 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {activeAiEval.total} / 10 điểm
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-medium transition"
                        >
                          {showScoreBreakdown ? 'Thu gọn' : 'Xem chi tiết'}
                        </button>
                      </div>

                      {/* 5 tiêu chí Rubric chi tiết */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Hoàn thành nhiệm vụ</span>
                          <span className="font-bold text-slate-800">{activeAiEval.scores.taskCompletion}/2</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Độ chuẩn xác / Căn cứ</span>
                          <span className="font-bold text-slate-800">{activeAiEval.scores.groundedness}/2</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Tuân thủ cấu trúc</span>
                          <span className="font-bold text-slate-800">{activeAiEval.scores.formatAdherence}/2</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Tuân thủ ràng buộc</span>
                          <span className="font-bold text-slate-800">{activeAiEval.scores.constraintCompliance}/2</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Tính ứng dụng thực tế</span>
                          <span className="font-bold text-slate-800">{activeAiEval.scores.businessUsability}/2</span>
                        </div>
                      </div>

                      {/* Điểm làm tốt, cần cải thiện */}
                      {showScoreBreakdown && (
                        <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs animate-fadeIn">
                          {activeAiEval.strengths && activeAiEval.strengths.length > 0 && (
                            <div>
                              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Điểm làm tốt:
                              </span>
                              <ul className="text-slate-600 pl-4 list-disc space-y-0.5">
                                {activeAiEval.strengths.map((s: string, idx: number) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {activeAiEval.improvements && activeAiEval.improvements.length > 0 && (
                            <div>
                              <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 mb-1">
                                <ThumbsUp className="w-3.5 h-3.5 text-amber-600" /> Cần cải thiện:
                              </span>
                              <ul className="text-slate-600 pl-4 list-disc space-y-0.5">
                                {activeAiEval.improvements.map((s: string, idx: number) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Gợi ý cho lần thử tiếp theo */}
                      {activeAiEval.nextHint && (
                        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block mb-0.5">Gợi ý cho lần thử tiếp theo:</span>
                            <span>{activeAiEval.nextHint}</span>
                          </div>
                        </div>
                      )}

                      {/* Nút hành động tiếp tục sau khi chấm điểm */}
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={handleNextStepOrLab}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
                        >
                          <span>{currentStep === 1 ? 'Chuyển sang Bước 2 (Cải tiến prompt)' : currentLabIndex < labs.length - 1 ? 'Sang bài tiếp theo' : 'Hoàn thành khóa học'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                if (scoreResult) {
                  return (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-800">
                            AI Feedback:
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                            scoreResult.totalScore >= 80 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : scoreResult.totalScore >= 50 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {Math.round(scoreResult.totalScore / 10)} / 10 điểm
                          </span>
                        </div>

                        <button
                          onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          {showScoreBreakdown ? 'Thu gọn' : 'Xem tiêu chí'}
                        </button>
                      </div>

                      <p className="text-xs text-slate-600">
                        {scoreResult.actionableAdvice}
                      </p>

                      {showScoreBreakdown && (
                        <div className="pt-2 mt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs animate-fadeIn">
                          <div className="p-2 bg-slate-50 rounded">
                            <span className="text-[11px] text-slate-500 block">Rõ vai trò</span>
                            <span className="font-bold text-slate-800">{scoreResult.personaScore}/20</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <span className="text-[11px] text-slate-500 block">Nhiệm vụ</span>
                            <span className="font-bold text-slate-800">{scoreResult.taskScore}/20</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <span className="text-[11px] text-slate-500 block">Ràng buộc</span>
                            <span className="font-bold text-slate-800">{scoreResult.guardrailsScore}/20</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <span className="text-[11px] text-slate-500 block">Tham số hóa</span>
                            <span className="font-bold text-slate-800">{scoreResult.variableScore}/20</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <span className="text-[11px] text-slate-500 block">Định dạng</span>
                            <span className="font-bold text-slate-800">{scoreResult.formatScore}/20</span>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={handleNextStepOrLab}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
                        >
                          <span>{currentStep === 1 ? 'Chuyển sang Bước 2 (Cải tiến prompt)' : currentLabIndex < labs.length - 1 ? 'Sang bài tiếp theo' : 'Hoàn thành khóa học'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Compare/revise follows output and evaluation in the learning flow. */}
              <InlineCompareCard
                lab={currentLab}
                runCount={currentLabRunCount}
                currentPrompt={promptText}
                onOpenFullCompare={() => setIsABModalOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Đối chiếu A/B với Business Metrics & Self-check */}
      <ABCompareModal
        isOpen={isABModalOpen}
        onClose={() => setIsABModalOpen(false)}
        lab={currentLab}
        versions={currentLabVersions}
        onSavePromptToLibrary={(ver) => {
          setVersionToSave(ver);
          setIsSaveModalOpen(true);
        }}
      />

      {/* Modal Lưu Prompt vào Thư viện SOP */}
      {versionToSave && (
        <SavePromptModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          lab={currentLab}
          version={versionToSave}
        />
      )}
    </div>
  );
};
