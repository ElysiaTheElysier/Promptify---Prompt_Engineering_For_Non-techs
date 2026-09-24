import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Eye } from 'lucide-react';

interface Step {
  stepIndex: number;
  title: string;
  targetId: string;
  description: string;
  tip: string;
}

const TUTORIAL_STEPS: Step[] = [
  {
    stepIndex: 1,
    title: '1. Read the Scenario & Mission',
    targetId: 'tour-scenario',
    description: 'This is the real-world business challenge you need to handle. Quickly review to understand your professional role and the core objective.',
    tip: '💡 Tip: Scan the "What You Need to Do" section to grasp your objective in 3 seconds.'
  },
  {
    stepIndex: 2,
    title: '2. Prompt Composer',
    targetId: 'tour-prompt',
    description: 'This is where you delegate tasks to the AI. The clearer your instructions regarding role, task, constraints, and tabular output, the more accurate the AI output.',
    tip: '💡 Tip: Draft your own prompt first, or click "View Suggestions" if you need inspiration.'
  },
  {
    stepIndex: 3,
    title: '3. Run Test Button',
    targetId: 'tour-run',
    description: 'Once your prompt is ready, click this button (or press Ctrl + Enter) to submit instructions to the AI model and inspect instant results.',
    tip: '💡 Tip: The system will automatically evaluate and score your prompt against enterprise rubrics.'
  },
  {
    stepIndex: 4,
    title: '4. Inspect Output & Track Progress',
    targetId: 'tour-output',
    description: 'Review the AI response to verify accuracy. After your 2nd attempt, the system unlocks the Side-by-Side Comparison to highlight your progress.',
    tip: '💡 Tip: Focus on understanding: What did you adjust in the prompt, and how did the output improve?'
  },
  {
    stepIndex: 5,
    title: '5. AI Learning Coach',
    targetId: 'tour-coach',
    description: 'Whenever you get stuck, click the AI Coach in the bottom right corner. The coach asks guiding questions and provides hints without spoiling the answer.',
    tip: '💡 Tip: The AI Coach provides one-click actions: "Hint for this step" and "Review my prompt".'
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTutorial: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Always reset to step 1 when opening the tutorial
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Smooth scroll to target element if present
  useEffect(() => {
    if (!isOpen) return;
    const currentStep = TUTORIAL_STEPS[currentStepIndex];
    if (currentStep) {
      const el = document.querySelector(`[data-tour="${currentStep.targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStepIndex, isOpen]);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleIn">
        {/* Header Tutorial */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h4 className="font-bold text-sm">
              60-Second Quick Tour ({currentStep.stepIndex} of {TUTORIAL_STEPS.length})
            </h4>
          </div>

          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            title="Skip tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="w-full bg-slate-100 h-1 flex">
          {TUTORIAL_STEPS.map((_, idx) => (
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
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Tip Box */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-xs leading-relaxed">
            {currentStep.tip}
          </div>
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-700 font-medium transition"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <span>{isLastStep ? 'Start Learning Now!' : 'Continue'}</span>
              {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
