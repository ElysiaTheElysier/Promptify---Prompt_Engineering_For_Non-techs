import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Check, 
  Lightbulb, 
  Info,
  Compass
} from 'lucide-react';
import {
  useFloating,
  offset,
  flip,
  shift,
  arrow,
  autoUpdate,
  FloatingArrow,
  Placement,
} from '@floating-ui/react';
import { UIMode, LabStep } from '../../types';
import { getTutorialSteps, TutorialStep } from '../../services/tutorialConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentMode: UIMode;
  activeLab: LabStep;
}

interface ElementRect {
  left: number;
  top: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

/**
 * Heuristic tính toán hướng ưu tiên ban đầu dựa trên vị trí của target trong viewport:
 * - Target ở góc phải/dưới (như AI Coach) -> ưu tiên 'left' hoặc 'left-end'
 * - Target ở cạnh phải -> ưu tiên 'left'
 * - Target ở nửa dưới -> ưu tiên 'top'
 * - Target ở nửa trên -> ưu tiên 'bottom'
 * - Target ở cạnh trái -> ưu tiên 'right'
 */
function determinePlacementHeuristic(el: HTMLElement | null): Placement {
  if (!el) return 'bottom';
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const isRightSide = centerX > vw * 0.55 || rect.right > vw - 280;
  const isBottomSide = centerY > vh * 0.6 || rect.bottom > vh - 220;
  const isTopSide = rect.top < vh * 0.3;
  const isLeftSide = centerX < vw * 0.45;

  // Trường hợp đặc biệt: AI Coach ở góc phải dưới
  if (isRightSide && isBottomSide) {
    return 'left-end';
  }
  // Target ở cạnh phải
  if (isRightSide) {
    return 'left';
  }
  // Target ở nửa dưới
  if (isBottomSide) {
    return 'top';
  }
  // Target ở nửa trên
  if (isTopSide) {
    return 'bottom';
  }
  // Target ở cạnh trái
  if (isLeftSide) {
    return 'right';
  }

  return 'right';
}

/**
 * Guided Visual Walkthrough với Floating UI:
 * - Scroll target vào giữa viewport trước khi đo đạc
 * - Tự động tính toán hướng tránh va chạm (offset, flip, shift, arrow)
 * - Tuyệt đối không che phủ target (đặc biệt là AI Coach ở góc phải dưới)
 * - Spotlight SVG mask khoét lỗ sáng chính xác, có viền glow xanh emerald
 */
export const GuidedWalkthrough: React.FC<Props> = ({
  isOpen,
  onClose,
  currentMode,
  activeLab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const [isPositionReady, setIsPositionReady] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 640);

  const arrowRef = useRef<SVGSVGElement | null>(null);

  const steps: TutorialStep[] = useMemo(
    () => getTutorialSteps(currentMode, activeLab),
    [currentMode, activeLab]
  );
  const currentStep = steps[currentStepIndex] || steps[0];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isCoachStep = currentStep.targetId === 'tour-coach' || currentStep.id === 'step-coach';

  // Lắng nghe thay đổi kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tính hướng placement ưu tiên cho step hiện tại
  const initialPlacement = useMemo(() => {
    return determinePlacementHeuristic(targetEl);
  }, [targetEl]);

  // Cấu hình Floating UI với các middleware chuyên nghiệp
  const {
    refs,
    floatingStyles,
    context,
    placement,
    update,
  } = useFloating({
    strategy: 'fixed',
    placement: initialPlacement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(20), // Khoảng cách an toàn 20px với target
      flip({
        fallbackPlacements: [
          'left',
          'left-end',
          'left-start',
          'top',
          'top-start',
          'top-end',
          'right',
          'right-start',
          'right-end',
          'bottom',
          'bottom-start',
          'bottom-end',
        ],
        fallbackStrategy: 'bestFit',
        padding: 16,
      }),
      shift({
        padding: 16, // Cách mép màn hình tối thiểu 16px
      }),
      arrow({
        element: arrowRef,
        padding: 16,
      }),
    ],
  });

  // Quy trình: 1. Xác định target -> 2. Scroll target vào giữa -> 3. Lấy rect mới -> 4. Render spotlight + popover
  useEffect(() => {
    if (!isOpen) return;

    setIsPositionReady(false);

    const selector = `[data-tour="${currentStep.targetId}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;

    if (el) {
      setTargetEl(el);

      // Cuộn target vào tầm nhìn trước
      el.scrollIntoView({ 
        behavior: 'smooth', 
        block: isMobile ? 'start' : 'center', 
        inline: 'nearest' 
      });

      // Chờ hiệu ứng scroll hoàn tất (180ms) để lấy tọa độ viewport chuẩn xác nhất
      const timer = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
          });
          refs.setReference(el);
        } else {
          setTargetRect(null);
          refs.setReference(null);
        }
        setIsPositionReady(true);
      }, 180);

      return () => clearTimeout(timer);
    } else {
      setTargetEl(null);
      setTargetRect(null);
      refs.setReference(null);
      setIsPositionReady(true);
    }
  }, [isOpen, currentStepIndex, currentStep.targetId, isMobile, refs]);

  // Cập nhật tọa độ spotlight theo reference khi scroll hoặc resize
  useEffect(() => {
    if (!isOpen || !targetEl) return;

    const handleScrollOrResize = () => {
      const rect = targetEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, targetEl]);

  // Lắng nghe phím tắt điều hướng
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, isLastStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => Math.max(0, prev - 1));
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleComplete = () => {
    onClose();
  };

  // Khoảng đệm bao quanh phần tử spotlight (10px theo yêu cầu)
  const pad = 10;

  // Màu fill của mũi tên Arrow tương ứng với phần viền chạm vào card
  const arrowFill = placement.startsWith('bottom')
    ? '#0F172A' // Chạm vào header dark navy
    : placement.startsWith('top')
    ? '#F8FAFC' // Chạm vào footer light gray
    : '#FFFFFF'; // Chạm vào thân card màu trắng

  const modeLabel = currentMode === 'notebook' 
    ? '📓 Sổ tay tuần tự' 
    : currentMode === 'hybrid' 
    ? '⚡ Tích hợp song song' 
    : '🎛️ Phòng thực nghiệm';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans select-none animate-fadeIn">
      
      {/* =================================================================== */}
      {/* 1. SVG SPOTLIGHT MASK: Làm tối nền và khoét lỗ sáng round-corner   */}
      {/* =================================================================== */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-auto cursor-pointer"
        onClick={handleNext}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* Nền trắng: màu che toàn bộ */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            
            {/* Lỗ khoét đen: trong suốt tại vị trí target */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - pad)}
                y={Math.max(0, targetRect.top - pad)}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Backdrop áp dụng Mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* =================================================================== */}
      {/* 2. VIỀN GLOW SÁNG BAO QUANH TARGET (TUYỆT ĐỐI KHÔNG LÀM BLUR TARGET) */}
      {/* =================================================================== */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.max(0, targetRect.left - pad)}px`,
            top: `${Math.max(0, targetRect.top - pad)}px`,
            width: `${targetRect.width + pad * 2}px`,
            height: `${targetRect.height + pad * 2}px`,
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="rounded-2xl border-2 border-emerald-400 ring-4 ring-emerald-400/30 shadow-[0_0_35px_rgba(16,185,129,0.5)] pointer-events-none z-[60] animate-pulse"
        />
      )}

      {/* =================================================================== */}
      {/* 3. POPOVER THÔNG MINH (FLOATING UI / COLLISION FREE)                */}
      {/* =================================================================== */}
      {isMobile ? (
        /* Layout Mobile / Tablet hẹp: Bottom Sheet cố định, không che target phía trên */
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-4 left-4 right-4 z-[70] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slideUp"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {modeLabel}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Bước {currentStep.stepNumber} / {currentStep.totalSteps}
              </span>
            </div>
            <button onClick={handleSkip} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                {currentStep.stepNumber}
              </span>
              <span>{currentStep.title}</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {currentStep.description}
            </p>
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-xs">
              💡 {currentStep.labAdvice}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button onClick={handleSkip} className="text-xs text-slate-500">Bỏ qua</button>
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button onClick={handlePrev} className="px-3 py-1 rounded-lg border border-slate-300 text-xs">Quay lại</button>
              )}
              <button onClick={handleNext} className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold">
                {isLastStep ? 'Hoàn tất' : 'Tiếp tục'}
              </button>
            </div>
          </div>
        </div>
      ) : targetRect ? (
        /* Layout Desktop: Định vị chính xác qua Floating UI với Arrow */
        <div
          ref={refs.setFloating}
          style={isCoachStep ? {
            position: 'fixed',
            bottom: '92px',
            right: '24px',
            zIndex: 70,
            opacity: isPositionReady ? 1 : 0,
            transition: 'opacity 150ms ease, transform 150ms ease',
          } : {
            ...floatingStyles,
            zIndex: 70,
            opacity: isPositionReady ? 1 : 0,
            transition: 'opacity 150ms ease, transform 150ms ease',
          }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-[390px] w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans animate-scaleIn"
        >
          {/* Mũi tên Arrow của Floating UI chỉ về target (nếu không phải coach step cố định) */}
          {!isCoachStep && (
            <FloatingArrow
              ref={arrowRef}
              context={context}
              fill={arrowFill}
              stroke="#E2E8F0"
              strokeWidth={1}
              width={14}
              height={8}
            />
          )}

          {/* Header Popover */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {modeLabel}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Bước {currentStep.stepNumber} / {currentStep.totalSteps}
              </span>
            </div>

            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="Đóng hướng dẫn (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Thanh tiến trình 8 vạch */}
          <div className="w-full bg-slate-100 h-1 flex flex-shrink-0">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-full transition-all duration-300 ${
                  idx <= currentStepIndex ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Thân Popover (cuộn nội dung bên trong nếu dài) */}
          <div className="p-4 sm:p-5 space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {currentStep.stepNumber}
                </span>
                <span>{currentStep.title}</span>
              </h3>
              
              <p className="text-xs text-slate-600 leading-relaxed pl-8">
                {currentStep.description}
              </p>
            </div>

            {/* Hộp Lời khuyên cụ thể cho bài toán hiện tại */}
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/90 text-emerald-950 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Gợi ý cho {activeLab.title}:</span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed pl-5">
                {currentStep.labAdvice}
              </p>
            </div>

            {/* Chú thích nếu phần tử chưa kích hoạt trong DOM */}
            {currentStep.fallbackNote && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/80 text-amber-900 text-[10px] flex items-start gap-1 leading-tight">
                <Info className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{currentStep.fallbackNote}</span>
              </div>
            )}
          </div>

          {/* Footer Popover */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
            <button
              onClick={handleSkip}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition px-2 py-1"
            >
              Bỏ qua
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
              >
                <span>{isLastStep ? 'Hoàn tất' : 'Tiếp tục'}</span>
                {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback khi không tìm thấy target trong DOM: Nếu là AI Coach thì ở góc phải dưới, còn lại căn giữa */
        <div
          style={isCoachStep ? {
            position: 'fixed',
            bottom: isMobile ? '76px' : '92px',
            right: isMobile ? '12px' : '24px',
            maxWidth: isMobile ? 'calc(100vw - 24px)' : '390px',
            width: isMobile ? 'calc(100vw - 24px)' : '390px',
            zIndex: 70,
          } : {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 70,
          }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-[390px] w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans animate-scaleIn"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {modeLabel}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Bước {currentStep.stepNumber} / {currentStep.totalSteps}
              </span>
            </div>
            <button onClick={handleSkip} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                {currentStep.stepNumber}
              </span>
              <span>{currentStep.title}</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {currentStep.description}
            </p>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-xs">
              💡 {currentStep.labAdvice}
            </div>
            {currentStep.fallbackNote && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{currentStep.fallbackNote}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button onClick={handleSkip} className="text-xs text-slate-500">Bỏ qua</button>
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button onClick={handlePrev} className="px-3 py-1 rounded-lg border border-slate-300 text-xs">Quay lại</button>
              )}
              <button onClick={handleNext} className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold">
                {isLastStep ? 'Hoàn tất' : 'Tiếp tục'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
