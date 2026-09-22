import React from 'react';
import { History, GitCompare, BookmarkPlus, RotateCcw } from 'lucide-react';
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
    <div className={`p-2 bg-slate-50/90 border border-slate-200/90 rounded-xl flex flex-wrap items-center justify-between gap-2.5 font-sans ${className}`}>
      {/* 1. Bên trái: Dropdown chọn lần thử & Nút khôi phục nếu chọn phiên bản cũ */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-500">
          <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 shrink-0">Lịch sử thử:</span>
        </div>

        {/* Dropdown Select thu gọn */}
        <select
          value={selectedVersionNumber || versions[versions.length - 1]?.versionNumber}
          onChange={(e) => onSelectVersion(Number(e.target.value))}
          className="bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-medium py-1 px-2.5 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none cursor-pointer shadow-2xs transition"
          title="Chọn lần thử để xem lại câu lệnh và kết quả đánh giá"
        >
          {versions.map((ver) => (
            <option key={ver.id || ver.versionNumber} value={ver.versionNumber}>
              Lần thử {ver.versionNumber} {ver.versionNumber === versions.length ? '(Mới nhất)' : ''} {ver.aiEvaluation ? `• ${ver.aiEvaluation.total}/10đ` : ''} {ver.timestamp ? `(${ver.timestamp})` : ''}
            </option>
          ))}
        </select>

        <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
          ({versions.length} lần thử)
        </span>

        {/* Nút Khôi phục câu lệnh cũ vào ô soạn thảo khi học viên đang chọn lần thử cũ */}
        {!isLatest && onRestorePrompt && (
          <button
            type="button"
            onClick={() => onRestorePrompt(currentVersion.promptText)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs transition shadow-2xs cursor-pointer active:scale-95"
            title="Nạp lại câu lệnh này vào ô soạn thảo để tiếp tục sửa đổi"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Khôi phục lần này</span>
          </button>
        )}
      </div>

      {/* 2. Bên phải: Tác vụ So sánh đối chiếu & Lưu SOP vào thư viện */}
      <div className="flex items-center gap-2">
        {/* Nút So sánh A/B Before vs After (chỉ hiện khi có từ 2 lần thử trở lên) */}
        {versions.length >= 2 && onOpenCompare && (
          <button
            type="button"
            onClick={onOpenCompare}
            data-tour="tour-compare"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition shadow-2xs cursor-pointer active:scale-95"
            title="Mở bảng đối chiếu song song để xem rõ câu lệnh đã thay đổi ở đâu và kết quả tốt hơn như thế nào"
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 font-medium text-xs transition shadow-2xs cursor-pointer active:scale-95"
            title="Lưu câu lệnh này thành Prompt chuẩn (SOP) để tái sử dụng"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
            <span>Lưu vào thư viện</span>
          </button>
        )}
      </div>
    </div>
  );
};
