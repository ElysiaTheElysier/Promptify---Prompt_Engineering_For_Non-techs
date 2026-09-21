import React from 'react';
import { History, GitCompare, BookmarkPlus, RotateCcw, Check, Sparkles } from 'lucide-react';
import { PromptVersion } from '../../types';

interface Props {
  versions: PromptVersion[];
  selectedVersionNumber: number;
  onSelectVersion: (versionNumber: number) => void;
  onRestorePrompt?: (promptText: string) => void;
  onOpenCompare?: () => void;
  onSaveToLibrary?: (version: PromptVersion) => void;
  className?: string;
}

export const PromptVersionBar: React.FC<Props> = ({
  versions,
  selectedVersionNumber,
  onSelectVersion,
  onRestorePrompt,
  onOpenCompare,
  onSaveToLibrary,
  className = '',
}) => {
  if (versions.length === 0) return null;

  const currentVersion = versions.find(v => v.versionNumber === selectedVersionNumber) || versions[versions.length - 1];
  const isLatest = currentVersion.versionNumber === versions[versions.length - 1].versionNumber;

  return (
    <div className={`p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 font-sans ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Nhãn & Danh sách các version (Lần thử 1 | Lần thử 2 | Lần thử 3...) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 pr-1 flex-shrink-0">
            <History className="w-3.5 h-3.5 text-slate-400" />
            Lịch sử lần thử:
          </span>

          {versions.map((ver) => {
            const isSelected = ver.versionNumber === selectedVersionNumber;
            return (
              <button
                key={ver.id || ver.versionNumber}
                type="button"
                onClick={() => onSelectVersion(ver.versionNumber)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <span>Lần thử {ver.versionNumber}</span>
                {ver.versionNumber === versions.length && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Mới nhất
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Các tác vụ nhanh theo version */}
        <div className="flex items-center gap-2 text-xs">
          {/* Nút Khôi phục câu lệnh cũ vào ô soạn thảo */}
          {!isLatest && onRestorePrompt && (
            <button
              type="button"
              onClick={() => onRestorePrompt(currentVersion.promptText)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium transition shadow-2xs"
              title="Nạp lại câu lệnh này vào ô soạn thảo để tiếp tục sửa đổi"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Khôi phục câu lệnh này</span>
            </button>
          )}

          {/* Nút So sánh với lần trước khi có >= 2 version */}
          {versions.length >= 2 && onOpenCompare && (
            <button
              type="button"
              onClick={onOpenCompare}
              data-tour="tour-compare"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold transition shadow-2xs"
              title="So sánh A/B Before vs After và chấm điểm Business Metrics"
            >
              <GitCompare className="w-3.5 h-3.5 text-emerald-600" />
              <span>So sánh với lần trước</span>
            </button>
          )}

          {/* Nút Lưu vào Thư viện Prompt */}
          {onSaveToLibrary && (
            <button
              type="button"
              onClick={() => onSaveToLibrary(currentVersion)}
              data-tour="tour-library"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold transition shadow-2xs"
              title="Lưu câu lệnh này thành Prompt chuẩn (SOP) để tái sử dụng"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
              <span>Lưu vào thư viện Prompt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

