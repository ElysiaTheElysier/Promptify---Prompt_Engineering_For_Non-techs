import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Info, 
  Star,
  Target,
  ChevronRight,
  ExternalLink
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
  className?: string;
}

export const PromptStructurePanel: React.FC<Props> = ({
  analysis,
  focusComponents = [],
  selectedSpan,
  onSelectComponent,
  className = ''
}) => {
  const [activeHoverType, setActiveHoverType] = useState<PromptComponentType | null>(null);

  const detectedCount = analysis.detectedTypes.length;
  const currentViewType = selectedSpan?.type || activeHoverType;
  const activeMeta = currentViewType ? COMPONENT_METADATA[currentViewType] : null;

  // Tìm gợi ý trọng tâm nhẹ nhàng nếu bài học có yêu cầu mà prompt chưa có
  const missingFocusComponent = focusComponents.find(c => !analysis.detectedTypes.includes(c));

  return (
    <div className={`bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/90 text-slate-700 font-sans space-y-2.5 ${className}`}>
      {/* 1. Header Bar: Tiêu đề & Trạng thái nhận diện (Không phán xét điểm số) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Target className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            Cấu trúc Prompt
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            • Bấm vào từng phần để highlight trong ô câu lệnh
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Đã nhận diện: <strong className="text-emerald-700 font-bold">{detectedCount}</strong> / 7 thành phần
        </div>
      </div>

      {/* 2. Danh sách 7 thành phần cấu trúc (Tối giản, không cầu vồng, ưu tiên text & icon nhỏ) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {ALL_PROMPT_COMPONENTS.map((type) => {
          const isDetected = analysis.detectedTypes.includes(type);
          const isFocus = focusComponents.includes(type);
          const isSelected = selectedSpan?.type === type;
          const meta = COMPONENT_METADATA[type];
          const spansOfType = analysis.components.filter(c => c.type === type);

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelectComponent(type)}
              onMouseEnter={() => setActiveHoverType(type)}
              onMouseLeave={() => setActiveHoverType(null)}
              title={`${meta.label}: ${meta.businessImpact}`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer select-none border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-emerald-500/40'
                  : isDetected
                  ? 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50/80 hover:border-emerald-400'
                  : 'bg-white/60 text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
              }`}
            >
              {isDetected ? (
                <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-emerald-600'}`} />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-300" />
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
      </div>

      {/* 3. Panel giải thích ngắn về tác động Business Output khi hover hoặc click */}
      {activeMeta && (
        <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 text-xs space-y-1 animate-fadeIn shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{activeMeta.label}</span>
              {focusComponents.includes(currentViewType!) && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  ★ Trọng tâm bài thực hành
                </span>
              )}
            </span>
            {selectedSpan?.type === currentViewType && (
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                ✓ Đang bôi đen trong ô soạn thảo
              </span>
            )}
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            💡 <strong>Tác động đầu ra:</strong> {activeMeta.businessImpact}
          </p>
        </div>
      )}

      {/* 4. Gợi ý hỗ trợ mang tính xây dựng (Không phán xét hay bắt buộc checklist) */}
      {!activeMeta && missingFocusComponent && (
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 pt-1">
          <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            Gợi ý bài này: Bạn có thể bổ sung thêm <strong>{COMPONENT_METADATA[missingFocusComponent].shortLabel}</strong> để AI xuất dữ liệu sát yêu cầu hơn.
          </span>
        </div>
      )}
    </div>
  );
};

