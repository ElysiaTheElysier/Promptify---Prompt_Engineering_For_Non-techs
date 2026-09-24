import React, { useEffect, useRef } from 'react';
import { Check, X, GitCompare, Search, Sparkles } from 'lucide-react';

export interface DiffSuggestionItem {
  id: string;
  originalText: string;
  replacementText: string;
  label?: string;
  fullOriginalLine?: string;
  fullReplacementLine?: string;
}

export interface InlineDiffSuggestionCardProps {
  items: DiffSuggestionItem[];
  title?: string;
  evaluationScore?: number;
  activeItemId?: string | null;
  onAcceptItem?: (item: DiffSuggestionItem) => void;
  onRejectItem?: (item: DiffSuggestionItem) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onItemClick?: (item: DiffSuggestionItem) => void;
}

export const InlineDiffSuggestionCard: React.FC<InlineDiffSuggestionCardProps> = ({
  items,
  title = 'Optimal suggestions based on AI Judge rubric evaluation',
  evaluationScore,
  activeItemId,
  onAcceptItem,
  onRejectItem,
  onAcceptAll,
  onRejectAll,
  onAccept,
  onReject,
  onItemClick
}) => {
  if (!items || items.length === 0) return null;

  const handleAcceptAll = onAcceptAll || onAccept || (() => {});
  const handleRejectAll = onRejectAll || onReject || (() => {});
  const handleAcceptItem = onAcceptItem || ((item) => handleAcceptAll());
  const handleRejectItem = onRejectItem || ((item) => handleRejectAll());

  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!activeItemId) return;
    const targetIdx = items.findIndex(i => i.id === activeItemId);
    if (targetIdx !== -1 && cardRefs.current[targetIdx]) {
      cardRefs.current[targetIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeItemId, items]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputOrTextarea = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');
      
      if (e.key === 'Tab' && isInputOrTextarea) {
        e.preventDefault();
        handleAcceptAll();
      } else if (e.key === 'Escape') {
        handleRejectAll();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [items, handleAcceptAll, handleRejectAll]);

  return (
    <div className="bg-[#14141e] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl text-xs font-mono animate-fadeIn my-2 transition-all">
      {/* IDE Diff Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0e0e16] border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-slate-100 text-xs font-sans">
            {title}
          </span>
          {evaluationScore !== undefined && (
            <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-sans font-semibold">
              Judge Score: {evaluationScore}/10 pts
            </span>
          )}
          <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {items.length} suggestion{items.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            title="Accept all suggestions (Tab ⇥)"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Accept All</span>
            <kbd className="bg-emerald-700/90 text-white px-1.5 py-0.2 rounded text-[9px] font-mono shadow-2xs">Tab ⇥</kbd>
          </button>
          <button
            type="button"
            onClick={handleRejectAll}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
            title="Dismiss all suggestions (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dismiss All</span>
            <kbd className="bg-slate-700 text-slate-400 px-1 rounded text-[9px] font-mono">Esc</kbd>
          </button>
        </div>
      </div>

      {/* Suggestion Items List */}
      <div 
        ref={listRef}
        className="p-3.5 space-y-3.5 max-h-[380px] overflow-y-auto custom-scrollbar-dark scroll-smooth"
      >
        {items.map((item, index) => {
          const originalLine = item.fullOriginalLine || item.originalText;
          const replacementLine = item.fullReplacementLine || item.replacementText;
          const isActive = activeItemId === item.id;

          return (
            <div 
              key={item.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              onClick={() => onItemClick && onItemClick(item)}
              className={`group/card rounded-xl border p-3 shadow-md transition cursor-pointer ${
                isActive 
                  ? 'border-amber-400 bg-[#252233] ring-2 ring-amber-400/50 shadow-amber-900/40' 
                  : 'border-slate-700/90 bg-[#191926] hover:border-emerald-500/80 hover:bg-[#1e1e2e]'
              }`}
              title="Click to locate and highlight this modification in the composer"
            >
              {/* Header per suggestion card */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-md font-bold flex items-center justify-center text-[10px] font-mono shrink-0 ${
                    isActive ? 'bg-amber-500/30 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-slate-200 text-xs font-sans">
                    {item.label || 'Revision'}
                  </span>
                  {isActive ? (
                    <span className="text-[10px] text-amber-300 font-sans flex items-center gap-1 font-semibold">
                      <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                      <span>Focused in editor</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-sans hidden sm:flex items-center gap-1 group-hover/card:text-amber-300 transition-colors">
                      <Search className="w-3 h-3 text-slate-500 group-hover/card:text-amber-400" />
                      <span>Click to locate in composer</span>
                    </span>
                  )}
                </div>

                {/* Accept / Reject single suggestion */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleAcceptItem(item)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                    title="Accept this suggestion"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Accept</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectItem(item)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition cursor-pointer"
                    title="Dismiss this suggestion"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Diff lines: red (-) and green (+) */}
              <div className="rounded-lg overflow-hidden border border-slate-800 text-xs sm:text-[13px] leading-relaxed">
                {/* Red: original / removed */}
                <div className="px-3.5 py-1.5 bg-[#3b1d22]/95 text-[#fca5a5] border-l-4 border-rose-500 flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold select-none shrink-0 w-3 text-center">-</span>
                  <div className="flex-1 whitespace-pre-wrap break-all">
                    <span className="line-through decoration-rose-400/80 bg-rose-950/70 px-1 py-0.5 rounded">
                      {originalLine}
                    </span>
                  </div>
                </div>

                {/* Green: suggested replacement */}
                <div className="px-3.5 py-1.5 bg-[#16382b]/95 text-[#86efac] border-l-4 border-emerald-500 flex items-start gap-2.5 border-t border-slate-800/60">
                  <span className="text-emerald-400 font-bold select-none shrink-0 w-3 text-center">+</span>
                  <div className="flex-1 whitespace-pre-wrap break-all">
                    <span className="font-semibold bg-emerald-950/70 text-emerald-200 px-1 py-0.5 rounded">
                      {replacementLine}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
