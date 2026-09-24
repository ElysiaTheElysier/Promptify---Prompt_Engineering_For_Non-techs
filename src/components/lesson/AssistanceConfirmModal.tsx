import React, { useEffect } from 'react';
import { Lightbulb, KeyRound, AlertTriangle, X, ShieldAlert, ArrowRight } from 'lucide-react';

export interface AssistanceConfirmModalProps {
  isOpen: boolean;
  type: 'hint' | 'solution';
  labTitle: string;
  labOrder: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AssistanceConfirmModal: React.FC<AssistanceConfirmModalProps> = ({
  isOpen,
  type,
  labTitle,
  labOrder,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isHint = type === 'hint';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn select-none">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 flex items-start gap-3.5 border-b ${
          isHint 
            ? 'bg-amber-50/80 border-amber-200/80 text-amber-950' 
            : 'bg-rose-50/80 border-rose-200/80 text-rose-950'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
            isHint ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
          }`}>
            {isHint ? <Lightbulb className="w-5 h-5 stroke-[2.2]" /> : <KeyRound className="w-5 h-5 stroke-[2.2]" />}
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${
              isHint ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {isHint ? 'Confirm Unlocking Hints' : 'Unlock Exemplary Solution Warning'}
            </span>
            <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
              Lesson {labOrder}: {labTitle}
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs text-slate-600 leading-relaxed">
          {isHint ? (
            <>
              <div className="flex items-start gap-2.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Unlocking hints will be recorded in your attempt history to help the instructor assess your autonomous problem-solving level.
                </p>
              </div>
              <p className="text-slate-600">
                Hints scaffold problem-solving step by step without spoiling the self-directed learning experience.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5 p-3 bg-rose-50/70 rounded-xl border border-rose-200 text-rose-900">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-rose-950 block mb-0.5">
                    This action will be recorded on your scorecard:
                  </strong>
                  <p>
                    Your attempt will be flagged as <strong>"Referenced Solution"</strong> in the instructor audit log. We strongly recommend testing at least one drafted prompt before inspecting!
                  </p>
                </div>
              </div>
              <p className="text-slate-600">
                The solution includes an exemplary reference prompt with step-by-step rationale explaining why it works.
              </p>
            </>
          )}

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-medium border-t border-slate-100">
            <span>Do you wish to proceed?</span>
            <span className="font-mono text-slate-500">Press Esc to cancel</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
          >
            {isHint ? 'Keep Thinking' : 'Keep Trying'}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isHint 
                ? 'bg-amber-600 hover:bg-amber-500' 
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            <span>{isHint ? 'Confirm & View Hint' : 'I Understand, Unlock Solution'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
