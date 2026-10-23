import React from 'react';
import { CheckCircle2, FileText, LayoutList, Layers, Anchor, Award, Sparkles } from 'lucide-react';

export interface BadgesState {
  hasContext: boolean;
  hasFormat: boolean;
  hasExample: boolean;
  hasGrounding: boolean;
}

/**
 * Kiểm tra các hành vi học tập thực tế trong câu lệnh prompt của học viên
 */
export function detectLearningBadges(promptText: string): BadgesState {
  const text = promptText.toLowerCase();

  // 1. Badge Đã thêm Context: gán ngữ cảnh dữ liệu, biến số hoặc bối cảnh ngân hàng
  const hasContext = 
    text.includes('{{') || 
    text.includes('bối cảnh') || 
    text.includes('ngữ cảnh') || 
    text.includes('tình huống') || 
    text.includes('dữ liệu') || 
    text.includes('phản hồi') || 
    text.includes('agribank') || 
    text.includes('khách hàng');

  // 2. Badge Đã dùng Output Format: bảng markdown, cột, định dạng rõ ràng
  const hasFormat = 
    text.includes('bảng') || 
    text.includes('markdown') || 
    text.includes('cột') || 
    text.includes('định dạng') || 
    text.includes('format') || 
    text.includes('|') || 
    text.includes('gạch đầu dòng');

  // 3. Badge Đã dùng Example: có ví dụ mẫu, input mẫu, output mẫu
  const hasExample = 
    text.includes('ví dụ') || 
    text.includes('mẫu') || 
    text.includes('example') || 
    text.includes('minh họa') || 
    text.includes('đầu ra mẫu');

  // 4. Badge Đã Ground bằng tài liệu: neo tài liệu, trích dẫn, chỉ dựa trên văn bản
  const hasGrounding = 
    text.includes('chỉ dựa trên') || 
    text.includes('tài liệu') || 
    text.includes('không suy diễn') || 
    text.includes('trích dẫn') || 
    text.includes('căn cứ vào') || 
    text.includes('bằng chứng') || 
    text.includes('grounding');

  return { hasContext, hasFormat, hasExample, hasGrounding };
}

interface Props {
  promptText: string;
  runCount: number;
  className?: string;
  compact?: boolean;
}

export const LearningBadges: React.FC<Props> = ({
  promptText,
  runCount,
  className = '',
  compact = false
}) => {
  const badges = detectLearningBadges(promptText);
  const earnedCount = Object.values(badges).filter(Boolean).length;

  if (earnedCount === 0 && runCount <= 1) {
    return null;
  }

  return (
    <div className={`space-y-2 font-sans ${className}`}>
      {/* Thông tin số phiên bản đã cải thiện */}
      {runCount >= 2 && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 w-fit">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bạn đã cải thiện câu lệnh qua {runCount} lần thử!</span>
        </div>
      )}

      {/* Danh sách các Badge hành vi đã đạt được */}
      {earnedCount > 0 && (
        <div className="space-y-1">
          {!compact && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Hành vi kỹ thuật bạn đã áp dụng:
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {badges.hasContext && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã thêm Context</span>
              </span>
            )}

            {badges.hasFormat && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã dùng Output Format</span>
              </span>
            )}

            {badges.hasExample && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã dùng Example</span>
              </span>
            )}

            {badges.hasGrounding && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã Ground bằng tài liệu</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

