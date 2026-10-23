import React, { useState } from 'react';
import { 
  Bookmark, 
  Copy, 
  Check, 
  Search, 
  Star, 
  ArrowRight, 
  Sliders, 
  Tag, 
  ArrowLeft,
  Filter,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { SavedPromptTemplate, ClassCohort } from '../../types';
import { getSavedPromptLibrary, togglePromptRecommended } from '../../services/businessEvaluationService';

interface Props {
  cohort: ClassCohort;
  onOpenInPlayground: (promptText: string) => void;
  onBackToDashboard: () => void;
}

export const PromptLibraryView: React.FC<Props> = ({
  cohort,
  onOpenInPlayground,
  onBackToDashboard,
}) => {
  const [library, setLibrary] = useState<SavedPromptTemplate[]>(() => getSavedPromptLibrary());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Lọc danh sách
  const filteredTemplates = library.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.businessUseCase.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.promptText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.techniqueUsed.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'all' || 
      (selectedCategory === 'recommended' && item.isRecommended) ||
      (selectedCategory === 'structured' && item.techniqueUsed.includes('Structured')) ||
      (selectedCategory === 'oneshot' && (item.techniqueUsed.includes('One-shot') || item.techniqueUsed.includes('Few-shot'))) ||
      (selectedCategory === 'grounding' && item.techniqueUsed.includes('Grounding'));

    return matchesSearch && matchesCategory;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = togglePromptRecommended(id);
    setLibrary(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-amber-600" />
            <span>Thư viện Prompt Chuẩn Nghiệp vụ</span>
          </h1>
          <p className="text-xs text-slate-500">
            Kho câu lệnh mẫu để tham khảo, lưu lại và tái sử dụng khi thực hành
          </p>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên prompt, kỹ thuật, tình huống..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-200 pb-3 text-xs">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Tất cả ({library.length})
        </button>

        <button
          onClick={() => setSelectedCategory('recommended')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
            selectedCategory === 'recommended'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span>Khuyên dùng (SOP)</span>
        </button>

        <button
          onClick={() => setSelectedCategory('structured')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
            selectedCategory === 'structured'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Cấu trúc 5 thành tố
        </button>

        <button
          onClick={() => setSelectedCategory('oneshot')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
            selectedCategory === 'oneshot'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Có ví dụ mẫu
        </button>

        <button
          onClick={() => setSelectedCategory('grounding')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
            selectedCategory === 'grounding'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Đối chiếu tài liệu
        </button>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Không tìm thấy prompt phù hợp</h3>
          <p className="text-xs text-slate-500">
            Hãy thử tìm bằng từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh mục.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTemplates.map((tpl) => {
            const isCopied = copiedId === tpl.id;
            const isExpanded = expandedId === tpl.id;

            return (
              <div
                key={tpl.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                {/* Top: Badges & Star */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tpl.isRecommended && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>Khuyên dùng (SOP)</span>
                        </span>
                      )}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {tpl.techniqueUsed}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        v{tpl.versionNumber || 1}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleToggleStar(tpl.id, e)}
                      className="text-slate-300 hover:text-amber-500 transition p-1 cursor-pointer"
                      title={tpl.isRecommended ? 'Bỏ đánh dấu khuyên dùng' : 'Đánh dấu khuyên dùng'}
                    >
                      <Star className={`w-4 h-4 ${tpl.isRecommended ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {tpl.title}
                  </h3>

                  <p className="text-xs text-slate-600 font-medium">
                    {tpl.businessUseCase}
                  </p>

                  {/* Prompt Text Preview Box */}
                  <div className="relative mt-2">
                    <pre className={`text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap ${
                      isExpanded ? '' : 'max-h-32 overflow-hidden'
                    }`}>
                      {tpl.promptText}
                    </pre>

                    {tpl.promptText.length > 200 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold mt-1 cursor-pointer"
                      >
                        {isExpanded ? 'Thu gọn' : 'Xem toàn bộ prompt...'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopy(tpl.promptText, tpl.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onOpenInPlayground(tpl.promptText)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold transition cursor-pointer"
                    title="Đưa câu lệnh này vào bài thực hành để chỉnh sửa và chạy ngay"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đưa vào bài thực hành</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
