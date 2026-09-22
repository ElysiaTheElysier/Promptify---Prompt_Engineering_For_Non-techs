import React, { useState, useRef } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Info, 
  Star,
  Target,
  ChevronRight,
  ExternalLink,
  Plus,
  LayoutTemplate,
  Lightbulb,
  Code2,
  Check
} from 'lucide-react';
import { 
  PromptAnalysis, 
  PromptComponentType, 
  PromptSpan, 
  ALL_PROMPT_COMPONENTS, 
  COMPONENT_METADATA 
} from '../../services/promptStructureAnalyzer';

interface Props {
  analysis: PromptAnalysis;
  focusComponents?: PromptComponentType[];
  selectedSpan?: PromptSpan | null;
  onSelectComponent: (type: PromptComponentType) => void;
  onInsertTag?: (tagLabel: string) => void;
  onInsertSkeleton?: () => void;
  canInsertSkeleton?: boolean;
  className?: string;
}

export const PromptStructurePanel: React.FC<Props> = ({
  analysis,
  focusComponents = [],
  selectedSpan,
  onSelectComponent,
  onInsertTag,
  onInsertSkeleton,
  canInsertSkeleton = true,
  className = ''
}) => {
  const [activeHoverType, setActiveHoverType] = useState<PromptComponentType | null>(null);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [copiedExampleType, setCopiedExampleType] = useState<string | null>(null);

  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    left: number;
    arrowLeft: number;
    width: number;
    placement: 'top' | 'bottom';
  }>({
    left: 0,
    arrowLeft: 24,
    width: 440,
    placement: 'top',
  });

  const handleCopyExample = (snippet: string, type: string) => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopiedExampleType(type);
    setTimeout(() => setCopiedExampleType(null), 2000);
  };

  const handleMouseEnterChip = (type: PromptComponentType, e: React.MouseEvent<HTMLButtonElement>) => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    const target = e.currentTarget;
    const container = chipsContainerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      // Tâm ngang của chip so với mép trái container
      const chipCenterX = (targetRect.left - containerRect.left) + targetRect.width / 2;

      // Chiều rộng tooltip thích ứng với kích thước container
      const tooltipWidth = Math.min(460, Math.max(280, containerRect.width - 8));

      // Căn giữa tooltip vào chip, không để tràn mép container
      let left = chipCenterX - tooltipWidth / 2;
      if (left < 0) left = 0;
      if (left + tooltipWidth > containerRect.width) {
        left = Math.max(0, containerRect.width - tooltipWidth);
      }

      // Vị trí mũi tên trỏ vào chip (tương đối trong tooltip)
      let arrowLeft = chipCenterX - left;
      if (arrowLeft < 16) arrowLeft = 16;
      if (arrowLeft > tooltipWidth - 16) arrowLeft = tooltipWidth - 16;

      // Kiểm tra không gian phía trên: nếu quá gần mép trên viewport (< 210px) thì mới lật xuống dưới
      const placement = targetRect.top < 210 ? 'bottom' : 'top';

      setTooltipPos({ left, arrowLeft, width: tooltipWidth, placement });
    }
    setActiveHoverType(type);
  };

  const handleMouseLeaveChip = () => {
    leaveTimerRef.current = setTimeout(() => {
      setActiveHoverType(null);
    }, 200);
  };

  const detectedCount = analysis.detectedTypes.length;
  // Tooltip chỉ hiển thị khi hover (không gắn chết làm phình giao diện)
  const activeTooltipType = activeHoverType;
  const activeMeta = activeTooltipType ? COMPONENT_METADATA[activeTooltipType] : null;

  // Gợi ý trọng tâm nhẹ nhàng nếu bài học có yêu cầu mà prompt chưa có
  const missingFocusComponent = focusComponents.find(c => !analysis.detectedTypes.includes(c));

  return (
    <div className={`relative bg-slate-50 rounded-xl p-3 border border-slate-200 text-slate-700 font-sans space-y-2.5 ${className}`}>
      {/* 1. Header Bar: Tiêu đề, nút chèn khung sườn & đếm nhận diện */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <Target className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            Cấu trúc & Gợi ý chèn thẻ
          </span>
          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
            • Bấm thẻ đã có để định vị | Bấm (+) thẻ thiếu để chèn nhanh
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onInsertSkeleton && (
            <button
              type="button"
              onClick={onInsertSkeleton}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 transition cursor-pointer shadow-2xs"
              title="Chèn trọn bộ khung 5 tiêu chuẩn: Vai trò, Bối cảnh, Nhiệm vụ, Ràng buộc, Đầu ra"
            >
              <LayoutTemplate className="w-3 h-3 text-emerald-600" />
              <span>Khung 5 tiêu chuẩn</span>
            </button>
          )}
          <div className="text-[11px] text-slate-500 font-medium bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
            Đã nhận diện: <strong className="text-emerald-700 font-bold">{detectedCount}</strong> / 7
          </div>
        </div>
      </div>

      {/* 2. Danh sách 7 thành phần cấu trúc hợp nhất với chèn thẻ */}
      <div ref={chipsContainerRef} className="relative flex flex-wrap items-center gap-1.5 pt-0.5">
        {ALL_PROMPT_COMPONENTS.map((type) => {
          const isDetected = analysis.detectedTypes.includes(type);
          const isFocus = focusComponents.includes(type);
          const isSelected = selectedSpan?.type === type;
          const meta = COMPONENT_METADATA[type];
          const spansOfType = analysis.components.filter(c => c.type === type);

          const handleClick = () => {
            if (isDetected) {
              // Nếu đã có trong prompt -> highlight span trong editor
              onSelectComponent(type);
            } else {
              // Nếu chưa có -> chèn thẻ vào prompt
              if (onInsertTag) {
                onInsertTag(meta.shortLabel);
              }
            }
          };

          return (
            <button
              key={type}
              type="button"
              onClick={handleClick}
              onMouseEnter={(e) => handleMouseEnterChip(type, e)}
              onMouseLeave={handleMouseLeaveChip}
              aria-label={
                isDetected 
                  ? `Đã nhận diện "${meta.label}". Bấm để highlight vị trí trong ô soạn thảo.` 
                  : `Chưa có "${meta.label}". Bấm để chèn thẻ "${meta.shortLabel}: " vào ô soạn thảo.`
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer select-none border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-emerald-500/40'
                  : isDetected
                  ? 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50/80 hover:border-emerald-400 shadow-2xs'
                  : 'bg-white/80 text-slate-600 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/60 hover:text-emerald-800'
              }`}
            >
              {isDetected ? (
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-emerald-600'}`} />
              ) : (
                <Plus className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              )}
              
              <span>{meta.shortLabel}</span>

              {/* Huy hiệu số lượng nếu có nhiều span cùng type */}
              {isDetected && spansOfType.length > 1 && (
                <span className={`text-[10px] font-bold px-1 rounded-full ${
                  isSelected ? 'bg-slate-800 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {spansOfType.length}
                </span>
              )}

              {/* Nhãn trọng tâm bài này */}
              {isFocus && (
                <span 
                  title="Thành phần trọng tâm bài thực hành này"
                  className={`text-[9px] font-bold px-1 py-0.2 rounded uppercase tracking-wider ${
                    isSelected 
                      ? 'bg-amber-400 text-slate-950' 
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  Trọng tâm
                </span>
              )}
            </button>
          );
        })}

        {/* 3. TOOLTIP NỔI LÊN TRÊN (ABSOLUTE FLOATING POPOVER) - 100% không làm xô lệch bất kỳ component nào */}
        {activeMeta && (activeHoverType || isHoveringTooltip) && (
          <div 
            onMouseEnter={() => {
              if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
              setIsHoveringTooltip(true);
            }}
            onMouseLeave={() => {
              setIsHoveringTooltip(false);
              setActiveHoverType(null);
            }}
            style={{
              left: `${tooltipPos.left}px`,
              width: `${tooltipPos.width}px`,
            }}
            className={`absolute z-50 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xl space-y-3 animate-fadeIn text-slate-700 pointer-events-auto transition-[left,width] duration-150 ease-out ${
              tooltipPos.placement === 'bottom'
                ? 'top-[calc(100%+8px)]'
                : 'bottom-[calc(100%+8px)]'
            }`}
          >
            {/* Mũi tên tooltip định vị chính xác trỏ thẳng vào chip đang hover */}
            <div 
              style={{ left: `${tooltipPos.arrowLeft}px` }}
              className={`absolute w-3.5 h-3.5 bg-white transform rotate-45 -translate-x-1/2 ${
                tooltipPos.placement === 'bottom'
                  ? '-top-2 border-t border-l border-slate-200'
                  : '-bottom-2 border-b border-r border-slate-200'
              }`} 
            />

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full inline-block ${analysis.detectedTypes.includes(activeTooltipType!) ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{activeMeta.label}</span>
                {focusComponents.includes(activeTooltipType!) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-400" />
                    <span>Trọng tâm bài thực hành</span>
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                {onInsertTag && (
                  <button
                    type="button"
                    onClick={() => {
                      onInsertTag(activeMeta.shortLabel);
                      setActiveHoverType(null);
                      setIsHoveringTooltip(false);
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-medium flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-200 transition cursor-pointer"
                    title={`Chèn "${activeMeta.shortLabel}: " vào ô lệnh`}
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>Chèn thẻ này</span>
                  </button>
                )}
                {selectedSpan?.type === activeTooltipType && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Đang chọn</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Tác động đầu ra:</strong> {activeMeta.businessImpact}
              </div>
            </div>

            {/* Hộp hiển thị Ví dụ Mẫu cụ thể */}
            {activeMeta.exampleSnippet && (
              <div className="pt-1.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Ví dụ câu lệnh mẫu:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyExample(activeMeta.exampleSnippet, activeTooltipType!)}
                    className="text-[11px] text-slate-500 hover:text-emerald-700 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer"
                    title="Sao chép ví dụ này vào bộ nhớ tạm"
                  >
                    {copiedExampleType === activeTooltipType ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>Sao chép mẫu</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-50 text-slate-800 p-2.5 rounded-xl font-mono text-[11px] border border-slate-200 leading-relaxed break-words select-text">
                  "{activeMeta.exampleSnippet}"
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Gợi ý hỗ trợ mang tính xây dựng ổn định (Không thay đổi layout khi hover) */}
      {missingFocusComponent && (
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 pt-0.5">
          <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            Gợi ý bài này: Bạn có thể bấm <strong className="text-emerald-700">[+ {COMPONENT_METADATA[missingFocusComponent].shortLabel}]</strong> để bổ sung cấu trúc giúp AI xuất dữ liệu sát yêu cầu hơn.
          </span>
        </div>
      )}
    </div>
  );
};
