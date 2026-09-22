import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Check, 
  Lightbulb, 
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
  Placement
} from '@floating-ui/react';
import { InstructorViewMode } from '../../types/instructor';
import { INSTRUCTOR_TUTORIAL_DATA, InstructorSpotlightStep } from '../../services/instructorTutorialConfig';

interface Props {
  isOpen: boolean;
  currentView: InstructorViewMode;
  onClose: () => void;
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
 * Heuristic tính toán hướng placement ưu tiên của Tooltip dựa theo vị trí của target:
 * - Nếu target ở cạnh phải -> ưu tiên 'left'
 * - Nếu target ở cạnh trái -> ưu tiên 'right'
 * - Nếu target ở nửa dưới -> ưu tiên 'top'
 * - Nếu target ở nửa trên -> ưu tiên 'bottom'
 */
function determinePlacementHeuristic(el: HTMLElement | null): Placement {
  if (!el) return 'bottom';
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const isRightSide = centerX > vw * 0.6 || rect.right > vw - 320;
  const isLeftSide = centerX < vw * 0.4;
  const isBottomSide = centerY > vh * 0.65;
  const isTopSide = centerY < vh * 0.35;

  if (isRightSide) return 'left';
  if (isLeftSide) return 'right';
  if (isBottomSide) return 'top';
  if (isTopSide) return 'bottom';

  return 'bottom';
}

export const InstructorWalkthrough: React.FC<Props> = ({
  isOpen,
  currentView,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const [isPositionReady, setIsPositionReady] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 640);

  const arrowRef = useRef<SVGSVGElement | null>(null);

  const tourConfig = INSTRUCTOR_TUTORIAL_DATA[currentView] || INSTRUCTOR_TUTORIAL_DATA.dashboard;
  const steps: InstructorSpotlightStep[] = tourConfig.steps;
  const currentStep = steps[currentStepIndex] || steps[0];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Reset về bước 1 mỗi khi mở walkthrough hoặc đổi tab
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, currentView]);

  // Lắng nghe thay đổi kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tính hướng placement ưu tiên
  const initialPlacement = useMemo(() => {
    return determinePlacementHeuristic(targetEl);
  }, [targetEl]);

  // Cấu hình Floating UI
  const {
    refs,
    floatingStyles,
    context,
    placement,
  } = useFloating({
    placement: initialPlacement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(18), // Khoảng cách an toàn 18px với target
      flip({
        fallbackPlacements: [
          'bottom',
          'bottom-start',
          'bottom-end',
          'top',
          'top-start',
          'top-end',
          'left',
          'left-start',
          'left-end',
          'right',
          'right-start',
          'right-end'
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

  // Quy trình: 1. Tìm target element -> 2. Auto-scroll mượt -> 3. Bắt tọa độ -> 4. Chiếu spotlight
  useEffect(() => {
    if (!isOpen) return;

    setIsPositionReady(false);

    const selector = `[data-tour="${currentStep.targetId}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;

    if (el) {
      setTargetEl(el);

      // Auto-scroll mượt mà target vào giữa viewport
      el.scrollIntoView({ 
        behavior: 'smooth', 
        block: isMobile ? 'start' : 'center', 
        inline: 'nearest' 
      });

      // Chờ 200ms để scroll ổn định rồi lấy tọa độ chuẩn xác
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
      }, 200);

      return () => clearTimeout(timer);
    } else {
      setTargetEl(null);
      setTargetRect(null);
      refs.setReference(null);
      setIsPositionReady(true);
    }
  }, [isOpen, currentStepIndex, currentStep.targetId, isMobile, refs]);

  // Cập nhật tọa độ khi cuộn hoặc resize
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

  // Điều hướng bằng bàn phím
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

  // Khoảng đệm bao quanh phần tử spotlight (10px)
  const pad = 10;

  // Màu fill của Floating Arrow
  const arrowFill = placement.startsWith('bottom')
    ? '#0F172A' // Header dark slate
    : '#FFFFFF'; // Thân card trắng

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans select-none animate-fadeIn">
      {/* Floating Exit Button always accessible at top right */}
      <button
        onClick={handleSkip}
        className="fixed top-4 right-4 z-[90] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg text-xs font-semibold backdrop-blur-sm cursor-pointer transition"
        title="Đóng hướng dẫn (Esc)"
      >
        <X className="w-3.5 h-3.5" />
        <span>Đóng hướng dẫn (Esc)</span>
      </button>

      {/* 1. SVG SPOTLIGHT MASK (Làm tối nền, khoét lỗ sáng chính xác ôm component) */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-auto cursor-pointer"
        onClick={handleNext}
      >
        <defs>
          <mask id="instructor-spotlight-mask">
            {/* Nền trắng che phủ toàn bộ */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            
            {/* Lỗ khoét đen trong suốt tại vị trí target */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - pad)}
                y={Math.max(0, targetRect.top - pad)}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Lớp nền dim overlay tối mờ */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.72)"
          mask="url(#instructor-spotlight-mask)"
        />
      </svg>

      {/* 2. VIỀN GLOW SÁNG BAO QUANH TARGET (Nổi bật, pulse nhẹ) */}
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
          className="rounded-xl border-2 border-emerald-400 ring-4 ring-emerald-400/25 shadow-[0_0_30px_rgba(16,185,129,0.45)] pointer-events-none z-[60] animate-pulse"
        />
      )}

      {/* 3. TOOLTIP / COACHMARK NEO GẦN TARGET KHÔNG CHE TARGET */}
      {isMobile ? (
        /* Layout Mobile: Cố định phía dưới, không che target */
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-4 left-4 right-4 z-[70] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-slideUp"
        >
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {tourConfig.tabBadge}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Bước {currentStep.stepNumber} / {currentStep.totalSteps}
              </span>
            </div>
            <button onClick={handleSkip} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

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
            {currentStep.actionText && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1.5 rounded border border-emerald-200">
                👉 {currentStep.actionText}
              </p>
            )}
            {currentStep.tip && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs">
                {currentStep.tip}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button onClick={handleSkip} className="text-xs text-slate-500 hover:text-slate-800">
              Bỏ qua
            </button>
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button onClick={handlePrev} className="px-3 py-1 rounded-lg border border-slate-300 text-xs text-slate-700">
                  Quay lại
                </button>
              )}
              <button onClick={handleNext} className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
                {isLastStep ? 'Hoàn tất' : 'Tiếp tục'}
              </button>
            </div>
          </div>
        </div>
      ) : targetRect ? (
        /* Layout Desktop: Định vị chính xác qua Floating UI */
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            zIndex: 70,
            opacity: isPositionReady ? 1 : 0,
            transition: 'opacity 150ms ease, transform 150ms ease',
          }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-[400px] w-[400px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-sans animate-scaleIn"
        >
          {/* Mũi tên chỉ về target */}
          <FloatingArrow
            ref={arrowRef}
            context={context}
            fill={arrowFill}
            stroke="#CBD5E1"
            strokeWidth={1}
            width={14}
            height={8}
          />

          {/* Header Popover */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {tourConfig.tabBadge}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Bước {currentStep.stepNumber} / {currentStep.totalSteps}
              </span>
            </div>

            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
              title="Đóng hướng dẫn (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Thanh tiến trình bước (Dots) */}
          <div className="w-full bg-slate-100 h-1 flex">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-full transition-all duration-300 ${
                  idx <= currentStepIndex ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Thân Tooltip / Coachmark */}
          <div className="p-5 space-y-3.5 max-h-[60vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 leading-snug flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {currentStep.stepNumber}
              </span>
              <span>{currentStep.title}</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentStep.description}
            </p>

            {/* Actionable Next Step CTA nếu có */}
            {currentStep.actionText && (
              <div className="p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200 text-emerald-950 text-xs font-medium leading-relaxed">
                👉 {currentStep.actionText}
              </div>
            )}

            {/* Khung Mẹo thực chiến */}
            {currentStep.tip && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs leading-relaxed">
                {currentStep.tip}
              </div>
            )}
          </div>

          {/* Footer Điều khiển */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
            <button
              onClick={handleSkip}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition cursor-pointer"
            >
              Bỏ qua hướng dẫn
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <span>{isLastStep ? 'Hoàn tất' : 'Tiếp tục'}</span>
                {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback nếu target tạm thời chưa xuất hiện: Card giữa màn hình an toàn */
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] max-w-[420px] w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-sans animate-scaleIn"
        >
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">
              {tourConfig.tabBadge} • Bước {currentStep.stepNumber} / {currentStep.totalSteps}
            </span>
            <button onClick={handleSkip} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">{currentStep.title}</h3>
            <p className="text-xs text-slate-600">{currentStep.description}</p>
            {currentStep.tip && (
              <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-950 text-xs border border-emerald-200">
                {currentStep.tip}
              </div>
            )}
          </div>
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between">
            <button onClick={handleSkip} className="text-xs text-slate-500">Bỏ qua</button>
            <button onClick={handleNext} className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg">
              {isLastStep ? 'Hoàn tất' : 'Tiếp tục'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
