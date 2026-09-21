import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitCompare, 
  Sparkles, 
  BookmarkPlus, 
  ChevronRight,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  FileCheck,
  Check,
  TrendingUp,
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
 * Compare Mode theo phong cách Google AI Studio dành cho Business Users:
 * - 2 cột song song Before vs After (cuộn độc lập từng cột)
 * - Tự động fallback sang layout stacked trên màn hình nhỏ
 * - 3 phần rõ ràng: 
 *    A. So sánh Prompt (highlight 6 thành phần: Role, Context, Task, Constraint, Format, Example)
 *    B. So sánh Output (render Markdown chuẩn bảng biểu & danh sách)
 *    C. Nhận xét / Learning Insight (Prompt thay đổi gì, Output cải thiện gì, Vì sao tốt hơn, Bài học)
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
  // Chọn 2 version để so sánh (mặc định là lần trước và lần hiện tại)
  const defaultBefore = initialBeforeIndex !== undefined && versions[initialBeforeIndex]
    ? initialBeforeIndex
    : Math.max(0, versions.length - 2);
  const defaultAfter = initialAfterIndex !== undefined && versions[initialAfterIndex]
    ? initialAfterIndex
    : Math.max(0, versions.length - 1);

  const [beforeIdx, setBeforeIdx] = useState<number>(defaultBefore);
  const [afterIdx, setAfterIdx] = useState<number>(defaultAfter);

  // Tab chuyển đổi hoặc xem chi tiết Self-check
  const [showSelfCheck, setShowSelfCheck] = useState<boolean>(false);

  // Cập nhật khi props versions thay đổi
  useEffect(() => {
    if (versions.length >= 2) {
      setBeforeIdx(Math.max(0, versions.length - 2));
      setAfterIdx(Math.max(0, versions.length - 1));
    }
  }, [versions.length]);

  // Lấy dữ liệu Before & After
  const beforeVer = versions[beforeIdx] || {
    id: 'v-before-mock',
    versionNumber: 1,
    labId: lab.id,
    promptText: lab.baselinePrompt,
    output: lab.simulatedBaselineOutput,
    techniqueUsed: 'Prompt thô ban đầu',
    detectedChanges: detectPromptComponents(lab.baselinePrompt),
    timestamp: 'Ban đầu',
    businessEvaluation: evaluateBusinessMetrics(lab.baselinePrompt, lab.simulatedBaselineOutput, lab.sampleInputContext),
  };

  const afterVer = versions[afterIdx] || {
    id: 'v-after-mock',
    versionNumber: 2,
    labId: lab.id,
    promptText: lab.improvedPrompt,
    output: lab.simulatedImprovedOutput,
    techniqueUsed: 'Prompt cải tiến',
    detectedChanges: detectPromptComponents(lab.improvedPrompt),
    timestamp: 'Gần nhất',
    businessEvaluation: evaluateBusinessMetrics(lab.improvedPrompt, lab.simulatedImprovedOutput, lab.sampleInputContext),
  };

  // State Self-check
  const [selfCheck, setSelfCheck] = useState<BusinessEvaluation>(() => afterVer.businessEvaluation);

  useEffect(() => {
    setSelfCheck(afterVer.businessEvaluation);
  }, [afterIdx, afterVer]);

  // Đóng bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 6 Thành phần cấu trúc Prompt
  const bComp = detectPromptComponents(beforeVer.promptText);
  const aComp = detectPromptComponents(afterVer.promptText);

  const promptComponents = [
    {
      key: 'Role',
      label: 'Vai trò chuyên môn (Role)',
      desc: 'Chỉ định vị trí nghiệp vụ cho AI',
      before: bComp.hasRole,
      after: aComp.hasRole,
    },
    {
      key: 'Context',
      label: 'Ngữ cảnh hồ sơ (Context)',
      desc: 'Bối cảnh vụ việc, dữ liệu khách hàng',
      before: bComp.hasContext,
      after: aComp.hasContext,
    },
    {
      key: 'Task',
      label: 'Nhiệm vụ cụ thể (Task)',
      desc: 'Yêu cầu hành động rõ ràng',
      before: bComp.hasTask,
      after: aComp.hasTask,
    },
    {
      key: 'Constraint',
      label: 'Ràng buộc an toàn (Constraint)',
      desc: 'Quy tắc rủi ro, không tự bịa số liệu',
      before: bComp.hasConstraint,
      after: aComp.hasConstraint,
    },
    {
      key: 'Format',
      label: 'Định dạng đầu ra (Output Format)',
      desc: 'Yêu cầu bảng biểu Markdown hoặc danh sách',
      before: bComp.hasFormat,
      after: aComp.hasFormat,
    },
    {
      key: 'Example',
      label: 'Ví dụ / Căn cứ (Example / Evidence)',
      desc: 'Trích dẫn mẫu hoặc tài liệu đối chiếu',
      before: bComp.hasExample || bComp.hasGrounding,
      after: aComp.hasExample || aComp.hasGrounding,
    },
  ];

  // Learning Insight súc tích
  const learningInsight = generateLearningInsight(
    beforeVer.promptText,
    afterVer.promptText,
    beforeVer.output,
    afterVer.output,
    lab.comparisonHighlights
  );

  // 5 Tiêu chí Đánh giá Nghiệp vụ
  const businessCriteria = [
    {
      key: 'formatAdherence',
      title: 'Đúng định dạng (Format Adherence)',
      desc: 'Kết quả có đúng bảng dữ liệu hoặc gạch đầu dòng theo yêu cầu không?',
      checked: selfCheck.formatAdherence,
    },
    {
      key: 'completeness',
      title: 'Đầy đủ ý quan trọng (Completeness)',
      desc: 'Bao quát đủ các khía cạnh cần giải quyết trong bài toán?',
      checked: selfCheck.completeness,
    },
    {
      key: 'actionability',
      title: 'Khả năng ứng dụng (Actionability)',
      desc: 'Có phương án/kiến nghị cụ thể để cán bộ dùng ngay được không?',
      checked: selfCheck.actionability,
    },
    {
      key: 'groundedness',
      title: 'Dựa trên dữ liệu gốc (Groundedness)',
      desc: 'Các số liệu và kết luận bám sát dữ liệu kiểm soát cố định?',
      checked: selfCheck.groundedness,
    },
    {
      key: 'toneFit',
      title: 'Văn phong chuẩn mực (Tone Fit)',
      desc: 'Ngôn từ khách quan, trang trọng, phù hợp môi trường ngân hàng?',
      checked: selfCheck.toneFit,
    },
  ];

  const totalPassed = Object.values(selfCheck).filter(val => val === true).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden">
        
        {/* =================================================================== */}
        {/* HEADER MODAL: Phong cách Google AI Studio Compare Mode              */}
        {/* =================================================================== */}
        <div className="bg-slate-900 text-white px-5 sm:px-7 py-3.5 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base tracking-tight">
                  So Sánh Tiến Bộ (Compare Mode)
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Side-by-Side View
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lab.title} · Cùng dữ liệu kiểm soát cố định qua các lần thử
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bộ chọn Version nhanh nếu có nhiều hơn 2 version */}
            {versions.length > 2 && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400 text-[11px]">Bản trước:</span>
                <select
                  value={beforeIdx}
                  onChange={(e) => setBeforeIdx(Number(e.target.value))}
                  className="bg-slate-900 text-slate-200 rounded px-1.5 py-0.5 font-semibold text-xs border border-slate-700 focus:outline-none"
                >
                  {versions.map((v, i) => (
                    <option key={v.id || i} value={i}>
                      Lần thử {v.versionNumber}
                    </option>
                  ))}
                </select>

                <ChevronRight className="w-3 h-3 text-slate-500" />

                <span className="text-emerald-400 text-[11px] font-semibold">Bản sau:</span>
                <select
                  value={afterIdx}
                  onChange={(e) => setAfterIdx(Number(e.target.value))}
                  className="bg-slate-900 text-emerald-300 rounded px-1.5 py-0.5 font-bold text-xs border border-emerald-500/50 focus:outline-none"
                >
                  {versions.map((v, i) => (
                    <option key={v.id || i} value={i}>
                      Lần thử {v.versionNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Đóng cửa sổ đối chiếu (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* NỘI DUNG CUỘN CHÍNH (GỒM 3 PHẦN: A. PROMPT, B. OUTPUT, C. INSIGHT) */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ================================================================= */}
          {/* PHẦN A: SO SÁNH PROMPT (Prompt cũ vs Prompt mới + Highlight 6 TP) */}
          {/* ================================================================= */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                  A
                </span>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                  So sánh câu lệnh Prompt (Trước vs Sau)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Nhận diện 6 thành phần: Role, Context, Task, Constraint, Format, Example
              </span>
            </div>

            {/* Bảng nhận diện 6 thành phần cấu trúc */}
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
                          + Mới thêm
                        </span>
                      ) : isAlreadyPresent ? (
                        <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap">
                          ✓ Đã có
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 whitespace-nowrap">
                          Chưa có
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

            {/* 2 Cột Prompt Song Song (Desktop: 2 cột, Mobile: Stacked) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              
              {/* CỘT TRÁI: Prompt Lần thử trước (Before) */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold text-slate-700">
                      Cột Trái: Lần thử {beforeVer.versionNumber} (Prompt ban đầu)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {beforeVer.promptText.length} ký tự
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Câu lệnh ban đầu còn sơ sài, ít ràng buộc:
                </p>

                <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3 max-h-48 overflow-y-auto">
                  <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {beforeVer.promptText}
                  </pre>
                </div>
              </div>

              {/* CỘT PHẢI: Prompt Lần thử hiện tại (After) */}
              <div className="bg-emerald-50/40 rounded-2xl border border-emerald-300 p-4 space-y-2 flex flex-col shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">
                      Cột Phải: Lần thử {afterVer.versionNumber} (Prompt đã tối ưu)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono font-medium">
                    {afterVer.promptText.length} ký tự
                  </span>
                </div>

                {/* Chips thành phần mới thêm */}
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
          {/* PHẦN B: SO SÁNH OUTPUT (Scroll riêng từng cột + MarkdownView)      */}
          {/* ================================================================= */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                  B
                </span>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                  So sánh Kết quả Output từ AI (Cuộn độc lập & Chuẩn Markdown)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Mỗi cột có thanh cuộn riêng để bạn thoải mái đối chiếu số liệu
              </span>
            </div>

            {/* 2 Cột Output Song Song (Desktop: 2 cột, Mobile: Stacked) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              
              {/* OUTPUT CỘT TRÁI (BEFORE) */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Output Lần thử {beforeVer.versionNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                      Chưa cấu trúc
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Cuộn riêng biệt ↕
                  </span>
                </div>

                <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 max-h-[380px] overflow-y-auto leading-relaxed">
                  <MarkdownView content={beforeVer.output || 'Chưa có kết quả.'} />
                </div>
              </div>

              {/* OUTPUT CỘT PHẢI (AFTER) */}
              <div className="bg-emerald-50/40 rounded-2xl border border-emerald-300 p-4 space-y-2 flex flex-col shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">
                      Output Lần thử {afterVer.versionNumber} (Đã cải tiến)
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded border border-emerald-300">
                      Bảng biểu & Cấu trúc
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                    Cuộn riêng biệt ↕
                  </span>
                </div>

                <div className="flex-1 bg-white rounded-xl border border-emerald-200 p-4 max-h-[380px] overflow-y-auto leading-relaxed shadow-inner">
                  <MarkdownView content={afterVer.output} />
                </div>
              </div>

            </div>
          </section>

          {/* ================================================================= */}
          {/* PHẦN C: NHẬN XÉT / LEARNING INSIGHT (Tóm tắt dễ hiểu cho học viên) */}
          {/* ================================================================= */}
          <section className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                  C
                </span>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Nhận xét & Góc nhìn học tập (Learning Insight)</span>
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setShowSelfCheck(!showSelfCheck)}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition"
              >
                <span>{showSelfCheck ? 'Thu gọn Tiêu chuẩn nghiệp vụ' : 'Xem 5 Tiêu chuẩn Nghiệp vụ & Self-check'}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showSelfCheck ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* 4 Câu hỏi insight cốt lõi */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* 1. Prompt đã thay đổi gì */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">1</span>
                  <span>Prompt đã thay đổi gì?</span>
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

              {/* 2. Output đã cải thiện gì */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">2</span>
                  <span>Output đã cải thiện gì?</span>
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

              {/* 3. Vì sao tốt hơn */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">3</span>
                  <span>Vì sao tốt hơn?</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {learningInsight.whyBetter}
                </p>
              </div>

              {/* 4. Bài học rút ra */}
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Bài học rút ra</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                  {learningInsight.takeaway}
                </p>
              </div>

            </div>

            {/* Mở rộng: 5 Tiêu chuẩn Nghiệp vụ & Self-check */}
            {showSelfCheck && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>5 Tiêu Chuẩn Nghiệp Vụ Ngân Hàng (Business Evaluation Checklist)</span>
                  </h5>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    totalPassed >= 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {totalPassed} / 5 Tiêu chí Đạt
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
                          {c.checked ? 'Xác nhận Đạt' : 'Chưa đạt'}
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
        {/* FOOTER MODAL: NÚT LƯU VÀO SOP VÀ ĐÓNG                               */}
        {/* =================================================================== */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              So sánh hoàn tất: Lần thử {afterVer.versionNumber} cải tiến vượt bậc so với Lần thử {beforeVer.versionNumber}.
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs transition shadow-2xs"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
                <span>Lưu Lần thử {afterVer.versionNumber} vào Thư viện Prompt</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              Đóng đối chiếu
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
