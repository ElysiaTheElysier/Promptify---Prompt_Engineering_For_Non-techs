import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, Check, HelpCircle } from 'lucide-react';
import { InstructorViewMode } from '../../types/instructor';
import { INSTRUCTOR_TUTORIAL_DATA } from '../../services/instructorTutorialConfig';

interface Props {
  isOpen: boolean;
  currentView: InstructorViewMode;
  onClose: () => void;
  autoShow: boolean;
  onToggleAutoShow: (enabled: boolean) => void;
}

export const InstructorTutorial: React.FC<Props> = ({
  isOpen,
  currentView,
  onClose,
  autoShow,
  onToggleAutoShow
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const config = INSTRUCTOR_TUTORIAL_DATA[currentView] || INSTRUCTOR_TUTORIAL_DATA.dashboard;
  const steps = config.steps;
  const currentStep = steps[currentStepIndex] || steps[0];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Reset to step 0 whenever modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, currentView]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (!isLastStep) {
          setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex(prev => Math.max(prev - 1, 0));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, isLastStep, steps.length, onClose]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-[2px] animate-fadeIn font-sans select-none">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  Hướng dẫn {config.tabName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {config.tabBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Bước {currentStep.stepIndex} / {steps.length} • Dành cho Giảng viên & Quản lý lớp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
            title="Đóng hướng dẫn (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
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

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Tip Box */}
          <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 text-xs leading-relaxed flex items-start gap-2">
            <div className="flex-1">
              {currentStep.tip}
            </div>
          </div>
        </div>

        {/* Footer & Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Auto-show Toggle Checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoShow}
              onChange={(e) => onToggleAutoShow(e.target.checked)}
              className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500">Tự động hiện khi chuyển tab</span>
          </label>

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
              <span>{isLastStep ? 'Đã hiểu & Bắt đầu' : 'Tiếp tục'}</span>
              {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
