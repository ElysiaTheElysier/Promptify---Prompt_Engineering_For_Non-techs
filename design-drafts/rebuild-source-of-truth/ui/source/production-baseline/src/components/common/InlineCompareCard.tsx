import React from 'react';
import { GitCompare, ArrowRight, Sparkles } from 'lucide-react';
import { LabStep } from '../../types';

interface Props {
  lab: LabStep;
  runCount: number;
  onOpenFullCompare: () => void;
  currentPrompt?: string;
}

/**
 * Nút kích hoạt Compare trên màn hình chính:
 * - Không hiển thị mặc định khi runCount < 2
 * - Khi runCount >= 2, hiển thị thanh CTA trang nhã với nút "So sánh với lần trước"
 * - Không hiển thị bảng compare cồng kềnh trên màn hình chính để tránh overload
 */
export const InlineCompareCard: React.FC<Props> = ({ 
  runCount, 
  onOpenFullCompare,
}) => {
  // Chỉ hiển thị sau khi user đã có ít nhất 2 lần chạy trong cùng một lab/bước
  if (runCount < 2) return null;

  return (
    <div 
      data-tour="tour-compare"
      className="bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 animate-fadeIn shadow-2xs font-sans"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
          <GitCompare className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Bạn đã có {runCount} lần thử trong bài này!
            </h4>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Đối chiếu tiến bộ
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Mở bảng so sánh song song 2 cột để xem rõ câu lệnh đã thay đổi ở đâu và kết quả tốt hơn như thế nào.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenFullCompare}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition transform active:scale-98 whitespace-nowrap"
      >
        <GitCompare className="w-4 h-4 text-emerald-400" />
        <span>So sánh với lần trước</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
