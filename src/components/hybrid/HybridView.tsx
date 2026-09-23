import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  Copy, 
  Check, 
  GitCompare, 
  FileText, 
  Sparkles, 
  Award, 
  ArrowRight,
  Settings2,
  HelpCircle,
  RotateCcw,
  BookmarkPlus,
  Compass,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  Lightbulb,
  AlertTriangle
} from 'lucide-react';
import { detectPiiEntities, sanitizePii } from '../../services/labComplianceService';
import { LabStep, ApiConfig, PromptRun, PromptVersion, RubricAudit, LabAssistanceState } from '../../types';
import { AiEvaluationResult } from '../../types/database';
import { AssistanceConfirmModal } from '../lesson/AssistanceConfirmModal';
import { executePromptStream, evaluatePromptLive, mapAiEvaluationToRubricAudit } from '../../services/llmService';
import { detectPromptComponents, evaluateBusinessMetrics } from '../../services/businessEvaluationService';
import { dbService } from '../../services/dbService';
import { LessonBriefPanel } from '../lesson/LessonBriefPanel';
import { PromptComposer } from '../prompt/PromptComposer';
import { 
  analyzePromptStructure, 
  PromptAnalysis, 
  PromptSpan, 
  PromptComponentType 
} from '../../services/promptStructureAnalyzer';
import { ABCompareModal } from '../common/ABCompareModal';
import { SavePromptModal } from '../common/SavePromptModal';
import { MarkdownView } from '../common/MarkdownView';
import { validateAiEvaluationPayload } from '../../services/aiEvaluationContract';

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
  onOpenApiModal?: () => void;
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
  onOpenApiModal,
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

  useEffect(() => {
    if (currentLab?.id && onSelectLab) {
      onSelectLab(currentLab.id);
    }
  }, [currentLab?.id, onSelectLab]);

  // Tiến trình bước trong bài (1: Prompt ban đầu -> 2: Cải tiến cấu trúc -> 3: Hoàn thành)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Đếm số lần chạy theo từng bài lab (chỉ hiển thị đối chiếu Trước/Sau khi user đã chạy ít nhất 2 lần)
  const [runCountsByLab, setRunCountsByLab] = useState<Record<string, number>>({});
  const currentLabRunCount = runCountsByLab[currentLab.id] || 0;

  // Trạng thái ô nhập liệu & kết quả (Khởi tạo prompt rỗng cho bài tập tự viết, không nạp đáp án hoàn chỉnh)
  const [promptText, setPromptText] = useState<string>('');
  const [systemText, setSystemText] = useState<string>(currentLab.systemInstruction || 'Bạn là trợ lý AI chuyên nghiệp. Chỉ thực hiện yêu cầu người dùng cung cấp và không tự suy diễn dữ kiện.');
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runStatus, setRunStatus] = useState<'idle' | 'generating' | 'evaluating' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiEvaluation, setAiEvaluation] = useState<AiEvaluationResult | null>(null);
  const [lastEvaluatedPrompt, setLastEvaluatedPrompt] = useState<string | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [isRetryingEvaluation, setIsRetryingEvaluation] = useState<boolean>(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDataCopied, setIsDataCopied] = useState<boolean>(false);

  // Accordions (mặc định đóng theo đúng yêu cầu để giảm visual noise)
  const [showDataAccordion, setShowDataAccordion] = useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState<boolean>(false);

  // Kết quả sau khi chạy
  const [scoreResult, setScoreResult] = useState<RubricAudit | null>(null);
  const [metrics, setMetrics] = useState<{ tokens: number; latency: number; mode: string } | null>(null);

  // Quản lý các phiên bản câu lệnh (Prompt Versioning) theo từng lab
  const [versionsByLab, setVersionsByLab] = useState<Record<string, PromptVersion[]>>({});
  const currentLabVersions = versionsByLab[currentLab.id] || [];
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number>(0);
  const [isABModalOpen, setIsABModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [versionToSave, setVersionToSave] = useState<PromptVersion | null>(null);
  const tutorialSnapshotRef = useRef<{
    promptText: string;
    output: string;
    aiEvaluation: AiEvaluationResult | null;
    lastEvaluatedPrompt: string | null;
    scoreResult: RubricAudit | null;
    versions: PromptVersion[];
    selectedVersionNumber: number;
    runCount: number;
    errorMessage: string | null;
  } | null>(null);

  useEffect(() => {
    const makeTutorialEvaluation = (improved: boolean): AiEvaluationResult => ({
      scores: improved
        ? { taskCompletion: 2, groundedness: 2, formatAdherence: 2, constraintCompliance: 2, businessUsability: 2 }
        : { taskCompletion: 1, groundedness: 1, formatAdherence: 1, constraintCompliance: 0, businessUsability: 1 },
      total: improved ? 10 : 4,
      strengths: improved
        ? ['Prompt nêu rõ nhiệm vụ và định dạng đầu ra của bài.']
        : ['Đã có yêu cầu ban đầu để AI phản hồi.'],
      improvements: improved
        ? ['Có thể tiếp tục thử với dữ liệu mới cùng cấu trúc.']
        : ['Bổ sung vai trò, dữ liệu, ràng buộc và định dạng đầu ra.'],
      nextHint: improved
        ? 'So sánh với lần đầu để nhận ra phần cấu trúc đã cải thiện.'
        : 'Dùng các chip cấu trúc để làm prompt cụ thể hơn.',
    });

    const makeTutorialVersions = (): PromptVersion[] => {
      const baselinePrompt = currentLab.baselinePrompt || `Hãy thực hiện nhiệm vụ: ${currentLab.taskGoal}`;
      const improvedPrompt = currentLab.improvedPrompt || `NHIỆM VỤ: ${currentLab.taskGoal}\nĐỊNH DẠNG ĐẦU RA: ${currentLab.expectedOutputFormat}`;
      const baselineOutput = currentLab.simulatedBaselineOutput || 'Đây là output minh họa ban đầu, còn thiếu cấu trúc và chi tiết.';
      const improvedOutput = currentLab.simulatedImprovedOutput || `Output minh họa đã tuân thủ: ${currentLab.expectedOutputFormat}`;
      return [
        {
          id: `tutorial-${currentLab.id}-1`,
          versionNumber: 1,
          labId: currentLab.id,
          promptText: baselinePrompt,
          systemInstruction: systemText,
          output: baselineOutput,
          techniqueUsed: 'Lần thử minh họa',
          detectedChanges: detectPromptComponents(baselinePrompt),
          timestamp: 'Demo',
          businessEvaluation: evaluateBusinessMetrics(baselinePrompt, baselineOutput, currentLab.sampleInputContext),
          aiEvaluation: makeTutorialEvaluation(false),
        },
        {
          id: `tutorial-${currentLab.id}-2`,
          versionNumber: 2,
          labId: currentLab.id,
          promptText: improvedPrompt,
          systemInstruction: systemText,
          output: improvedOutput,
          techniqueUsed: currentLab.badge,
          detectedChanges: detectPromptComponents(improvedPrompt),
          timestamp: 'Demo',
          businessEvaluation: evaluateBusinessMetrics(improvedPrompt, improvedOutput, currentLab.sampleInputContext),
          aiEvaluation: makeTutorialEvaluation(true),
        },
      ];
    };

    const handleTutorialStep = (event: Event) => {
      const detail = (event as CustomEvent).detail as { isOpen?: boolean; demoAction?: string };
      if (!detail?.isOpen) {
        const snapshot = tutorialSnapshotRef.current;
        if (snapshot) {
          setPromptText(snapshot.promptText);
          setOutput(snapshot.output);
          setAiEvaluation(snapshot.aiEvaluation);
          setLastEvaluatedPrompt(snapshot.lastEvaluatedPrompt);
          setScoreResult(snapshot.scoreResult);
          setSelectedVersionNumber(snapshot.selectedVersionNumber);
          setErrorMessage(snapshot.errorMessage);
          setVersionsByLab((prev) => ({ ...prev, [currentLab.id]: snapshot.versions }));
          setRunCountsByLab((prev) => ({ ...prev, [currentLab.id]: snapshot.runCount }));
        }
        tutorialSnapshotRef.current = null;
        setIsABModalOpen(false);
        setIsSaveModalOpen(false);
        setVersionToSave(null);
        return;
      }

      if (!tutorialSnapshotRef.current) {
        tutorialSnapshotRef.current = {
          promptText,
          output,
          aiEvaluation,
          lastEvaluatedPrompt,
          scoreResult,
          versions: currentLabVersions,
          selectedVersionNumber,
          runCount: currentLabRunCount,
          errorMessage,
        };
      }

      const demoPrompt = currentLab.starterPrompt
        || `NHIỆM VỤ: ${currentLab.taskGoal}\nĐỊNH DẠNG ĐẦU RA: ${currentLab.expectedOutputFormat}`;

      if (detail.demoAction === 'show-prompt' || detail.demoAction === 'show-run') {
        if (!promptText.trim()) setPromptText(demoPrompt);
        setIsABModalOpen(false);
        setIsSaveModalOpen(false);
      }

      if (detail.demoAction === 'show-output') {
        const evaluation = makeTutorialEvaluation(false);
        const mockPrompt = promptText.trim() ? promptText : demoPrompt;
        setPromptText(mockPrompt);
        setOutput(currentLab.simulatedBaselineOutput || 'Output minh họa của AI sẽ xuất hiện tại đây sau khi chạy prompt.');
        setAiEvaluation(evaluation);
        setLastEvaluatedPrompt(mockPrompt);
        setScoreResult(mapAiEvaluationToRubricAudit(evaluation));
        setRunStatus('idle');
        setErrorMessage(null);
        setIsABModalOpen(false);
        setIsSaveModalOpen(false);
      }

      if (detail.demoAction === 'show-compare') {
        const versions = makeTutorialVersions();
        setVersionsByLab((prev) => ({ ...prev, [currentLab.id]: versions }));
        setRunCountsByLab((prev) => ({ ...prev, [currentLab.id]: 2 }));
        setSelectedVersionNumber(2);
        setPromptText(versions[1].promptText);
        setOutput(versions[1].output);
        setIsSaveModalOpen(false);
        setIsABModalOpen(true);
      }

      if (detail.demoAction === 'show-library') {
        const versions = makeTutorialVersions();
        setVersionsByLab((prev) => ({ ...prev, [currentLab.id]: versions }));
        setRunCountsByLab((prev) => ({ ...prev, [currentLab.id]: 2 }));
        setSelectedVersionNumber(2);
        setIsABModalOpen(false);
        setVersionToSave(versions[1]);
        setIsSaveModalOpen(true);
      }
    };

    window.addEventListener('promptify:tutorial-step', handleTutorialStep);
    return () => window.removeEventListener('promptify:tutorial-step', handleTutorialStep);
  }, [
    currentLab,
    currentLabRunCount,
    currentLabVersions,
    promptText,
    output,
    aiEvaluation,
    lastEvaluatedPrompt,
    scoreResult,
    selectedVersionNumber,
    errorMessage,
    systemText,
  ]);

  // Quản lý trạng thái mở khóa Gợi ý / Lời giải theo từng bài lab
  const [assistanceByLab, setAssistanceByLab] = useState<Record<string, LabAssistanceState>>(() => {
    try {
      const saved = localStorage.getItem('promptify_lab_assistance');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('promptify_lab_assistance', JSON.stringify(assistanceByLab));
    } catch (e) {
      console.warn('[HybridView] Không thể lưu trạng thái trợ giúp vào localStorage:', e);
    }
  }, [assistanceByLab]);

  const currentLabAssistance = assistanceByLab[currentLab.id] || {
    hasViewedHints: false,
    hasViewedSolution: false,
  };

  const [assistanceModalState, setAssistanceModalState] = useState<{
    isOpen: boolean;
    type: 'hint' | 'solution';
  }>({
    isOpen: false,
    type: 'hint',
  });

  const handleRequestViewHints = () => {
    if (currentLabAssistance.hasViewedHints) return;
    setAssistanceModalState({ isOpen: true, type: 'hint' });
  };

  const handleRequestViewSolution = () => {
    if (currentLabAssistance.hasViewedSolution) return;
    setAssistanceModalState({ isOpen: true, type: 'solution' });
  };

  const handleConfirmAssistance = () => {
    const type = assistanceModalState.type;
    setAssistanceByLab(prev => {
      const existing = prev[currentLab.id] || { hasViewedHints: false, hasViewedSolution: false };
      if (type === 'hint') {
        return {
          ...prev,
          [currentLab.id]: {
            ...existing,
            hasViewedHints: true,
            hintsUnlockedAt: new Date().toISOString(),
          }
        };
      } else {
        return {
          ...prev,
          [currentLab.id]: {
            ...existing,
            hasViewedSolution: true,
            solutionUnlockedAt: new Date().toISOString(),
          }
        };
      }
    });
    setAssistanceModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancelAssistance = () => {
    setAssistanceModalState(prev => ({ ...prev, isOpen: false }));
  };

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
      const textarea = textareaRef.current;
      textarea.focus();

      const textInDom = textarea.value;
      let selStart = targetSpan.start;
      let selEnd = targetSpan.end;

      // Kiểm tra xem đoạn ký tự thực tế tại [selStart, selEnd] trong textarea có khớp đúng targetSpan.text không
      const currentSlice = textInDom.slice(selStart, selEnd);
      if (currentSlice !== targetSpan.text) {
        // Nếu bị lệch (do khác biệt ký tự xuống dòng \r\n vs \n), tự động tìm vị trí khớp 100%
        const searchRangeStart = Math.max(0, selStart - 50);
        const searchRangeEnd = Math.min(textInDom.length, selEnd + 50);
        const localRegion = textInDom.slice(searchRangeStart, searchRangeEnd);
        const localIdx = localRegion.indexOf(targetSpan.text);

        if (localIdx !== -1) {
          selStart = searchRangeStart + localIdx;
          selEnd = selStart + targetSpan.text.length;
        } else {
          const globalIdx = textInDom.indexOf(targetSpan.text);
          if (globalIdx !== -1) {
            selStart = globalIdx;
            selEnd = globalIdx + targetSpan.text.length;
          }
        }
      }

      try {
        textarea.setSelectionRange(selStart, selEnd);
      } catch (err) {
        console.error('Error selecting text range:', err);
      }
    }
  };

  // Đồng bộ khi chuyển bài lab
  useEffect(() => {
    setPromptText('');
    setSystemText(currentLab.systemInstruction || 'Bạn là trợ lý AI chuyên nghiệp. Chỉ thực hiện yêu cầu người dùng cung cấp và không tự suy diễn dữ kiện.');
    setOutput('');
    setScoreResult(null);
    setAiEvaluation(null);
    setLastEvaluatedPrompt(null);
    setEvaluationError(null);
    setIsRetryingEvaluation(false);
    setCurrentAttemptId(null);
    setErrorMessage(null);
    setMetrics(null);
    setCurrentStep(1);
    setSelectedVersionNumber(0);
    setShowDataAccordion(false);
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

          const mappedVersions: PromptVersion[] = attempts.map((attempt) => {
            let storedEvaluation: AiEvaluationResult | null = null;
            if (attempt.evaluation_json) {
              try {
                storedEvaluation = validateAiEvaluationPayload(attempt.evaluation_json);
              } catch (error) {
                console.warn('[HybridView] Bỏ qua evaluation_json không đúng contract:', error);
              }
            }
            return {
              id: attempt.id,
              versionNumber: attempt.attempt_number,
              labId: attempt.lesson_id,
              promptText: attempt.prompt_text,
              systemInstruction: systemText,
              output: attempt.ai_output,
              techniqueUsed: currentLab.badge,
              detectedChanges: detectPromptComponents(attempt.prompt_text),
              timestamp: attempt.created_at ? new Date(attempt.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
              businessEvaluation: evaluateBusinessMetrics(attempt.prompt_text, attempt.ai_output, currentLab.sampleInputContext),
              aiEvaluation: storedEvaluation,
              tokenCount: Math.round(attempt.ai_output.length / 3.8),
              latencyMs: attempt.latency_ms,
            };
          });

          setVersionsByLab(prev => ({
            ...prev,
            [currentLab.id]: mappedVersions
          }));

          setRunCountsByLab(prev => ({
            ...prev,
            [currentLab.id]: mappedVersions.length
          }));

          // Khởi tạo ở trạng thái soạn thảo mới: KHÔNG tự động nạp kết quả chấm cũ vào ô lệnh
          setSelectedVersionNumber(0);
          setAiEvaluation(null);
          setLastEvaluatedPrompt(null);
          setScoreResult(null);
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
      setEvaluationError(null);
      let evalResult: AiEvaluationResult | null = null;
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
        console.warn('[HybridView] AI Judge evaluation failed:', judgeErr);
        evalResult = null;
        setEvaluationError(
          judgeErr?.message || 'Không thể đánh giá lúc này. Máy chủ AI chấm điểm phản hồi chậm hoặc tạm thời gián đoạn.'
        );
      }

      if (evalResult) {
        setAiEvaluation(evalResult);
        setLastEvaluatedPrompt(promptText);
        const evaluatedScore = mapAiEvaluationToRubricAudit(evalResult);
        setScoreResult(evaluatedScore);

        // Cập nhật bước tiến trình nếu đang ở bước 1 hoặc bước 2
        if (currentStep === 1) {
          setCurrentStep(2);
        } else if (currentStep === 2 && evalResult.total >= 7) {
          setCurrentStep(3);
        }
      } else {
        setAiEvaluation(null);
        setLastEvaluatedPrompt(null);
        setScoreResult(null);
      }
      setRunStatus('idle');

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

      // 3. PERSIST ATTEMPT VÀO DATABASE (Bảng prompt_attempts)
      const labVers = versionsByLab[currentLab.id] || [];
      const newVerNum = labVers.length + 1;
      let persistedAttemptId: string | null = null;

      if (currentLearnerId && currentClassId) {
        try {
          const recorded = await dbService.recordPromptAttempt({
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
            model: result.model || 'gemini-2.5-flash',
            latency_ms: result.latencyMs
          });
          if (recorded?.id) {
            persistedAttemptId = recorded.id;
            setCurrentAttemptId(recorded.id);
          }
        } catch (dbErr) {
          console.warn('[HybridView] Lỗi lưu attempt vào DB:', dbErr);
        }
      }

      // 4. LƯU PHIÊN BẢN (PROMPT VERSIONING CHO COMPARE MODE)
      const bizEval = evaluateBusinessMetrics(promptText, result.output, currentLab.sampleInputContext);
      const newVer: PromptVersion = {
        id: persistedAttemptId || `ver-${currentLab.id}-${newVerNum}-${Date.now()}`,
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

  /**
   * Đánh giá lại câu lệnh (Retry Evaluation) khi lần chấm điểm trước gặp sự cố
   * Cập nhật kết quả vào đúng attempt đã lưu mà không cần chạy lại mô hình sinh văn bản
   */
  const handleRetryEvaluation = async () => {
    const activeVer = selectedVersionNumber > 0 
      ? currentLabVersions.find(v => v.versionNumber === selectedVersionNumber) 
      : null;
    const targetPrompt = activeVer ? activeVer.promptText : promptText;
    const targetOutput = activeVer ? activeVer.output : output;
    const targetAttemptId = activeVer?.id || currentAttemptId;

    if (!targetPrompt.trim() || !targetOutput.trim()) {
      setEvaluationError('Không tìm thấy nội dung câu lệnh hoặc kết quả để đánh giá lại.');
      return;
    }

    setIsRetryingEvaluation(true);
    setEvaluationError(null);

    try {
      const evalResult = await evaluatePromptLive({
        lessonId: currentLab.id,
        classId: currentClassId,
        scenario: currentLab.scenario,
        controlData: currentLab.sampleInputContext,
        taskRequirement: currentLab.taskGoal,
        lessonRubric: currentLab.rubricCriteria,
        learnerPrompt: targetPrompt,
        generatedOutput: targetOutput
      });

      setAiEvaluation(evalResult);
      const evaluatedScore = mapAiEvaluationToRubricAudit(evalResult);
      setScoreResult(evaluatedScore);

      // Cập nhật version trong state versionsByLab
      setVersionsByLab(prev => {
        const labVers = prev[currentLab.id] || [];
        const updated = labVers.map(v => {
          if (activeVer && v.versionNumber === activeVer.versionNumber) {
            return { ...v, aiEvaluation: evalResult };
          }
          if (!activeVer && v.versionNumber === selectedVersionNumber) {
            return { ...v, aiEvaluation: evalResult };
          }
          return v;
        });
        return {
          ...prev,
          [currentLab.id]: updated
        };
      });

      // Cập nhật database cho đúng attempt ID đã lưu
      if (targetAttemptId) {
        try {
          await dbService.updatePromptAttemptEvaluation(targetAttemptId, evalResult);
        } catch (dbErr) {
          console.warn('[HybridView] Lỗi cập nhật re-evaluation vào DB:', dbErr);
        }
      }

      // Cập nhật tiến trình nếu hoàn thành đạt chuẩn
      if (currentStep === 1) {
        setCurrentStep(2);
      } else if (currentStep === 2 && evalResult.total >= 7) {
        setCurrentStep(3);
      }
    } catch (err: any) {
      console.warn('[HybridView] Retry evaluation failed:', err);
      setEvaluationError(err?.message || 'Không thể đánh giá lúc này. Vui lòng thử lại sau giây lát.');
      setAiEvaluation(null);
      setScoreResult(null);
    } finally {
      setIsRetryingEvaluation(false);
    }
  };

  const handleNextStepOrLab = () => {
    if (currentStep === 1) {
      // Giữ nguyên prompt của học viên để họ tiếp tục tự cải tiến dựa trên AI Feedback.
      setCurrentStep(2);
    } else if (currentLabIndex < labs.length - 1) {
      // Chuyển sang bài tiếp theo
      setCurrentLabIndex(currentLabIndex + 1);
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

  // Tự động Bút xóa PII 1-chạm (One-Click Sanitize)
  const handleAutoSanitizePii = () => {
    const sanitized = sanitizePii(promptText);
    setPromptText(sanitized);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.classList.add('ring-4', 'ring-emerald-500');
      setTimeout(() => {
        textareaRef.current?.classList.remove('ring-4', 'ring-emerald-500');
      }, 1500);
    }
    setAiEvaluation(null);
    setScoreResult(null);
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
                onChange={(e) => setCurrentLabIndex(Number(e.target.value))}
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
        {/* CỘT TRÁI (35%): TÌNH HUỐNG & MỤC TIÊU - STICKY DESKTOP */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <LessonBriefPanel
            lab={currentLab}
            showDataAccordion={showDataAccordion}
            setShowDataAccordion={setShowDataAccordion}
            isDataCopied={isDataCopied}
            onCopySampleData={handleCopySampleData}
            hasViewedHints={currentLabAssistance.hasViewedHints}
            hasViewedSolution={currentLabAssistance.hasViewedSolution}
            onRequestViewHints={handleRequestViewHints}
            onRequestViewSolution={handleRequestViewSolution}
            />
        </div>

        {/* CỘT PHẢI (65%): TẬP TRUNG HOÀN TOÀN VÀO THỰC HÀNH */}
        <div className="lg:col-span-8 space-y-5">
          <PromptComposer
            lab={currentLab}
            promptText={promptText}
            setPromptText={setPromptText}
            systemText={systemText}
            setSystemText={setSystemText}
            showAdvancedSettings={showAdvancedSettings}
            setShowAdvancedSettings={setShowAdvancedSettings}
            isRunning={isRunning}
            runStatus={runStatus}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
            onRun={handleRun}
            versions={currentLabVersions}
            selectedVersionNumber={selectedVersionNumber}
            onSelectVersion={(vNum) => {
              setSelectedVersionNumber(vNum);
              const ver = currentLabVersions.find(v => v.versionNumber === vNum);
              if (ver) {
                if (ver.id) {
                  setCurrentAttemptId(ver.id);
                }
                setPromptText(ver.promptText);
                setOutput(ver.output);
                if (ver.aiEvaluation) {
                  setAiEvaluation(ver.aiEvaluation);
                  setLastEvaluatedPrompt(ver.promptText);
                  setScoreResult(mapAiEvaluationToRubricAudit(ver.aiEvaluation));
                  setEvaluationError(null);
                } else {
                  setAiEvaluation(null);
                  setLastEvaluatedPrompt(null);
                  setScoreResult(null);
                  setEvaluationError('Lần thử này chưa có kết quả đánh giá AI.');
                }
              }
            }}
            onRestorePrompt={(restored) => {
              setPromptText(restored);
              setSelectedSpan(null);
              setAiEvaluation(null);
              setLastEvaluatedPrompt(null);
            }}
            onOpenCompare={() => setIsABModalOpen(true)}
            onSaveToLibrary={(ver) => {
              setVersionToSave(ver);
              setIsSaveModalOpen(true);
            }}
            promptAnalysis={promptAnalysis}
            selectedSpan={selectedSpan}
            onSelectComponent={handleSelectComponent}
            textareaRef={textareaRef}
            apiConfig={apiConfig}
            onOpenApiModal={onOpenApiModal}
            aiEvaluation={aiEvaluation}
            lastEvaluatedPromptText={lastEvaluatedPrompt}
            onManualPromptChange={() => {
              setAiEvaluation(null);
              setLastEvaluatedPrompt(null);
              setScoreResult(null);
              if (selectedVersionNumber !== 0) {
                setSelectedVersionNumber(0);
              }
            }}
          />

          {/* VÙNG KẾT QUẢ SAU KHI RUN HOẶC KHI CHỌN VERSION */}
          {(output || isRunning || (selectedVersionNumber > 0 && currentLabVersions.length > 0)) && (
            <div className="space-y-4 animate-fadeIn">
              {/* Output xuất hiện ngay dưới prompt */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-3" data-tour="tour-output">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Kết quả từ AI
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
                  {errorMessage ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2 animate-fadeIn">
                      <div className="font-semibold flex items-center gap-1.5 text-rose-900 text-sm">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Không thể kết nối dịch vụ AI</span>
                      </div>
                      <p className="text-rose-700 leading-relaxed">{errorMessage}</p>
                      {onOpenApiModal && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={onOpenApiModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-800 hover:bg-rose-100 transition shadow-2xs"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            Cập nhật API Key trong Cài đặt
                          </button>
                        </div>
                      )}
                    </div>
                  ) : runStatus === 'generating' && !output ? (
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
              {(runStatus === 'evaluating' || isRetryingEvaluation) && !aiEvaluation && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center gap-2.5 text-xs text-emerald-800 animate-fadeIn">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="font-semibold">
                    {isRetryingEvaluation 
                      ? 'Đang kết nối lại AI Judge để chấm điểm câu lệnh...' 
                      : 'AI đang phân tích và chấm điểm câu lệnh theo 5 tiêu chí Rubric...'}
                  </span>
                </div>
              )}

              {/* Card chấm điểm & AI Feedback phía dưới output */}
              {(() => {
                const activeAiEval = (selectedVersionNumber > 0 
                  ? currentLabVersions.find(v => v.versionNumber === selectedVersionNumber)?.aiEvaluation 
                  : null) || aiEvaluation;

                if (activeAiEval) {
                  const targetPromptForAudit = selectedVersionNumber > 0 
                    ? (currentLabVersions.find(v => v.versionNumber === selectedVersionNumber)?.promptText || promptText) 
                    : promptText;
                  const piiCheck = detectPiiEntities(targetPromptForAudit);
                  const isPiiLesson = Boolean(currentLab.id?.includes('1') || currentLab.title?.toLowerCase().includes('pii'));
                  const showPiiRedCard = isPiiLesson && piiCheck.hasPii;

                  return (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3.5 animate-fadeIn">
                      {/* CẢNH BÁO THẺ ĐỎ PII VI PHẠM NGHỊ ĐỊNH 13 */}
                      {showPiiRedCard && (
                        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-2.5 animate-fadeIn">
                          <div className="flex items-start gap-2.5">
                            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                                Thẻ Đỏ: Rò rỉ Thông Tin PII Thật (Vi Phạm Nghị Định 13/2023/NĐ-CP)
                              </h4>
                              <p className="text-xs text-rose-800 leading-relaxed">
                                Phát hiện {piiCheck.piiItems.length} thông tin định danh cá nhân thật chưa qua Bút xóa PII: {' '}
                                <span className="font-semibold text-rose-950 font-mono">
                                  {piiCheck.piiItems.map(i => `${i.label} "${i.value}"`).join(', ')}
                                </span>. Hãy khử định danh trước khi tiếp tục sử dụng dữ liệu này với AI.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-200">
                            <span className="text-[11px] font-semibold text-rose-700">
                              Áp dụng ngay Bút xóa PII để thay thế bằng biến giữ chỗ an toàn:
                            </span>
                            <button
                              type="button"
                              onClick={handleAutoSanitizePii}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                              title="Tự động thay thế CCCD, SĐT, STK bằng biến {{BIẾN}}"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                              <span>Tự động Bút xóa PII 1-chạm</span>
                            </button>
                          </div>
                        </div>
                      )}

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

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium transition cursor-pointer"
                          >
                            {showScoreBreakdown ? 'Thu gọn' : 'Xem chi tiết'}
                          </button>
                        </div>
                      </div>

                      {/* 5 tiêu chí Rubric chi tiết (Thang điểm 10 chuẩn mực) */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        {[
                          { label: 'Hoàn thành nhiệm vụ', score: activeAiEval.scores.taskCompletion },
                          { label: 'Độ chuẩn xác / Căn cứ', score: activeAiEval.scores.groundedness },
                          { label: 'Tuân thủ cấu trúc', score: activeAiEval.scores.formatAdherence },
                          { label: 'Tuân thủ ràng buộc', score: activeAiEval.scores.constraintCompliance },
                          { label: 'Tính ứng dụng thực tế', score: activeAiEval.scores.businessUsability },
                        ].map((item, idx) => {
                          const score10 = item.score * 5; // Quy đổi thang điểm 10 chuẩn mực
                          const isPassed = score10 >= 8;
                          const isPartial = score10 >= 5 && score10 < 8;
                          return (
                            <div key={idx} className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/90 flex flex-col justify-between">
                              <div>
                                <span className="text-[11px] text-slate-500 block mb-1 font-medium truncate" title={item.label}>
                                  {item.label}
                                </span>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-slate-900 text-sm">{score10}/10</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isPassed 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : isPartial 
                                      ? 'bg-amber-100 text-amber-800' 
                                      : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {isPassed ? 'Đạt chuẩn' : isPartial ? 'Cần sửa' : 'Chưa đạt'}
                                  </span>
                                </div>
                              </div>
                              {/* Thanh tiến trình vi mô */}
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isPassed ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.max(score10 * 10, 8)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
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
                                <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> Cần cải thiện:
                              </span>
                              <ul className="text-slate-600 pl-4 list-disc space-y-0.5">
                                {activeAiEval.improvements.map((s: string, idx: number) => (
                                  <li key={idx}>{s.replace(/^[🚨✨💡📌\s*]+/, '')}</li>
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

                // Nếu không có kết quả đánh giá AI (hoặc đánh giá lỗi), hiển thị trạng thái lỗi rõ ràng kèm nút "Thử đánh giá lại"
                if (runStatus !== 'evaluating' && !isRetryingEvaluation) {
                  return (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 space-y-3 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-amber-900">
                              AI chưa thể đánh giá lần này.
                            </h4>
                            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                              {evaluationError || 'Hệ thống AI Judge chưa thể hoàn tất chấm điểm cho câu lệnh này do kết nối bị gián đoạn.'}
                            </p>
                            <p className="text-[11px] text-amber-700/80 mt-1">
                              Kết quả sinh văn bản từ AI ở trên vẫn được lưu trữ nguyên vẹn. Bạn có thể bấm nút bên cạnh để thử đánh giá lại mà không cần chạy lại toàn bộ mô hình.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRetryEvaluation}
                          disabled={isRetryingEvaluation || isRunning}
                          className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-200 text-white font-bold text-xs shadow-xs transition"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isRetryingEvaluation ? 'animate-spin' : ''}`} />
                          <span>Thử chấm lại</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
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

      {/* Modal Xác nhận mở khóa Gợi ý / Lời giải */}
      <AssistanceConfirmModal
        isOpen={assistanceModalState.isOpen}
        type={assistanceModalState.type}
        labTitle={currentLab.title}
        labOrder={currentLab.order}
        onConfirm={handleConfirmAssistance}
        onCancel={handleCancelAssistance}
      />
    </div>
  );
};
