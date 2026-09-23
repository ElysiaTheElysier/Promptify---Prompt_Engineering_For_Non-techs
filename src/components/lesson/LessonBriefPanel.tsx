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
    ? `DỮ LIỆU MINH HỌA — chỉ dùng trong hướng dẫn\nNhiệm vụ: ${lab.taskGoal}\nĐịnh dạng mong muốn: ${lab.expectedOutputFormat}`
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
      {/* 1. HEADER CHÍNH CỦA BÀI HỌC */}
      <div className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Nhiệm vụ Bài {lab.order}
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
            <span>Trọng tâm: {lab.focusSkill}</span>
          </p>
        )}
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG 4 TẦNG SƯ PHẠM (PEDAGOGY TAB BAR) */}
      <div className="grid grid-cols-4 bg-slate-100/90 p-1 border-b border-slate-200 text-xs font-semibold select-none">
        {/* Tab 1: Lý thuyết */}
        <button
          type="button"
          onClick={() => setActiveTab('theory')}
          className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'theory'
              ? 'bg-white text-emerald-800 shadow-xs font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          title="Đọc phần lý thuyết nền tảng & ẩn dụ văn phòng trước khi làm"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">Lý thuyết</span>
        </button>

        {/* Tab 2: Bài tập */}
        <button
          type="button"
          data-tour="tour-data-trigger"
          onClick={() => setActiveTab('exercise')}
          className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'exercise'
              ? 'bg-white text-emerald-800 shadow-xs font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          title="Tình huống nghiệp vụ & dữ liệu thực hành"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">Bài tập</span>
        </button>

        {/* Tab 3: Gợi ý (Có badge khóa) */}
        <button
          type="button"
          onClick={() => setActiveTab('hints')}
          className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'hints'
              ? 'bg-white text-amber-800 shadow-xs font-bold border border-amber-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          title="Gợi ý tư duy từng bước (Yêu cầu xác nhận trước khi xem)"
        >
          <Lightbulb className={`w-3.5 h-3.5 shrink-0 ${hasViewedHints ? 'text-amber-500' : 'text-slate-400'}`} />
          <span className="text-[11px] sm:text-xs flex items-center gap-0.5">
            <span>Gợi ý</span>
            {!hasViewedHints && <Lock className="w-2.5 h-2.5 text-slate-400" />}
          </span>
        </button>

        {/* Tab 4: Lời giải (Có badge khóa) */}
        <button
          type="button"
          onClick={() => setActiveTab('solution')}
          className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'solution'
              ? 'bg-white text-rose-800 shadow-xs font-bold border border-rose-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          title="Lời giải chi tiết từng bước & đáp án mẫu (Yêu cầu xác nhận trước khi xem)"
        >
          <KeyRound className={`w-3.5 h-3.5 shrink-0 ${hasViewedSolution ? 'text-rose-600' : 'text-slate-400'}`} />
          <span className="text-[11px] sm:text-xs flex items-center gap-0.5">
            <span>Lời giải</span>
            {!hasViewedSolution && <Lock className="w-2.5 h-2.5 text-rose-400" />}
          </span>
        </button>
      </div>

      {/* 3. NỘI DUNG CUỘN CỦA TAB ĐANG CHỌN (CUSTOM SCROLLBAR DUY NHẤT) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar-light scroll-smooth">
        {/* =================================================================== */}
        {/* TAB 1: LÝ THUYẾT NỀN TẢNG (THEORY)                                  */}
        {/* =================================================================== */}
        {activeTab === 'theory' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Lý thuyết Cốt lõi & Bản chất Kỹ thuật</span>
              </span>
              <span className="text-[10px] text-slate-500 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-semibold border border-emerald-200/60">
                Đọc trước khi làm
              </span>
            </div>

            {/* Khối hiển thị lý thuyết chuẩn sư phạm */}
            <div className="text-slate-700 bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200/80 space-y-3">
              <MarkdownView content={lab.theoryContent || lab.conceptExplanation} size="sm" />
            </div>

            {/* Nút chuyển nhanh sang Bài tập */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('exercise')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <span>Bắt đầu làm bài tập</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: BÀI TẬP THỰC HÀNH (EXERCISE)                                 */}
        {/* =================================================================== */}
        {activeTab === 'exercise' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Tình huống nghiệp vụ */}
            <div className="space-y-1.5 text-sm text-slate-600 leading-6">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tình huống thực tế:</span>
              </span>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-slate-700">
                <MarkdownView content={lab.scenario} size="sm" />
              </div>
            </div>

            {/* Mục tiêu cần đạt */}
            <div className="p-4 bg-emerald-50/80 rounded-xl text-sm text-emerald-950 leading-6 border border-emerald-200/70 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Mục tiêu cần đạt:</span>
              </div>
              <MarkdownView content={lab.taskGoal} size="sm" />
            </div>

            {/* Dữ liệu đầu vào cố định (Control Data) */}
            {tutorialData && (
              <div data-tour="tour-data" className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dữ liệu đầu vào cố định:</span>
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
                    <span>{isDataCopied ? 'Đã sao chép' : 'Sao chép dữ liệu'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800 custom-scrollbar-dark leading-relaxed">
                  {tutorialData}
                </pre>
              </div>
            )}

            {/* Tiêu chí chấm điểm tóm tắt */}
            {lab.rubricCriteria && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                  Tiêu chí chấm điểm (Rubrics):
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

        {/* =================================================================== */}
        {/* TAB 3: GỢI Ý TƯ DUY (HINTS)                                         */}
        {/* =================================================================== */}
        {activeTab === 'hints' && (
          <div className="space-y-4 animate-fadeIn">
            {!hasViewedHints ? (
              /* Trạng thái CHƯA MỞ KHÓA: Khung khóa bảo vệ */
              <div className="p-6 bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl text-center space-y-3.5">
                <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-700 shadow-xs">
                  <Lock className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-950">
                    Gợi ý tư duy đang được khóa
                  </h4>
                  <p className="text-xs text-amber-900/90 max-w-xs mx-auto leading-relaxed">
                    Khuyến khích bạn tự phân tích bài toán trước. Việc mở gợi ý sẽ được lưu lại để Giảng viên đánh giá mức độ tự chủ của bạn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestViewHints}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Mở khóa Gợi ý bài học</span>
                </button>
              </div>
            ) : (
              /* Trạng thái ĐÃ MỞ KHÓA: Hiển thị các gợi ý */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-amber-100">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span>Gợi ý tư duy & Hướng dẫn từng bước</span>
                  </span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Đã mở khóa
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
                    <p className="text-xs text-slate-500 italic">Không có gợi ý bổ sung cho bài này.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: LỜI GIẢI CHI TIẾT (SOLUTION & BREAKDOWN)                     */}
        {/* =================================================================== */}
        {activeTab === 'solution' && (
          <div className="space-y-4 animate-fadeIn">
            {!hasViewedSolution ? (
              /* Trạng thái CHƯA MỞ KHÓA: Khung cảnh báo nghiêm ngặt */
              <div className="p-6 bg-rose-50/70 border-2 border-dashed border-rose-300 rounded-2xl text-center space-y-3.5">
                <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-700 shadow-xs">
                  <KeyRound className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-rose-950">
                    Đáp án mẫu & Lời giải đang được khóa
                  </h4>
                  <p className="text-xs text-rose-900/90 max-w-xs mx-auto leading-relaxed">
                    Hành động này sẽ gắn cờ <strong>"Đã xem đáp án"</strong> vào hồ sơ đánh giá của Giảng viên. Bạn nên thử nghiệm chạy prompt ít nhất 1 lần trước khi mở!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestViewSolution}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Xác nhận mở khóa Lời giải chi tiết</span>
                </button>
              </div>
            ) : (
              /* Trạng thái ĐÃ MỞ KHÓA: Hiển thị câu lệnh mẫu & lời giải từng bước */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-rose-100">
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-rose-600" />
                    <span>Lời giải chi tiết & Câu lệnh mẫu mực</span>
                  </span>
                  <span className="text-[10px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                    Đã xem đáp án
                  </span>
                </div>

                {/* Hộp câu lệnh mẫu hoàn chỉnh */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Câu lệnh mẫu mực (Reference Prompt):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopySolution}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Sao chép toàn bộ câu lệnh mẫu"
                      >
                        {isSolutionCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isSolutionCopied ? 'Đã chép' : 'Sao chép'}</span>
                      </button>

                    </div>
                  </div>

                  <pre className="p-3 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-xl border border-slate-800 whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar-dark leading-relaxed">
                    {lab.improvedPrompt}
                  </pre>
                </div>

                {/* Danh sách phân tích bóc tách từng bước kèm giải thích */}
                {lab.solutionSteps && lab.solutionSteps.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      Phân tích Lời giải theo từng bước (Step-by-step Breakdown):
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

                {/* Hộp đối chiếu Before vs After */}
                {lab.comparisonHighlights && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5 text-xs text-emerald-950">
                    <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-emerald-900">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Vì sao câu lệnh này đạt chuẩn tối đa?</span>
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
