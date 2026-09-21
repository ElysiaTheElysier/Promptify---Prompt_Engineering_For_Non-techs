import React, { useState } from 'react';
import { 
  X, 
  Bookmark, 
  Copy, 
  Check, 
  Search, 
  Star, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  Tag, 
  FileText,
  Clock
} from 'lucide-react';
import { SavedPromptTemplate } from '../../types';
import { getSavedPromptLibrary, togglePromptRecommended } from '../../services/businessEvaluationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt?: (promptText: string) => void;
}

export const PromptLibraryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplyPrompt,
}) => {
  const [library, setLibrary] = useState<SavedPromptTemplate[]>(() => getSavedPromptLibrary());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Cập nhật thư viện mỗi khi mở
  React.useEffect(() => {
    if (isOpen) {
      const items = getSavedPromptLibrary();
      setLibrary(items);
      if (items.length > 0 && !selectedPromptId) {
        setSelectedPromptId(items[0].id);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleRecommended = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = togglePromptRecommended(id);
    setLibrary(updated);
  };

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleApply = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (onApplyPrompt) {
      onApplyPrompt(text);
      setAppliedId(id);
      setTimeout(() => {
        setAppliedId(null);
        onClose();
      }, 600);
    }
  };

  // Lọc theo tìm kiếm
  const filteredPrompts = library.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.businessUseCase.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.techniqueUsed.toLowerCase().includes(q)
    );
  });

  const activePrompt = library.find(p => p.id === selectedPromptId) || filteredPrompts[0] || library[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Bookmark className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Thư Viện Prompt Nghiệp Vụ (SOP Library)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {library.length} mẫu đã duyệt
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kho câu lệnh mẫu chuẩn hóa dành riêng cho cán bộ Agribank · Tái sử dụng chỉ với 1 click
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên prompt, nhiệm vụ, phòng ban..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
          </div>

          <span className="text-xs text-slate-500">
            Hiển thị <strong>{filteredPrompts.length}</strong> / {library.length} prompt
          </span>
        </div>

        {/* Nội dung 2 cột: Danh sách bên trái, Chi tiết bên phải */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* CỘT TRÁI (5 cột): DANH SÁCH PROMPT */}
          <div className="md:col-span-5 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {filteredPrompts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Không tìm thấy mẫu prompt nào phù hợp từ khóa.
              </div>
            ) : (
              filteredPrompts.map((p) => {
                const isSelected = activePrompt?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPromptId(p.id)}
                    className={`p-3 rounded-xl cursor-pointer transition text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-amber-50/70 border border-amber-300 shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-bold block leading-snug ${isSelected ? 'text-amber-950' : 'text-slate-800'}`}>
                        {p.title}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleRecommended(p.id, e)}
                        className="text-slate-300 hover:text-amber-500 transition flex-shrink-0"
                        title={p.isRecommended ? 'Đã đánh dấu Khuyên dùng' : 'Đánh dấu Khuyên dùng'}
                      >
                        <Star className={`w-4 h-4 ${p.isRecommended ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {p.businessUseCase}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-0.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {p.department}
                      </span>
                      {p.isRecommended && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                          ★ Khuyên dùng
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* CỘT PHẢI (7 cột): CHI TIẾT PROMPT ĐƯỢC CHỌN */}
          <div className="md:col-span-7 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
            {activePrompt ? (
              <div className="space-y-4">
                {/* Tiêu đề & metadata */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {activePrompt.techniqueUsed}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Lưu ngày {activePrompt.createdAt}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {activePrompt.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Nhiệm vụ nghiệp vụ:</strong> {activePrompt.businessUseCase}
                  </p>

                  <div className="pt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>🏢 <strong>Khối:</strong> {activePrompt.department}</span>
                    <span>•</span>
                    <span>👤 <strong>Tác giả:</strong> {activePrompt.author || 'Cán bộ'}</span>
                  </div>
                </div>

                {/* Nội dung Prompt hoàn chỉnh */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Nội dung câu lệnh (Prompt Template):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activePrompt.promptText, activePrompt.id)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition"
                    >
                      {copiedId === activePrompt.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Sao chép Prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="font-mono text-xs text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {activePrompt.promptText}
                  </pre>
                </div>

                {/* Kết quả mẫu (Sample Output) nếu có */}
                {activePrompt.sampleOutputSnippet && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Mẫu kết quả đầu ra:
                    </span>
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto border border-slate-200">
                      {activePrompt.sampleOutputSnippet}
                    </div>
                  </div>
                )}

                {/* Nút hành động chính: Dùng Prompt này */}
                {onApplyPrompt && (
                  <button
                    type="button"
                    onClick={() => handleApply(activePrompt.promptText, activePrompt.id)}
                    className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    {appliedId === activePrompt.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Đã nạp prompt vào ô soạn thảo!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Nạp Prompt này vào bài thực hành hiện tại</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Chọn một prompt ở danh sách bên trái để xem chi tiết.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span>
            Thư viện SOP lưu trữ trong trình duyệt của bạn · Sẵn sàng mở rộng đồng bộ hệ thống LMS Agribank
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
