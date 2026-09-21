import React, { useState, useEffect } from 'react';
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
  Compass
} from 'lucide-react';
import { LabStep, ApiConfig, PromptRun, PromptVersion } from '../../types';
import { executePromptStream, evaluatePromptRubric } from '../../services/llmService';
import { detectPromptComponents, evaluateBusinessMetrics } from '../../services/businessEvaluationService';
import { InlineCompareCard } from '../common/InlineCompareCard';
import { LearningBadges } from '../common/LearningBadges';
import { MiniChallengeCard } from '../common/MiniChallengeCard';
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
}

export const HybridView: React.FC<Props> = ({
  labs,
  apiConfig,
  onRecordRun,
  onOpenCompare,
  onActiveContextChange,
  onOpenTutorial,
  initialLabId,
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

  // Trạng thái ô nhập liệu & kết quả
  const [promptText, setPromptText] = useState<string>(currentLab.baselinePrompt);
  const [systemText, setSystemText] = useState<string>(currentLab.systemInstruction || 'Bạn là trợ lý AI chuyên nghiệp hỗ trợ cán bộ ngân hàng Agribank.');
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDataCopied, setIsDataCopied] = useState<boolean>(false);

  // Accordions (mặc định đóng theo đúng yêu cầu để giảm visual noise)
  const [showDataAccordion, setShowDataAccordion] = useState<boolean>(false);
  const [showHintsAccordion, setShowHintsAccordion] = useState<boolean>(false);
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

  // Đồng bộ khi chuyển bài lab
  useEffect(() => {
    setPromptText(currentLab.baselinePrompt);
    setSystemText(currentLab.systemInstruction || 'Bạn là trợ lý AI chuyên nghiệp hỗ trợ cán bộ ngân hàng Agribank.');
    setOutput('');
    setScoreResult(null);
    setMetrics(null);
    setCurrentStep(1);
    setSelectedVersionNumber(0);
    setShowDataAccordion(false);
    setShowHintsAccordion(false);
    setShowAdvancedSettings(false);
    setShowTechDetails(false);
    setShowScoreBreakdown(false);
  }, [currentLabIndex]);

  // Cập nhật ngữ cảnh ra ngoài cho AI Coach
  useEffect(() => {
    if (onActiveContextChange) {
      onActiveContextChange(currentLab, promptText, currentLabRunCount);
    }
  }, [currentLab.id, promptText, currentLabRunCount]);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');

    // Tăng số lượt chạy của bài lab hiện tại
    setRunCountsByLab(prev => ({
      ...prev,
      [currentLab.id]: (prev[currentLab.id] || 0) + 1
    }));

    // Đánh giá và chấm điểm prompt
    const evaluatedScore = evaluatePromptRubric(promptText);
    setScoreResult(evaluatedScore);

    try {
      const result = await executePromptStream(
        promptText,
        systemText,
        currentLab,
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

      // Cập nhật bước tiến trình nếu đang ở bước 1
      if (currentStep === 1) {
        setCurrentStep(2);
      } else if (currentStep === 2 && evaluatedScore.totalScore >= 70) {
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

      // Tự động tạo và lưu trữ phiên bản lần thử (Prompt Versioning)
      const labVers = versionsByLab[currentLab.id] || [];
      const newVerNum = labVers.length + 1;
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
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
      };

      setVersionsByLab(prev => ({
        ...prev,
        [currentLab.id]: [...(prev[currentLab.id] || []), newVer]
      }));
      setSelectedVersionNumber(newVerNum);
    } catch (err) {
      console.error(err);
      setOutput('Đã xảy ra lỗi khi thực thi. Vui lòng thử lại.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleNextStepOrLab = () => {
    if (currentStep === 1) {
      // Chuyển sang nạp gợi ý cải tiến cho bước 2
      setPromptText(currentLab.improvedPrompt);
      setCurrentStep(2);
      setOutput('');
      setScoreResult(null);
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

          {/* Nút hành động (Tiếp tục) */}
          <div className="flex items-center gap-2.5">
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
        {/* CỘT TRÁI (35%): CHỈ GIỮ "BƯỚC ĐANG LÀM" - STICKY DESKTOP */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4" data-tour="tour-scenario">
            {/* Tiêu đề bài */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider font-mono">
                Nhiệm vụ Bài {currentLab.order}
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                {currentLab.title}
              </h2>
            </div>

            {/* Tình huống ngắn */}
            <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800 block">Tình huống:</span>
              <p>{currentLab.scenario}</p>
            </div>

            {/* Một câu "Bạn cần làm gì" */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-800 leading-relaxed">
              <strong className="text-slate-900">Bạn cần làm gì:</strong> {currentLab.taskGoal}
            </div>

            {/* Accordion "Dữ liệu đầu vào cố định (Control Data)" */}
            {currentLab.sampleInputContext && (
              <div 
                data-tour="tour-data"
                className="border-t border-slate-100 pt-3"
              >
                <button
                  onClick={() => setShowDataAccordion(!showDataAccordion)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Dữ liệu đầu vào cố định</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="hidden sm:inline">{showDataAccordion ? 'Thu gọn' : 'Xem dữ liệu'}</span>
                    {showDataAccordion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {showDataAccordion && (
                  <div className="mt-2 space-y-2 animate-fadeIn bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80">
                    <p className="text-[11px] text-slate-500 italic leading-relaxed">
                      💡 <strong>Nguyên lý:</strong> Dữ liệu này được giữ nguyên cố định qua mọi lần thử để bạn thấy rõ: Cùng một dữ liệu, khi sửa prompt thì output sẽ thay đổi tương ứng.
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={handleCopySampleData}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {isDataCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {isDataCopied ? 'Đã sao chép' : 'Sao chép dữ liệu'}
                      </button>
                    </div>
                    <pre className="p-2.5 bg-white rounded-md text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-200">
                      {currentLab.sampleInputContext}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Accordion "Gợi ý & Mẹo viết prompt" (Mặc định đóng) */}
            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowHintsAccordion(!showHintsAccordion)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  Gợi ý & Mẹo nâng cấp ({showHintsAccordion ? 'Thu gọn' : 'Bấm để xem'})
                </span>
                {showHintsAccordion ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showHintsAccordion && (
                <div className="mt-2 space-y-2 text-xs text-slate-600 animate-fadeIn">
                  <p className="italic text-slate-700 bg-slate-50 p-2 rounded">
                    "{currentLab.conceptExplanation}"
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                    {currentLab.hints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (65%): TẬP TRUNG HOÀN TOÀN VÀO THỰC HÀNH */}
        <div className="lg:col-span-8 space-y-5">
          {/* Vùng soạn thảo Prompt chính */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4" data-tour="tour-prompt">
            {/* Header của ô thực hành */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Soạn thảo Câu lệnh (Prompt)
              </h3>

              {/* Nút nạp nhanh tinh tế, không lấn át */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setPromptText(currentLab.baselinePrompt)}
                  className="text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Nạp prompt sơ sài ban đầu"
                >
                  Nạp câu lệnh thô
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setPromptText(currentLab.improvedPrompt)}
                  className="text-emerald-700 hover:text-emerald-900 font-medium transition cursor-pointer"
                  title="Nạp prompt đã thêm cấu trúc chuẩn"
                >
                  Nạp câu lệnh chuẩn
                </button>
              </div>
            </div>

            {/* Thanh chuyển đổi phiên bản câu lệnh (Lần thử 1 | Lần thử 2 | Lần thử 3...) */}
            {currentLabVersions.length > 0 && (
              <PromptVersionBar
                versions={currentLabVersions}
                selectedVersionNumber={selectedVersionNumber}
                onSelectVersion={(vNum) => setSelectedVersionNumber(vNum)}
                onRestorePrompt={(restored) => setPromptText(restored)}
                onOpenCompare={() => setIsABModalOpen(true)}
                onSaveToLibrary={(ver) => {
                  setVersionToSave(ver);
                  setIsSaveModalOpen(true);
                }}
              />
            )}

            {/* Ô Prompt lớn là thành phần chính */}
            <textarea
              rows={8}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Nhập câu lệnh của bạn tại đây..."
              className="w-full p-3.5 text-xs sm:text-sm font-mono text-slate-900 bg-slate-50/50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed transition"
            />

            {/* Huy hiệu học tập nhận diện trực tiếp từ prompt */}
            <LearningBadges promptText={promptText} runCount={currentLabRunCount} />

            {/* Thiết lập nâng cao (Mặc định đóng) */}
            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-xs font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Thiết lập nâng cao (Vai trò hệ thống)</span>
                {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvancedSettings && (
                <div className="mt-2.5 p-3 bg-slate-50 rounded-lg space-y-1.5 animate-fadeIn border border-slate-200/70">
                  <label className="text-xs font-medium text-slate-700 block">
                    Vai trò hệ thống (Chỉ dẫn ngầm cho AI):
                  </label>
                  <input
                    type="text"
                    value={systemText}
                    onChange={(e) => setSystemText(e.target.value)}
                    placeholder="Ví dụ: Bạn là chuyên viên phân tích ngân hàng..."
                    className="w-full px-3 py-2 text-xs bg-white rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Một CTA chính duy nhất: CHẠY PROMPT */}
            <button
              onClick={handleRun}
              disabled={isRunning || !promptText.trim()}
              data-tour="tour-run"
              className="w-full py-3 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
              <span>{isRunning ? 'Đang chạy câu lệnh...' : 'Chạy Prompt'}</span>
            </button>
          </div>

          {/* VÙNG KẾT QUẢ SAU KHI RUN HOẶC KHI CHỌN VERSION */}
          {(output || isRunning || (selectedVersionNumber > 0 && currentLabVersions.length > 0)) && (
            <div className="space-y-4 animate-fadeIn">
              {/* Output xuất hiện ngay dưới prompt */}
              <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 space-y-3" data-tour="tour-output">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
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
                        className="text-[11px] font-semibold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300 transition flex items-center gap-1 cursor-pointer"
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
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Đã sao chép' : 'Sao chép kết quả'}</span>
                    </button>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed overflow-x-auto min-h-[140px]">
                  {isRunning ? (
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

              {/* Đối chiếu Trước & Sau: Tự động xuất hiện sau khi user đã chạy ít nhất 2 lần trong cùng một bài */}
              <InlineCompareCard
                lab={currentLab}
                runCount={currentLabRunCount}
                currentPrompt={promptText}
                onOpenFullCompare={() => setIsABModalOpen(true)}
              />

              {/* Mini Challenge tùy chọn ở cuối bài */}
              <MiniChallengeCard
                challenge={currentLab.miniChallenge}
                onApplyChallengePrompt={(promptStarter) => {
                  setPromptText(promptStarter);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />

              {/* Card chấm điểm nhỏ phía dưới output */}
              {scoreResult && (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Đánh giá chất lượng Prompt:
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
                      onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      {showScoreBreakdown ? 'Thu gọn' : 'Xem tiêu chí'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    {scoreResult.actionableAdvice}
                  </p>

                  {/* Chi tiết 5 tiêu chí nếu mở */}
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
              )}
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
