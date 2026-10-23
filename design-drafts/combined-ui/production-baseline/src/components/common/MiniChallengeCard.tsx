import React, { useState } from 'react';
import { Target, ChevronDown, ChevronUp, Sparkles, ArrowRight, Check } from 'lucide-react';
import { MiniChallenge } from '../../types';

interface Props {
  challenge?: MiniChallenge;
  onApplyChallengePrompt?: (samplePrompt: string) => void;
  className?: string;
}

export const MiniChallengeCard: React.FC<Props> = ({
  challenge,
  onApplyChallengePrompt,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isApplied, setIsApplied] = useState<boolean>(false);

  if (!challenge) return null;

  const handleTryChallenge = () => {
    if (challenge.context && onApplyChallengePrompt) {
      onApplyChallengePrompt(challenge.context);
      setIsApplied(true);
      setTimeout(() => setIsApplied(false), 2000);
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 overflow-hidden font-sans ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                Thử thách nhỏ: {challenge.title}
              </h5>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Tùy chọn
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Áp dụng kỹ năng vừa học vào tình huống thực tế khác (không bắt buộc)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400 text-xs">
          <span>{isOpen ? 'Thu gọn' : 'Xem thử thách'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3 animate-fadeIn text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
            <p className="text-slate-800 leading-relaxed font-medium">
              {challenge.instruction}
            </p>
            {challenge.tip && (
              <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                💡 <strong>Gợi ý thử thách:</strong> {challenge.tip}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 italic">
              Bạn có thể làm ngay hoặc bấm "Sang bài tiếp theo" bất cứ lúc nào.
            </span>

            {challenge.context && onApplyChallengePrompt && (
              <button
                type="button"
                onClick={handleTryChallenge}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition shadow-xs"
              >
                {isApplied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isApplied ? 'Đã đưa vào ô Prompt' : 'Thử thách thức này'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

