import React from 'react';
import { Eye, PenLine, Plus, Puzzle } from 'lucide-react';

export type PromptSupportMode = 'self' | 'structure' | 'sample';

const PROMPT_BLOCKS = [
  { key: 'role', label: 'Vai trò', template: 'Vai trò: [AI là ai?]\n' },
  { key: 'context', label: 'Bối cảnh', template: 'Bối cảnh: [Thông tin cần AI biết]\n' },
  { key: 'task', label: 'Nhiệm vụ', template: 'Nhiệm vụ: [AI cần làm gì?]\n' },
  { key: 'constraint', label: 'Ràng buộc', template: 'Ràng buộc: [Giới hạn hoặc điều không được làm]\n' },
  { key: 'output_format', label: 'Định dạng đầu ra', template: 'Đầu ra mong muốn: [Bảng, danh sách, độ dài...]\n' },
] as const;

interface Props {
  promptText: string;
  supportMode: PromptSupportMode;
  promptPlaceholder: string;
  samplePrompt: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  history?: React.ReactNode;
  onChange: (value: string) => void;
  onSupportModeChange: (mode: PromptSupportMode) => void;
  onInsertBlock: (template: string) => void;
}

export const PromptComposer: React.FC<Props> = ({
  promptText,
  supportMode,
  promptPlaceholder,
  samplePrompt,
  textareaRef,
  history,
  onChange,
  onSupportModeChange,
  onInsertBlock,
}) => (
  <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-bold text-slate-900">2. Soạn prompt của bạn</h3>
        <p className="mt-1 text-xs text-slate-500">Viết bằng lời của bạn. Các chip chỉ chèn khung ngắn, không chèn đáp án.</p>
      </div>
      <div className="inline-flex rounded-lg bg-slate-100 p-1 text-[11px] font-semibold text-slate-600">
        <button type="button" onClick={() => onSupportModeChange('self')} className={`rounded-md px-2.5 py-1.5 ${supportMode === 'self' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-800'}`}><PenLine className="mr-1 inline h-3 w-3" />Tự làm</button>
        <button type="button" onClick={() => onSupportModeChange('structure')} className={`rounded-md px-2.5 py-1.5 ${supportMode === 'structure' ? 'bg-white text-emerald-800 shadow-sm' : 'hover:text-slate-800'}`}><Puzzle className="mr-1 inline h-3 w-3" />Gợi ý cấu trúc</button>
        <button type="button" onClick={() => onSupportModeChange('sample')} className={`rounded-md px-2.5 py-1.5 ${supportMode === 'sample' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-800'}`}><Eye className="mr-1 inline h-3 w-3" />Xem prompt mẫu</button>
      </div>
    </div>

    {supportMode === 'structure' && (
      <div className="flex flex-wrap gap-2">
        {PROMPT_BLOCKS.map((block) => <button key={block.key} type="button" onClick={() => onInsertBlock(block.template)} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"><Plus className="h-3 w-3" />{block.label}</button>)}
      </div>
    )}

    {supportMode === 'sample' && (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 animate-fadeIn">
        <p className="font-semibold">Prompt mẫu để tham khảo, không tự chèn vào bài làm</p>
        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">{samplePrompt}</pre>
      </div>
    )}

    {history}

    <textarea
      ref={textareaRef}
      rows={10}
      value={promptText}
      onChange={(event) => onChange(event.target.value)}
      placeholder={promptPlaceholder}
      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
    />
  </div>
);
