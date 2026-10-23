import React, { useState } from 'react';
import { 
  Play, 
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Eye, 
  Plus, 
  Copy, 
  Check, 
  X, 
  BookOpen,
  Sparkles,
  Info,
  Key,
  Zap
} from 'lucide-react';
import { LabStep, PromptVersion, ApiConfig } from '../../types';
import { AiEvaluationResult } from '../../types/database';
import { PromptStructurePanel } from './PromptStructurePanel';
import { PromptVersionBar } from '../common/PromptVersionBar';
import { 
  PromptAnalysis, 
  PromptSpan, 
  PromptComponentType 
} from '../../services/promptStructureAnalyzer';
import { 
  getTabnineContextualSuggestion, 
  TabnineSuggestion,
  detectPiiEntities,
  sanitizePii
} from '../../services/labComplianceService';
import { InlineDiffSuggestionCard, DiffSuggestionItem } from './InlineDiffSuggestionCard';

interface PromptComposerProps {
  lab: LabStep;
  promptText: string;
  setPromptText: (text: string) => void;
  systemText: string;
  setSystemText: (text: string) => void;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
  isRunning: boolean;
  runStatus: 'idle' | 'generating' | 'evaluating' | 'error';
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  onRun: () => void;
  versions: PromptVersion[];
  selectedVersionNumber: number;
  onSelectVersion: (vNum: number) => void;
  onRestorePrompt: (restored: string) => void;
  onOpenCompare: () => void;
  onSaveToLibrary: (ver: PromptVersion) => void;
  promptAnalysis: PromptAnalysis;
  selectedSpan: PromptSpan | null;
  onSelectComponent: (type: PromptComponentType) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  apiConfig?: ApiConfig;
  onOpenApiModal?: () => void;
  aiEvaluation?: AiEvaluationResult | null;
  lastEvaluatedPromptText?: string | null;
  onManualPromptChange?: (text: string) => void;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  lab,
  promptText,
  setPromptText,
  systemText,
  setSystemText,
  showAdvancedSettings,
  setShowAdvancedSettings,
  isRunning,
  runStatus,
  errorMessage,
  setErrorMessage,
  onRun,
  versions,
  selectedVersionNumber,
  onSelectVersion,
  onRestorePrompt,
  onOpenCompare,
  onSaveToLibrary,
  promptAnalysis,
  selectedSpan,
  onSelectComponent,
  textareaRef,
  apiConfig,
  onOpenApiModal,
  aiEvaluation,
  lastEvaluatedPromptText,
  onManualPromptChange,
}) => {
  const [showSampleModal, setShowSampleModal] = useState<boolean>(false);
  const [isSampleCopied, setIsSampleCopied] = useState<boolean>(false);

  // Tabnine-style contextual suggestion
  const [tabnineSuggestion, setTabnineSuggestion] = useState<TabnineSuggestion | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState<boolean>(false);

  // Quản lý trạng thái các đề xuất Diff sau khi Giám khảo LLM chấm điểm
  const [dismissedDiffIds, setDismissedDiffIds] = useState<string[]>([]);
  const [activeHighlightedDiffId, setActiveHighlightedDiffId] = useState<string | null>(null);

  // Tự động làm mới danh sách đề xuất khi có kết quả chấm điểm LLM mới
  React.useEffect(() => {
    setDismissedDiffIds([]);
    setActiveHighlightedDiffId(null);
  }, [aiEvaluation]);

  // Gợi ý Diff & Đề xuất sửa CHỈ áp dụng sau khi chạy chấm prompt và có kết quả đánh giá LLM
  // Nếu câu lệnh chưa chạy chấm, tuyệt đối KHÔNG hiển thị gợi ý
  const isCurrentPromptEvaluated = Boolean(
    aiEvaluation &&
    lastEvaluatedPromptText &&
    promptText === lastEvaluatedPromptText &&
    runStatus === 'idle'
  );

  const evaluatedDiffItems: DiffSuggestionItem[] = React.useMemo(() => {
    if (!isCurrentPromptEvaluated || !aiEvaluation) return [];

    const items: DiffSuggestionItem[] = [];

    // 1. Quét PII nhạy cảm thật trong prompt
    const piiCheck = detectPiiEntities(promptText);
    if (piiCheck.hasPii) {
      const lines = promptText.split('\n');
      piiCheck.piiItems.forEach((item, idx) => {
        let replacement = '{{BIẾN}}';
        if (item.type === 'cccd') replacement = '{{SO_CCCD}}';
        else if (item.type === 'phone') replacement = '{{SO_DIEN_THOAI}}';
        else if (item.type === 'bank_account') replacement = '{{SO_TK_NGAN_HANG}}';
        else if (item.type === 'contract_id') replacement = '{{MA_HDTD}}';
        else if (item.type === 'person_name') {
          if (item.value.includes('Tèo')) replacement = '{{TEN_KH}}';
          else if (item.value.includes('Mận')) replacement = '{{VO_KH}}';
          else replacement = '{{TEN_NGUOI}}';
        } else if (item.type === 'serial_id') {
          replacement = '{{SERI_SO_DO}}';
        }

        const fullOrig = lines.find(l => l.includes(item.value)) || item.value;
        const fullRepl = fullOrig.replace(item.value, replacement);

        items.push({
          id: `diff-pii-${idx}-${item.value}`,
          originalText: item.value,
          replacementText: replacement,
          label: `Bảo mật PII: Khử ${item.label}`,
          fullOriginalLine: fullOrig.trim(),
          fullReplacementLine: fullRepl.trim()
        });
      });
    }

    // 2. Quét các tiêu chí chấm điểm từ Giám khảo LLM (scores & rubric) nếu chưa đạt 10/10
    const scores = aiEvaluation.scores;
    if (scores) {
      const promptLower = promptText.toLowerCase();

      // Hoàn thành nhiệm vụ của đúng lesson hiện tại
      if (scores.taskCompletion < 2 && !promptLower.includes('nhiệm vụ')) {
        const repl = `NHIỆM VỤ: ${lab.taskGoal || `Thực hiện đúng yêu cầu của bài ${lab.title}.`}`;
        items.push({
          id: 'diff-task',
          originalText: '(Chưa nêu nhiệm vụ cần thực hiện)',
          replacementText: repl,
          label: 'Cấu trúc: Bổ sung nhiệm vụ của bài',
          fullOriginalLine: '(Chưa có nhiệm vụ rõ ràng)',
          fullReplacementLine: repl,
        });
      }

      // Kiểm tra định dạng đầu ra (formatAdherence < 2)
      if (scores.formatAdherence < 2 && !promptLower.includes('định dạng') && !promptLower.includes('bảng') && !promptText.includes('|')) {
        const repl = `ĐỊNH DẠNG ĐẦU RA: ${lab.expectedOutputFormat || 'Trình bày kết quả ngắn gọn, rõ ràng và đúng cấu trúc yêu cầu.'}`;
        items.push({
          id: 'diff-format',
          originalText: '(Chưa quy định định dạng đầu ra)',
          replacementText: repl,
          label: 'Cấu trúc: Bổ sung khuôn dạng bảng Markdown',
          fullOriginalLine: '(Chưa có định dạng đầu ra)',
          fullReplacementLine: repl
        });
      }

      // Kiểm tra ràng buộc an toàn & kiểm soát (constraintCompliance < 2)
      if (scores.constraintCompliance < 2 && !promptLower.includes('ràng buộc') && !promptLower.includes('tuyệt đối')) {
        const repl = `RÀNG BUỘC: ${lab.systemInstruction || 'Chỉ sử dụng dữ liệu được cung cấp, không tự suy diễn hoặc bổ sung thông tin ngoài nguồn.'}`;
        items.push({
          id: 'diff-constraint',
          originalText: '(Chưa có ràng buộc kiểm soát & an toàn)',
          replacementText: repl,
          label: 'Cấu trúc: Bổ sung ràng buộc kiểm soát',
          fullOriginalLine: '(Chưa có ràng buộc an toàn)',
          fullReplacementLine: repl
        });
      }

      // Kiểm tra bối cảnh nghiệp vụ (groundedness < 2)
      if (scores.groundedness < 2 && !promptLower.includes('bối cảnh') && !promptLower.includes('căn cứ')) {
        const repl = `BỐI CẢNH / DỮ LIỆU ĐẦU VÀO: ${lab.sampleInputContext || lab.scenario || 'Nêu rõ dữ liệu nguồn cần dùng cho nhiệm vụ này.'}`;
        items.push({
          id: 'diff-context',
          originalText: '(Chưa xác định bối cảnh hoặc dữ liệu đầu vào)',
          replacementText: repl,
          label: 'Cấu trúc: Bổ sung dữ liệu của bài',
          fullOriginalLine: '(Chưa có bối cảnh hoặc dữ liệu đầu vào)',
          fullReplacementLine: repl
        });
      }

      // Kiểm tra vai trò chuyên gia (businessUsability < 2)
      if (scores.businessUsability < 2 && !promptLower.includes('vai trò') && !promptLower.includes('bạn là')) {
        const repl = `VAI TRÒ: Bạn là trợ lý chuyên môn phù hợp với bài "${lab.title}".`;
        items.push({
          id: 'diff-role',
          originalText: '(Chưa định nghĩa vai trò chuyên môn)',
          replacementText: repl,
          label: 'Cấu trúc: Bổ sung vai trò chuyên gia',
          fullOriginalLine: '(Chưa có vai trò chuyên gia)',
          fullReplacementLine: repl
        });
      }
    }

    return items;
  }, [isCurrentPromptEvaluated, aiEvaluation, promptText, lab]);

  // Lọc bỏ những mục đã được chấp nhận hoặc bỏ qua
  const activeDiffItems = evaluatedDiffItems.filter(item => !dismissedDiffIds.includes(item.id));

  // 1. DI CHUYỂN TỚI VÀ HIGHLIGHT NƠI SẼ THAY ĐỔI TRONG Ô TEXTAREA KHI ẤN VÀO CARD
  const handleNavigateToDiffItem = (item: DiffSuggestionItem) => {
    setActiveHighlightedDiffId(item.id);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const target = item.originalText;
    const index = promptText.indexOf(target);

    if (index !== -1) {
      // Tính toán cuộn textarea tới đúng dòng cần sửa
      const textBefore = promptText.substring(0, index);
      const lineNumber = textBefore.split('\n').length;
      const lineHeight = 22;
      textarea.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight);

      // Focus và bôi đen vùng text cần sửa
      textarea.focus();
      textarea.setSelectionRange(index, index + target.length);
    } else {
      // Nếu là khối bổ sung mới, cuộn xuống cuối
      textarea.focus();
      textarea.scrollTop = textarea.scrollHeight;
      textarea.setSelectionRange(promptText.length, promptText.length);
    }

    // Hiệu ứng flash highlight màu hổ phách (amber) rõ nét trên textarea
    textarea.classList.remove('ring-4', 'ring-amber-400', 'border-amber-400');
    void textarea.offsetWidth; // trigger reflow
    textarea.classList.add('ring-4', 'ring-amber-400', 'border-amber-400');

    setTimeout(() => {
      textarea.classList.remove('ring-4', 'ring-amber-400', 'border-amber-400');
    }, 1600);
  };

  // 2. ACCEPT ĐƠN LẺ (CHẤP NHẬN TỪNG THAY ĐỔI MỘT)
  const handleAcceptSingleDiffItem = (item: DiffSuggestionItem) => {
    const textarea = textareaRef.current;
    let newPrompt = promptText;
    let newCursorPos = -1;

    const index = promptText.indexOf(item.originalText);
    if (index !== -1) {
      newPrompt = promptText.substring(0, index) + item.replacementText + promptText.substring(index + item.originalText.length);
      newCursorPos = index + item.replacementText.length;
    } else {
      // Bổ sung vào cuối nếu là mục gợi ý cấu trúc mới
      newPrompt = promptText.trim() ? `${promptText.trim()}\n\n${item.replacementText}` : item.replacementText;
      newCursorPos = newPrompt.length;
    }

    setPromptText(newPrompt);
    setDismissedDiffIds(prev => [...prev, item.id]);
    if (activeHighlightedDiffId === item.id) {
      setActiveHighlightedDiffId(null);
    }

    // Flash xanh lá xác nhận thay đổi đơn lẻ thành công
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        if (newCursorPos !== -1) {
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
        textarea.classList.add('ring-4', 'ring-emerald-500', 'border-emerald-500');
        setTimeout(() => {
          textarea.classList.remove('ring-4', 'ring-emerald-500', 'border-emerald-500');
        }, 1200);
      }
    }, 40);
  };

  // 3. REJECT ĐƠN LẺ
  const handleRejectSingleDiffItem = (item: DiffSuggestionItem) => {
    setDismissedDiffIds(prev => [...prev, item.id]);
    if (activeHighlightedDiffId === item.id) {
      setActiveHighlightedDiffId(null);
    }
  };

  // 4. ACCEPT TOÀN BỘ (ACCEPT ALL)
  const handleAcceptAllDiffItems = () => {
    let updatedText = promptText;

    for (const item of activeDiffItems) {
      const idx = updatedText.indexOf(item.originalText);
      if (idx !== -1) {
        updatedText = updatedText.substring(0, idx) + item.replacementText + updatedText.substring(idx + item.originalText.length);
      } else if (!item.originalText.startsWith('(')) {
        updatedText = updatedText.replace(item.originalText, item.replacementText);
      } else {
        updatedText = updatedText.trim() ? `${updatedText.trim()}\n\n${item.replacementText}` : item.replacementText;
      }
    }

    // Khử triệt để PII nếu còn sót
    const piiCheck = detectPiiEntities(updatedText);
    if (piiCheck.hasPii) {
      updatedText = sanitizePii(updatedText);
    }

    setPromptText(updatedText);
    setDismissedDiffIds(prev => [...prev, ...activeDiffItems.map(i => i.id)]);
    setActiveHighlightedDiffId(null);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.classList.add('ring-4', 'ring-emerald-500', 'border-emerald-500');
      setTimeout(() => {
        textarea.classList.remove('ring-4', 'ring-emerald-500', 'border-emerald-500');
      }, 1500);
    }
  };

  // 5. REJECT TOÀN BỘ (REJECT ALL)
  const handleRejectAllDiffItems = () => {
    setDismissedDiffIds(prev => [...prev, ...activeDiffItems.map(i => i.id)]);
    setActiveHighlightedDiffId(null);
  };

  const handleCheckSuggestion = (text: string, cursorPos: number) => {
    if (suggestionDismissed || !isCurrentPromptEvaluated) {
      setTabnineSuggestion(null);
      return;
    }
    const suggestion = getTabnineContextualSuggestion(text, cursorPos, lab);
    setTabnineSuggestion(suggestion);
  };

  const handleAcceptTabnine = () => {
    if (!tabnineSuggestion || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? promptText.length;
    const end = textarea.selectionEnd ?? promptText.length;

    const newText = promptText.substring(0, start) + tabnineSuggestion.suggestionText + promptText.substring(end);
    setPromptText(newText);
    const newPos = start + tabnineSuggestion.suggestionText.length;
    setTabnineSuggestion(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 30);
  };

  // Chèn một thành phần cấu trúc ngắn (Scaffold tag) vào vị trí con trỏ hoặc cuối prompt
  const insertScaffoldTag = (label: string) => {
    const textarea = textareaRef.current;
    const tagToInsert = `\n${label}: `;

    if (!promptText.trim()) {
      const initial = `${label}: `;
      setPromptText(initial);
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(initial.length, initial.length);
        }
      }, 50);
      return;
    }

    if (textarea) {
      const start = textarea.selectionStart ?? promptText.length;
      const end = textarea.selectionEnd ?? promptText.length;
      const newText = promptText.substring(0, start) + tagToInsert + promptText.substring(end);
      setPromptText(newText);
      const newCursorPos = start + tagToInsert.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 50);
    } else {
      setPromptText(promptText + tagToInsert);
    }
  };

  // Chèn trọn bộ khung sườn 5 thành phần nếu ô prompt đang trống
  const insertFullSkeleton = () => {
    const skeleton = `Vai trò: \nBối cảnh: \nNhiệm vụ: \nRàng buộc: \nĐịnh dạng đầu ra: `;
    setPromptText(skeleton);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(9, 9); // đặt sau "Vai trò: "
      }
    }, 50);
  };

  const handleCopySample = () => {
    if (lab.improvedPrompt) {
      const normalized = lab.improvedPrompt.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      navigator.clipboard.writeText(normalized);
      setIsSampleCopied(true);
      setTimeout(() => setIsSampleCopied(false), 1500);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4" data-tour="tour-prompt">
      {/* 1. Header của vùng soạn thảo: Tiêu đề & 3 tầng trợ giúp */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Ô Soạn thảo Prompt
          </h3>
          <span className="text-[11px] text-slate-500 font-normal hidden sm:inline">
            (Tự viết để rèn tư duy)
          </span>

          {/* Badge trạng thái AI Engine & Click mở Cấu hình API */}
          {onOpenApiModal && (
            <button
              type="button"
              onClick={onOpenApiModal}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer border shadow-2xs ${
                apiConfig?.mode === 'simulated'
                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              }`}
              title="Nhấp để cấu hình Động cơ AI (Server Live hoặc Mô phỏng)"
            >
              {apiConfig?.mode === 'simulated' ? (
                <>
                  <Zap className="w-3 h-3 text-amber-600" />
                  <span>Mô phỏng</span>
                </>
              ) : (
                <>
                  <Key className="w-3 h-3 text-emerald-600" />
                  <span>Live AI (Server)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Prompt mẫu chỉ để tham khảo, không tự chèn hoặc ghi đè bài làm. */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowSampleModal(true)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Xem gợi ý câu lệnh chuẩn mẫu (không tự động ghi đè bài làm của bạn)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem mẫu chuẩn</span>
          </button>
        </div>
      </div>

      {/* 2. Thanh chuyển đổi phiên bản câu lệnh (Lần thử 1 | Lần thử 2 | Lần thử 3...) */}
      {versions.length > 0 && (
        <PromptVersionBar
          versions={versions}
          selectedVersionNumber={selectedVersionNumber}
          onSelectVersion={onSelectVersion}
          onRestorePrompt={onRestorePrompt}
          onOpenCompare={onOpenCompare}
          onSaveToLibrary={onSaveToLibrary}
        />
      )}

      {/* 3. Tầng 2: Cấu trúc & Gợi ý chèn thẻ Prompt hợp nhất */}
      <PromptStructurePanel
        analysis={promptAnalysis}
        focusComponents={lab.focusComponents}
        selectedSpan={selectedSpan}
        onSelectComponent={onSelectComponent}
        onInsertTag={insertScaffoldTag}
        onInsertSkeleton={insertFullSkeleton}
        canInsertSkeleton={!promptText.trim()}
      />

      {/* 4. Khung Input Field Soạn thảo Prompt với Gợi ý & Diff tích hợp trực tiếp bên trong */}
      <div className="relative rounded-2xl border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-50/60 focus-within:bg-white overflow-hidden transition shadow-2xs">
        {/* Textarea chính */}
        <textarea
          ref={textareaRef}
          rows={8}
          value={promptText}
          onChange={(e) => {
            const val = e.target.value;
            setPromptText(val);
            if (onManualPromptChange) {
              onManualPromptChange(val);
            }
            if (errorMessage) setErrorMessage(null);
            setSuggestionDismissed(false);
            setTabnineSuggestion(null);
          }}
          onKeyUp={(e) => {
            if (isCurrentPromptEvaluated) {
              const target = e.target as HTMLTextAreaElement;
              handleCheckSuggestion(target.value, target.selectionStart);
            }
          }}
          onClick={(e) => {
            if (isCurrentPromptEvaluated) {
              const target = e.target as HTMLTextAreaElement;
              handleCheckSuggestion(target.value, target.selectionStart);
            }
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              if (!isRunning && promptText.trim()) {
                onRun();
              }
            } else if (e.key === 'Tab' && tabnineSuggestion && isCurrentPromptEvaluated) {
              e.preventDefault();
              handleAcceptTabnine();
            } else if (e.key === 'Escape' && tabnineSuggestion) {
              setTabnineSuggestion(null);
              setSuggestionDismissed(true);
            }
          }}
          placeholder={lab.promptPlaceholder || "Nhập câu lệnh của bạn tại đây... (Ví dụ: Bạn là chuyên viên...)"}
          className="w-full p-4 sm:p-5 text-sm sm:text-base font-sans text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none leading-relaxed transition resize-y custom-scrollbar-light min-h-[220px] 2xl:min-h-[280px]"
        />

        {/* Gợi ý hoàn thiện (Tabnine style) gắn liền ngay chân input field - CHỈ hiển thị sau khi chạy chấm */}
        {isCurrentPromptEvaluated && tabnineSuggestion && !suggestionDismissed && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white text-xs border-t border-emerald-500/40 animate-fadeIn">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
              <span className="font-bold text-emerald-400 shrink-0 text-[11px]">
                Gợi ý chèn (Tabnine style):
              </span>
              <span className="text-slate-200 font-mono text-[11px] truncate">
                "{tabnineSuggestion.suggestionText.trim()}"
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAcceptTabnine}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                title="Nhấn phím Tab để chèn ngay"
              >
                <span>Chèn</span>
                <kbd className="bg-emerald-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-mono shadow-2xs">Tab ⇥</kbd>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTabnineSuggestion(null);
                  setSuggestionDismissed(true);
                }}
                className="text-slate-400 hover:text-white px-1.5 py-0.5 text-xs transition cursor-pointer"
                title="Bỏ qua (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Bảng Diff Đề Xuất Chuẩn IDE - CHỈ hiển thị sau khi chạy chấm prompt qua lớp chấm LLM */}
        {isCurrentPromptEvaluated && activeDiffItems.length > 0 && (
          <div className="border-t border-slate-700/80 p-2.5 bg-[#12121a]">
            <InlineDiffSuggestionCard
              items={activeDiffItems}
              title="Đề xuất tối ưu sau khi Giám khảo LLM chấm điểm"
              evaluationScore={aiEvaluation?.total}
              activeItemId={activeHighlightedDiffId}
              onItemClick={handleNavigateToDiffItem}
              onAcceptItem={handleAcceptSingleDiffItem}
              onRejectItem={handleRejectSingleDiffItem}
              onAcceptAll={handleAcceptAllDiffItems}
              onRejectAll={handleRejectAllDiffItems}
            />
          </div>
        )}
      </div>

      {/* 6. Thiết lập nâng cao (Vai trò hệ thống - System Instruction) */}
      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Thiết lập nâng cao (Vai trò hệ thống)</span>
          {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvancedSettings && (
          <div className="mt-2.5 p-3 bg-slate-50 rounded-xl space-y-1.5 animate-fadeIn border border-slate-200">
            <label className="text-xs font-semibold text-slate-700 block">
              Vai trò hệ thống (Chỉ dẫn ngầm cho AI):
            </label>
            <input
              type="text"
              value={systemText}
              onChange={(e) => setSystemText(e.target.value)}
              placeholder="Ví dụ: Bạn là trợ lý chuyên môn cho nhiệm vụ này..."
              className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
            />
          </div>
        )}
      </div>

      {/* 7. Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 8. CTA chính: CHẠY PROMPT */}
      <button
        type="button"
        onClick={onRun}
        disabled={isRunning || !promptText.trim()}
        data-tour="tour-run"
        className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
      >
        <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
        <span>
          {runStatus === 'generating' 
            ? 'Đang tạo câu trả lời...' 
            : runStatus === 'evaluating' 
            ? 'AI đang đánh giá câu lệnh...' 
            : isRunning 
            ? 'Đang xử lý...' 
            : 'Chạy Prompt'}
        </span>
        <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-medium opacity-80 border border-emerald-400/40 bg-emerald-700/60 px-1.5 py-0.5 rounded">
          Ctrl + Enter
        </span>
      </button>

      {/* MODAL THAM KHẢO CÂU LỆNH MẪU (TIER 3) */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Prompt mẫu tham khảo — {lab.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 flex items-start gap-2 border border-amber-200/70">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Đây là một cách làm tốt, không phải đáp án duy nhất.</strong> Hãy đối chiếu với cấu trúc prompt bạn đã tự viết. Mẫu không tự chèn hoặc ghi đè bài làm.
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Nội dung câu lệnh mẫu:</span>
                <button
                  type="button"
                  onClick={handleCopySample}
                  disabled={!lab.improvedPrompt.trim()}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 transition"
                >
                  {isSampleCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isSampleCopied ? 'Đã sao chép' : 'Sao chép mẫu'}</span>
                </button>
              </div>

              {lab.improvedPrompt.trim() ? (
                <pre className="p-3.5 bg-slate-50 text-slate-800 rounded-xl text-xs font-sans whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-slate-200 select-text custom-scrollbar-light shadow-2xs">
                  {lab.improvedPrompt.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t')}
                </pre>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Lesson này chưa có prompt mẫu.</p>
              )}
            </div>

            {lab.expectedOutputFormat && (
              <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                <span className="font-semibold text-slate-700">Định dạng kỳ vọng:</span> {lab.expectedOutputFormat}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Đóng
              </button>
              {lab.improvedPrompt.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const normalized = lab.improvedPrompt.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                    setPromptText(normalized);
                    setShowSampleModal(false);
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                >
                  Áp dụng vào ô soạn thảo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
