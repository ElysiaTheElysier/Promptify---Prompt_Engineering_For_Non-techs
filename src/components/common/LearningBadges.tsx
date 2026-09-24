import React from 'react';
import { CheckCircle2, FileText, LayoutList, Layers, Anchor, Award, Sparkles } from 'lucide-react';

export interface BadgesState {
  hasContext: boolean;
  hasFormat: boolean;
  hasExample: boolean;
  hasGrounding: boolean;
}

/**
 * Detect learning behaviors and applied techniques in learner prompts
 */
export function detectLearningBadges(promptText: string): BadgesState {
  const text = promptText.toLowerCase();

  // 1. Context Badge: context provided, variables, or business background
  const hasContext = 
    text.includes('{{') || 
    text.includes('context') || 
    text.includes('background') || 
    text.includes('scenario') || 
    text.includes('data') || 
    text.includes('bối cảnh') || 
    text.includes('ngữ cảnh') || 
    text.includes('tình huống') || 
    text.includes('dữ liệu') || 
    text.includes('customer');

  // 2. Output Format Badge: markdown table, columns, structured format
  const hasFormat = 
    text.includes('table') || 
    text.includes('markdown') || 
    text.includes('column') || 
    text.includes('format') || 
    text.includes('bullet') || 
    text.includes('bảng') || 
    text.includes('cột') || 
    text.includes('định dạng') || 
    text.includes('|');

  // 3. Example Badge: few-shot samples, input/output pairs
  const hasExample = 
    text.includes('example') || 
    text.includes('sample') || 
    text.includes('few-shot') || 
    text.includes('one-shot') || 
    text.includes('ví dụ') || 
    text.includes('mẫu');

  // 4. Grounding Badge: document grounding, citations, strictly based on text
  const hasGrounding = 
    text.includes('only based on') || 
    text.includes('provided document') || 
    text.includes('do not extrapolate') || 
    text.includes('do not hallucinate') || 
    text.includes('grounding') || 
    text.includes('source') || 
    text.includes('chỉ dựa trên') || 
    text.includes('tài liệu') || 
    text.includes('không suy diễn');

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
      {runCount >= 2 && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 w-fit">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>You've refined your prompt across {runCount} attempts!</span>
        </div>
      )}

      {earnedCount > 0 && (
        <div className="space-y-1">
          {!compact && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Techniques applied:
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {badges.hasContext && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Context Added</span>
              </span>
            )}

            {badges.hasFormat && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Output Format Specified</span>
              </span>
            )}

            {badges.hasExample && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Examples Included</span>
              </span>
            )}

            {badges.hasGrounding && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Document Grounding Applied</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
