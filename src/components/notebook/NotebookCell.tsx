import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Award, 
  ArrowRight,
  Lightbulb,
  CornerDownRight,
  BookmarkPlus,
  Compass
} from 'lucide-react';
import { LabStep, ApiConfig, PromptRun, PromptVersion } from '../../types';
import { executePromptStream, evaluatePromptRubric } from '../../services/llmService';
import { detectPromptComponents, evaluateBusinessMetrics } from '../../services/businessEvaluationService';
import { LearningBadges } from '../common/LearningBadges';
import { MiniChallengeCard } from '../common/MiniChallengeCard';
import { PromptVersionBar } from '../common/PromptVersionBar';
import { ABCompareModal } from '../common/ABCompareModal';
import { SavePromptModal } from '../common/SavePromptModal';
import { MarkdownView } from '../common/MarkdownView';

interface Props {
  lab: LabStep;
  apiConfig: ApiConfig;
  isActive: boolean;
  onActivate: () => void;
  onRecordRun: (run: PromptRun) => void;
  onOpenCompare: (lab: LabStep) => void;
  onPromptChange?: (prompt: string) => void;
  onRunCompleted?: (runCount: number) => void;
  onNextStep?: () => void;
  hasNextStep?: boolean;
  onOpenTutorial?: () => void;
}

export const NotebookCell: React.FC<Props> = ({
  lab,
  apiConfig,
  isActive,
  onActivate,
  onRecordRun,
  onOpenCompare,
  onPromptChange,
  onRunCompleted,
  onNextStep,
  hasNextStep,
  onOpenTutorial,
}) => {
  const [promptInput, setPromptInput] = useState<string>(lab.baselinePrompt);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    lab.systemInstruction || 'Bạn là trợ lý AI chuyên nghiệp hỗ trợ cán bộ ngân hàng Agribank.'
  );
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runCount, setRunCount] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDataCopied, setIsDataCopied] = useState<boolean>(false);

  // Quản lý các phiên bản câu lệnh (Prompt Versioning)
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number>(0);
  const [isABModalOpen, setIsABModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [versionToSave, setVersionToSave] = useState<PromptVersion | null>(null);

  // Accordions (mặc định đóng theo đúng yêu cầu bài toán để giảm visual noise)
  const [showSampleData, setShowSampleData] = useState<boolean>(false);
  const [showHintOrStandardPrompt, setShowHintOrStandardPrompt] = useState<boolean>(false);
  const [showScoreDetails, setShowScoreDetails] = useState<boolean>(false);

  // Kết quả sau khi chạy
  const [scoreResult, setScoreResult] = useState<ReturnType<typeof evaluatePromptRubric> | null>(null);
  const [metrics, setMetrics] = useState<{ tokens: number; latency: number; mode: string } | null>(null);

  // Đồng bộ prompt với parent nếu cần
  const handleTextChange = (text: string) => {
    setPromptInput(text);
    if (onPromptChange) onPromptChange(text);
  };

  // Xác định giai đoạn bài học
  const getStageName = (order: number) => {
    switch (order) {
      case 1: return 'Zero-shot';
      case 2: return 'Structured Prompt';
      case 3: return 'One-shot';
      case 4: return 'Few-shot';
      case 5: return 'Grounding';
      default: return `Bài ${order}`;
    }
  };

  const stageName = getStageName(lab.order);

  // Thực thi Prompt
  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');

    // Đánh giá và chấm điểm
    const evaluatedScore = evaluatePromptRubric(promptInput);
    setScoreResult(evaluatedScore);

    const nextCount = runCount + 1;
    setRunCount(nextCount);
    if (onRunCompleted) onRunCompleted(nextCount);

    try {
      const result = await executePromptStream(
        promptInput,
        systemPrompt,
        lab,
        apiConfig,
        (chunk) => {
          setOutput(chunk);
        }
      );

      setMetrics({
        tokens: result.tokenCount,
        latency: result.latencyMs,
        mode: result.mode
      });

      onRecordRun({
        id: `run-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        labId: lab.id,
        promptText: promptInput,
        systemInstruction: systemPrompt,
        output: result.output,
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
        mode: result.mode,
        versionTag: promptInput.length > 250 ? 'improved' : 'baseline'
      });

      // Tự động tạo và lưu trữ phiên bản lần thử (Prompt Versioning)
      const newVerNum = versions.length + 1;
      const bizEval = evaluateBusinessMetrics(promptInput, result.output, lab.sampleInputContext);
      const newVer: PromptVersion = {
        id: `ver-${lab.id}-${newVerNum}-${Date.now()}`,
        versionNumber: newVerNum,
        labId: lab.id,
        promptText: promptInput,
        systemInstruction: systemPrompt,
        output: result.output,
        techniqueUsed: stageName,
        detectedChanges: detectPromptComponents(promptInput),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        businessEvaluation: bizEval,
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
      };

      setVersions(prev => [...prev, newVer]);
      setSelectedVersionNumber(newVerNum);
    } catch (err) {
      console.error(err);
      setOutput('Đã xảy ra lỗi khi thực thi prompt.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleCopyData = () => {
    if (lab.sampleInputContext) {
      navigator.clipboard.writeText(lab.sampleInputContext);
      setIsDataCopied(true);
      setTimeout(() => setIsDataCopied(false), 1500);
    }
  };

  const handleLoadBaseline = () => {
    handleTextChange(lab.baselinePrompt);
  };

  const handleLoadImproved = () => {
    handleTextChange(lab.improvedPrompt);
  };

  return (
    <section 
      id={lab.id}
      onClick={onActivate}
      className={`scroll-mt-24 transition-all duration-200 border-l-4 pl-4 sm:pl-6 py-2 ${
        isActive 
          ? 'border-emerald-600' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
        {/* 1. HƯỚNG DẪN NGẮN (ĐẦU BÀI & TÌNH HUỐNG) */}
        <div 
          className="p-6 sm:p-7 space-y-4 border-b border-slate-100"
          data-tour={isActive ? "tour-scenario" : undefined}
        >
          {/* Tiêu đề bước & Giai đoạn học tập */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                {lab.order}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {lab.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {stageName}
              </span>

              {onOpenTutorial && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTutorial();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition"
                  title="Xem lại quy trình làm bài (Guided Walkthrough)"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xem lại hướng dẫn</span>
                </button>
              )}
            </div>
          </div>

          {/* Tình huống nghiệp vụ súc tích */}
          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
            <MarkdownView content={lab.scenario} />
          </div>

          {/* Một câu "Bạn cần làm gì" */}
          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/70 text-xs sm:text-sm text-emerald-950 font-medium">
            <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
              <span>🎯 Bạn cần làm gì:</span>
            </div>
            <MarkdownView content={lab.taskGoal} />
          </div>

          {/* Dữ liệu đầu vào cố định (Control Data) */}
          {lab.sampleInputContext && (
            <div 
              data-tour={isActive ? "tour-data" : undefined}
              className="border border-indigo-200/90 rounded-xl overflow-hidden bg-indigo-50/20"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSampleData(!showSampleData);
                }}
                className="w-full px-4 py-2.5 bg-indigo-50/40 hover:bg-indigo-50/80 text-left flex items-center justify-between text-xs font-medium text-slate-800 transition"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-bold text-indigo-950">Dữ liệu đầu vào cố định (Control Data)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                    Cố định qua các lần thử
                  </span>
                </div>
                <div className="flex items-center gap-1 text-indigo-700 text-[11px] font-semibold">
                  <span>{showSampleData ? 'Thu gọn' : 'Xem dữ liệu'}</span>
                  {showSampleData ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {showSampleData && (
                <div className="p-4 bg-white border-t border-indigo-100 space-y-2.5 animate-fadeIn">
                  <p className="text-[11px] text-slate-600 italic bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100/80">
                    💡 <strong>Nguyên lý:</strong> Dữ liệu này được giữ nguyên cố định qua mọi lần thử để bạn quan sát: Cùng một dữ liệu, khi thay đổi cấu trúc câu lệnh thì AI sẽ phản hồi khác nhau như thế nào.
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCopyData}
                      className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-semibold transition"
                    >
                      {isDataCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isDataCopied ? 'Đã sao chép' : 'Sao chép dữ liệu'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-slate-800 bg-slate-50 p-3.5 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {lab.sampleInputContext}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Ô SOẠN THẢO PROMPT (PHẦN THỰC HÀNH CHÍNH) */}
        <div 
          className="p-6 sm:p-7 space-y-4 bg-white"
          data-tour={isActive ? "tour-prompt" : undefined}
        >
          {/* Thanh tiêu đề ô Prompt: Nhãn Prompt + Lần thử + Nút xem gợi ý */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                Prompt
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                runCount === 0 
                  ? 'bg-slate-100 text-slate-500' 
                  : runCount === 1 
                  ? 'bg-amber-100 text-amber-900' 
                  : 'bg-emerald-100 text-emerald-900'
              }`}>
                {runCount === 0 ? 'Chưa chạy' : `Lần thử ${runCount}`}
              </span>
            </div>

            {/* Chỉ mở prompt chuẩn / gợi ý sau khi user đã chạy ít nhất 1 lần HOẶC chủ động bấm "Xem gợi ý" */}
            <div className="flex items-center gap-2 text-xs">
              {runCount === 0 && !showHintOrStandardPrompt ? (
                <button
                  type="button"
                  onClick={() => setShowHintOrStandardPrompt(true)}
                  className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Xem gợi ý & Prompt mẫu</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-fadeIn">
                  <button
                    type="button"
                    onClick={handleLoadBaseline}
                    className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    title="Nạp lại câu lệnh sơ sài ban đầu"
                  >
                    Nạp lại Prompt thô
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadImproved}
                    className="text-[11px] px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold transition flex items-center gap-1"
                    title="Nạp cấu trúc câu lệnh chuẩn hóa"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Nạp Prompt chuẩn</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Khung Gợi ý nếu đã mở */}
          {showHintOrStandardPrompt && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 space-y-1.5 animate-fadeIn">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span>Gợi ý cho bài này:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 pl-1">
                {lab.hints.map((hint, idx) => (
                  <li key={idx}>{hint}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Thanh chuyển đổi phiên bản câu lệnh (Lần thử 1 | Lần thử 2 | Lần thử 3...) */}
          {versions.length > 0 && (
            <PromptVersionBar
              versions={versions}
              selectedVersionNumber={selectedVersionNumber}
              onSelectVersion={(vNum) => setSelectedVersionNumber(vNum)}
              onRestorePrompt={(restored) => handleTextChange(restored)}
              onOpenCompare={() => setIsABModalOpen(true)}
              onSaveToLibrary={(ver) => {
                setVersionToSave(ver);
                setIsSaveModalOpen(true);
              }}
            />
          )}

          {/* Textarea Prompt (Monospace duy nhất ở vùng soạn thảo) */}
          <div className="relative">
            <textarea
              rows={6}
              value={promptInput}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (!isRunning && promptInput.trim()) handleRun();
                }
              }}
              placeholder="Nhập câu lệnh của bạn vào đây (ví dụ: Bạn là chuyên viên... Hãy phân tích...)..."
              className="w-full p-4 font-mono text-xs sm:text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900 leading-relaxed transition"
            />
          </div>

          {/* Huy hiệu học tập nhận diện trực tiếp từ prompt */}
          <LearningBadges promptText={promptInput} runCount={runCount} />

          {/* 3. NÚT CHẠY PROMPT */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-400 font-mono">
              {promptInput.length} ký tự · Nhấn <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-600 text-[10px]">Ctrl + Enter</kbd> để chạy
            </span>

            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning || !promptInput.trim()}
              data-tour={isActive ? "tour-run" : undefined}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
              <span>{isRunning ? 'Đang chạy prompt...' : 'Chạy prompt'}</span>
            </button>
          </div>
        </div>

        {/* 4. KẾT QUẢ TỪ AI (XUẤT HIỆN SAU KHI CHẠY) */}
        {(output || isRunning || (selectedVersionNumber > 0 && versions.length > 0)) && (
          <div 
            className="p-6 sm:p-7 space-y-4 bg-slate-50/40 border-t border-slate-100 animate-fadeIn"
            data-tour={isActive ? "tour-output" : undefined}
          >
            {/* Header Kết Quả */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Kết quả
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  (Lần thử {selectedVersionNumber > 0 ? selectedVersionNumber : runCount})
                </span>

                {/* Nút lưu nhanh version này vào thư viện Prompt */}
                {selectedVersionNumber > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const ver = versions.find(v => v.versionNumber === selectedVersionNumber);
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
                  type="button"
                  onClick={handleCopyOutput}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Đã sao chép' : 'Sao chép kết quả'}</span>
                </button>
              )}
            </div>

            {/* Khung Kết Quả (Monospace) */}
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed overflow-x-auto min-h-[120px]">
              {isRunning ? (
                <div className="flex items-center gap-2 text-slate-500 py-4 font-sans">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Mô hình AI đang phản hồi...</span>
                </div>
              ) : (selectedVersionNumber > 0 ? versions.find(v => v.versionNumber === selectedVersionNumber)?.output : output) ? (
                <div className="text-xs sm:text-sm leading-relaxed">
                  <MarkdownView 
                    content={selectedVersionNumber > 0 
                      ? (versions.find(v => v.versionNumber === selectedVersionNumber)?.output || output) 
                      : output} 
                  />
                </div>
              ) : (
                <div className="text-slate-400 py-2 text-xs">
                  Chưa có kết quả phản hồi.
                </div>
              )}
            </div>

            {/* 5. QUAN SÁT & RÚT RA (CHẤM ĐIỂM + BÀI HỌC THỰC TIỄN) */}
            {scoreResult && (
              <div className="bg-white rounded-xl p-4 border border-slate-200/90 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Đánh giá chất lượng:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                      scoreResult.totalScore >= 80 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : scoreResult.totalScore >= 50 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {scoreResult.totalScore} / 100 điểm
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowScoreDetails(!showScoreDetails)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    {showScoreDetails ? 'Thu gọn tiêu chí' : 'Xem tiêu chí đánh giá'}
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  💡 <strong>Rút ra:</strong> {scoreResult.actionableAdvice}
                </p>

                {showScoreDetails && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700 block">1. Rõ vai trò ({scoreResult.personaScore}/20)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{scoreResult.personaNote}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700 block">2. Cụ thể nhiệm vụ ({scoreResult.taskScore}/20)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{scoreResult.taskNote}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700 block">3. Ràng buộc rủi ro ({scoreResult.guardrailsScore}/20)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{scoreResult.guardrailsNote}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700 block">4. Định dạng đầu ra ({scoreResult.formatScore}/20)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{scoreResult.formatNote}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mini Challenge tùy chọn ở cuối bài */}
            <MiniChallengeCard
              challenge={lab.miniChallenge}
              onApplyChallengePrompt={(starter) => handleTextChange(starter)}
            />

            {/* 7. BƯỚC TIẾP THEO (NÚT CHUYỂN BÀI) */}
            {hasNextStep && onNextStep && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onNextStep}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm"
                >
                  <span>Sang bước tiếp theo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Đối chiếu A/B với Business Metrics & Self-check */}
      <ABCompareModal
        isOpen={isABModalOpen}
        onClose={() => setIsABModalOpen(false)}
        lab={lab}
        versions={versions}
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
          lab={lab}
          version={versionToSave}
        />
      )}
    </section>
  );
};
