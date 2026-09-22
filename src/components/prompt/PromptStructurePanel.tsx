import React, { useState } from 'react';
import { CheckCircle2, CircleAlert, CircleDashed, Target } from 'lucide-react';
import {
  ALL_PROMPT_COMPONENTS,
  COMPONENT_METADATA,
  getPromptComponentStatus,
  PromptAnalysis,
  PromptComponentType,
  PromptSpan,
} from '../../services/promptStructureAnalyzer';

interface Props {
  analysis: PromptAnalysis;
  promptText: string;
  focusComponents?: PromptComponentType[];
  selectedSpan?: PromptSpan | null;
  onSelectComponent: (type: PromptComponentType) => void;
  className?: string;
}

const feedbackFor = (type: PromptComponentType, status: 'has' | 'missing' | 'weak') => {
  const label = COMPONENT_METADATA[type].shortLabel.toLowerCase();
  if (status === 'has') return `${COMPONENT_METADATA[type].shortLabel} đã rõ.`;
  if (status === 'weak') return `${COMPONENT_METADATA[type].shortLabel} chưa đủ cụ thể.`;
  return `Thiếu ${label}.`;
};

export const PromptStructurePanel: React.FC<Props> = ({ analysis, promptText, focusComponents = [], selectedSpan, onSelectComponent, className = '' }) => {
  const [activeType, setActiveType] = useState<PromptComponentType | null>(null);
  const [showMore, setShowMore] = useState(false);

  if (!promptText.trim()) {
    return <div className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 ${className}`}>Viết prompt trước, sau đó hệ thống sẽ kiểm tra cấu trúc và gợi ý phần cần bổ sung.</div>;
  }

  const currentType = selectedSpan?.type || activeType;
  const currentStatus = currentType ? getPromptComponentStatus(analysis, currentType) : null;
  const defaults: PromptComponentType[] = ['context', 'task', 'constraint'];
  const primaryTypes = [...focusComponents, ...defaults]
    .filter((type, index, items) => items.indexOf(type) === index)
    .slice(0, 3);
  const secondaryTypes = ALL_PROMPT_COMPONENTS.filter((type) => !primaryTypes.includes(type));

  const renderComponent = (type: PromptComponentType) => {
    const status = getPromptComponentStatus(analysis, type);
    const isActive = currentType === type;
    const statusStyle = status === 'has' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : status === 'weak' ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-slate-600 bg-white border-slate-200';
    const StatusIcon = status === 'has' ? CheckCircle2 : status === 'weak' ? CircleAlert : CircleDashed;
    return (
      <button key={type} type="button" onClick={() => { setActiveType(type); onSelectComponent(type); }} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${statusStyle} ${isActive ? 'ring-2 ring-emerald-500/35' : 'hover:border-slate-300'}`}>
        <span className="flex min-w-0 items-center gap-1.5"><StatusIcon className="h-3.5 w-3.5 shrink-0" /><span className="truncate font-semibold">{COMPONENT_METADATA[type].shortLabel}</span></span>
        <span className="shrink-0 text-[11px]">{status === 'has' ? 'Đã có' : status === 'weak' ? 'Chưa rõ' : 'Thiếu'}</span>
      </button>
    );
  };

  return (
    <section className={`rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 ${className}`} aria-label="Checklist cấu trúc prompt">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Target className="h-4 w-4 text-emerald-600" />Gợi ý cấu trúc trọng tâm</div>
        <span className="text-[11px] text-slate-500">Không cần đạt đủ mọi thành phần</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {primaryTypes.map(renderComponent)}
      </div>
      <button type="button" onClick={() => setShowMore(!showMore)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800">{showMore ? 'Thu gọn' : `Xem thêm ${secondaryTypes.length} thành phần`}</button>
      {showMore && <div className="grid grid-cols-1 gap-1.5 border-t border-slate-200 pt-3 sm:grid-cols-2 animate-fadeIn">{secondaryTypes.map(renderComponent)}</div>}
      {currentType && currentStatus && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 animate-fadeIn">
          <span className="font-semibold text-slate-800">{COMPONENT_METADATA[currentType].shortLabel}: </span>{feedbackFor(currentType, currentStatus)}
          {selectedSpan?.type === currentType && <span className="ml-1 text-emerald-700">Đoạn tương ứng đang được chọn trong ô soạn thảo.</span>}
        </div>
      )}
    </section>
  );
};
