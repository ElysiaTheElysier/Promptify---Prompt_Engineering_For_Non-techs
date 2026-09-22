import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Lightbulb, 
  BookOpen, 
  CheckCircle2, 
  Sparkles,
  Compass,
  Bot,
  Maximize2,
  Minimize2,
  Check,
  ShieldAlert,
  ArrowRight,
  Search,
  Zap,
  Sliders,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { LabStep, UIMode } from '../../types';
import { evaluatePromptRubric } from '../../services/llmService';
import { detectPiiEntities, sanitizePii } from '../../services/labComplianceService';
import { InlineDiffSuggestionCard, DiffSuggestionItem } from '../prompt/InlineDiffSuggestionCard';

interface Props {
  currentMode: UIMode;
  activeLab: LabStep;
  currentPrompt: string;
  runCount: number;
  onApplyPromptSuggestion?: (suggestion: string) => void;
  onOpenTutorial?: () => void;
}

export interface SuggestionPayload {
  id: string;
  type: 'pii' | 'structure' | 'autocomplete' | 'rubric_diff';
  title: string;
  description?: string;
  items: DiffSuggestionItem[];
  suggestedPrompt: string;
  applied?: boolean;
}

interface Message {
  id: string;
  sender: 'coach' | 'user';
  text: string;
  timestamp: string;
}

// Từ điển gợi ý nhanh khi gõ trong ô chat (Ghost Text Autocompletion)
const CHAT_AUTOCOMPLETE_DICTIONARY = [
  'kiểm tra câu lệnh prompt của tôi',
  'đề xuất tối ưu (Diff) cho câu lệnh',
  'gợi ý cho bước này',
  'giải thích ý nghĩa bài tập này',
  'xóa thông tin nhạy cảm PII trong prompt',
  'làm sao để AI trả về bảng Markdown?',
  'cách thêm vai trò cán bộ ngân hàng Agribank',
  'làm sao để chống AI bịa số liệu tài chính?'
];

export const AiCoach: React.FC<Props> = ({
  activeLab,
  currentPrompt,
  runCount,
  onApplyPromptSuggestion,
  onOpenTutorial,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(() => {
    return localStorage.getItem('promptify_coach_intro_dismissed') !== 'true';
  });

  const [inputText, setInputText] = useState<string>('');
  const [ghostText, setGhostText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Đề xuất gắn liền trực tiếp trên ô input field (KHÔNG sinh bong bóng chat)
  const [activeInputSuggestion, setActiveInputSuggestion] = useState<SuggestionPayload | null>(null);
  const [suggestionAppliedToast, setSuggestionAppliedToast] = useState<boolean>(false);

  // Mô tả bài tập theo ngôn ngữ nghiệp vụ ngân hàng
  const getFriendlyExerciseDescription = (order: number) => {
    switch (order) {
      case 1:
        return 'Bạn đang viết câu lệnh phân tích phản hồi khách hàng và chuẩn hóa bảo mật dữ liệu định danh (PII)...';
      case 2:
        return 'Bạn đang học cách cấu trúc câu lệnh chuyên nghiệp với 5 thành phần chuẩn hóa Agribank...';
      case 3:
        return 'Bạn đang hướng dẫn AI thông qua ví dụ mẫu để cố định phong cách văn bản ngân hàng...';
      case 4:
        return 'Bạn đang phân loại các tình huống phức tạp bằng nhiều ví dụ đa dạng...';
      case 5:
        return 'Bạn đang neo câu trả lời vào tài liệu thực tế để chống AI bịa đặt số liệu tài chính...';
      default:
        return 'Bạn đang thực hành bài tập nâng cao kỹ năng prompt công nghệ ngân hàng...';
    }
  };

  const friendlyDesc = getFriendlyExerciseDescription(activeLab.order);

  // Câu hỏi gợi mở khởi tạo thân thiện
  const getInitialCoachQuestion = (): string => {
    switch (activeLab.order) {
      case 1:
        return `Chào bạn! Tôi là Trợ Lý AI Đồng Hành của bạn.\n\nỞ bài tập này: ${friendlyDesc}\n\nBạn hãy quan sát xem: Câu lệnh của bạn đã xóa các thông tin định danh cá nhân (PII như CCCD, SĐT) và quy định rõ xuất báo cáo dạng bảng chưa?`;
      case 2:
        return `Chào bạn! Ở bài cấu trúc câu lệnh này, hãy kiểm tra xem bạn đã nêu đủ 5 ý: Vai trò (Ai làm?) - Ngữ cảnh - Nhiệm vụ - Ràng buộc - Định dạng bảng chưa?`;
      case 3:
        return `Chào bạn! Khi dạy AI qua ví dụ mẫu, ví dụ bạn đưa ra có đúng phong cách chu đáo và bảng biểu bạn mong muốn không?`;
      case 4:
        return `Chào bạn! Khi có nhiều tình huống khác nhau, các ví dụ bạn đưa ra đã bao quát được cả khen, chê và khiếu nại chưa?`;
      case 5:
        return `Chào bạn! Ở bài này cần cẩn trọng chống AI bịa số liệu. Kết luận này dựa trên tài liệu nào? Có trích dẫn cụ thể chưa?`;
      default:
        return `Chào bạn! Tôi đang đồng hành cùng bạn ở Bài ${activeLab.order}. Bạn cần tôi hỗ trợ góc nhìn hay đưa ra đề xuất tối ưu prompt không?`;
    }
  };

  // Tạo đề xuất diff cho prompt hiện tại
  const createPromptDiffSuggestion = (prompt: string): SuggestionPayload | null => {
    if (!prompt.trim()) return null;

    // 1. Ưu tiên kiểm tra PII
    const piiCheck = detectPiiEntities(prompt);
    if (piiCheck.hasPii) {
      const piiItems: DiffSuggestionItem[] = piiCheck.piiItems.map((item, idx) => {
        let replacement = '{{BIẾN}}';
        if (item.type === 'cccd') replacement = '{{SO_CCCD}}';
        else if (item.type === 'phone') replacement = '{{SO_DT}}';
        else if (item.type === 'bank_account') replacement = '{{SO_TK_NGAN_HANG}}';
        else if (item.type === 'contract_id') replacement = '{{MA_HDTD}}';
        else if (item.type === 'person_name') {
          if (item.value.includes('Tèo')) replacement = '{{TEN_KH}}';
          else if (item.value.includes('Mận')) replacement = '{{VO_KH}}';
          else replacement = '{{TEN_NGUOI}}';
        } else if (item.type === 'serial_id') {
          replacement = '{{SERI_SO_DO}}';
        }
        return {
          id: `chat-pii-${idx}-${item.value}`,
          originalText: item.value,
          replacementText: replacement,
          label: item.label
        };
      });

      const sanitized = sanitizePii(prompt);
      return {
        id: `sugg-pii-${Date.now()}`,
        type: 'pii',
        title: 'Đề xuất chuẩn hóa PII (Bảo mật Agribank)',
        description: 'Phát hiện dữ liệu định danh khách hàng nhạy cảm. Khuyến nghị thay thế bằng biến giả lập.',
        items: piiItems,
        suggestedPrompt: sanitized
      };
    }

    // 2. Kiểm tra cấu trúc Rubric
    const audit = evaluatePromptRubric(prompt);
    const missingItems: DiffSuggestionItem[] = [];
    let improved = prompt.trim();

    if (audit.personaScore < 15) {
      missingItems.push({
        id: `sugg-role-${Date.now()}`,
        originalText: '(Chưa định nghĩa vai trò)',
        replacementText: 'BẠN LÀ AI: Chuyên viên Phân tích Dữ liệu / Cán bộ Ngân hàng Agribank.',
        label: 'Vai trò chuyên môn'
      });
      improved = `BẠN LÀ AI: Chuyên viên Phân tích Nghiệp vụ Agribank.\n\n` + improved;
    }

    if (audit.formatScore < 15) {
      missingItems.push({
        id: `sugg-format-${Date.now()}`,
        originalText: '(Chưa có định dạng xuất bảng)',
        replacementText: 'ĐỊNH DẠNG ĐẦU RA: Xuất báo cáo bằng Bảng Markdown gồm [STT | Tiêu chí | Nội dung | Hướng xử lý].',
        label: 'Định dạng báo cáo'
      });
      improved = improved + `\n\nĐỊNH DẠNG ĐẦU RA: Xuất kết quả dưới dạng Bảng Markdown chuyên nghiệp, dễ sao chép vào Excel.`;
    }

    if (audit.guardrailsScore < 10) {
      missingItems.push({
        id: `sugg-guard-${Date.now()}`,
        originalText: '(Chưa có quy tắc an toàn)',
        replacementText: 'RÀNG BUỘC: Đi thẳng vào nội dung chính, không chào hỏi xã giao, bám sát sự thật 100%.',
        label: 'Ràng buộc an toàn'
      });
      improved = improved + `\nRÀNG BUỘC: Không tự bịa thông tin, đi thẳng vào báo cáo.`;
    }

    if (missingItems.length > 0) {
      return {
        id: `sugg-struct-${Date.now()}`,
        type: 'structure',
        title: 'Đề xuất nâng cấp cấu trúc Prompt (Chuẩn Agribank)',
        description: 'Bổ sung các thành phần nghiệp vụ còn thiếu để đạt điểm tối đa trên thang Rubric.',
        items: missingItems,
        suggestedPrompt: improved
      };
    }

    return null;
  };

  // Khởi tạo tin nhắn chào mừng (không chèn thẻ đề xuất vào danh sách bong bóng)
  useEffect(() => {
    const welcomeMsg: Message = {
      id: `welcome-${activeLab.id}-${Date.now()}`,
      sender: 'coach',
      text: getInitialCoachQuestion(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);

    // Kiểm tra PII và gán thẳng vào ô input field (nếu có PII)
    const diff = createPromptDiffSuggestion(currentPrompt);
    if (diff && diff.type === 'pii') {
      setActiveInputSuggestion(diff);
    } else {
      setActiveInputSuggestion(null);
    }
  }, [activeLab.id]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleDismissBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSpeechBubble(false);
    localStorage.setItem('promptify_coach_intro_dismissed', 'true');
  };

  const handleOpenCoach = () => {
    setIsOpen(true);
    setShowSpeechBubble(false);
    localStorage.setItem('promptify_coach_intro_dismissed', 'true');
    // Kiểm tra nhanh đề xuất gắn vào input field
    const diff = createPromptDiffSuggestion(currentPrompt);
    if (diff) {
      setActiveInputSuggestion(diff);
    }
  };

  // Áp dụng đề xuất từ input field vào câu lệnh
  const handleApplyActiveInputSuggestion = () => {
    if (!activeInputSuggestion) return;

    if (onApplyPromptSuggestion) {
      onApplyPromptSuggestion(activeInputSuggestion.suggestedPrompt);
    } else {
      window.dispatchEvent(new CustomEvent('promptify:apply-suggestion', { detail: { prompt: activeInputSuggestion.suggestedPrompt } }));
    }

    setActiveInputSuggestion(null);
    setSuggestionAppliedToast(true);
    setTimeout(() => setSuggestionAppliedToast(false), 2500);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Nút Quick Action: Kích hoạt đề xuất trực tiếp trên input field (KHÔNG TẠO BONG BÓNG)
  const handleGeneratePromptDiff = () => {
    if (!currentPrompt.trim()) {
      setActiveInputSuggestion(null);
      const coachMsg: Message = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: 'Ô soạn thảo Prompt hiện chưa có nội dung. Bạn hãy gõ thử câu lệnh hoặc nạp câu lệnh mẫu của bài tập để nhận đề xuất so khớp nhé!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, coachMsg]);
      return;
    }

    const diffSugg = createPromptDiffSuggestion(currentPrompt);

    if (diffSugg) {
      // Hiển thị ngay trong input field container, không đẩy vào messages
      setActiveInputSuggestion(diffSugg);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setActiveInputSuggestion(null);
      const coachMsg: Message = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: 'Tuyệt vời! Câu lệnh hiện tại của bạn đã bảo đảm an toàn dữ liệu và tuân thủ các quy tắc cốt lõi của bài này.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, coachMsg]);
    }
  };

  // Xử lý gõ văn bản và tính toán Ghost Text Autocompletion trong ô input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!val.trim()) {
      setGhostText('');
      return;
    }

    const valLower = val.toLowerCase().trim();
    // Tìm gợi ý khớp bắt đầu
    const matched = CHAT_AUTOCOMPLETE_DICTIONARY.find(item => 
      item.toLowerCase().startsWith(valLower) && item.length > valLower.length
    );

    if (matched) {
      // Đoạn text còn lại để hiển thị ghost text
      setGhostText(matched.slice(val.length));
    } else {
      setGhostText('');
    }
  };

  // Phím bấm Tab để nhận ghost text hoặc áp dụng đề xuất
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      if (ghostText) {
        e.preventDefault();
        setInputText(inputText + ghostText);
        setGhostText('');
      } else if (activeInputSuggestion) {
        e.preventDefault();
        handleApplyActiveInputSuggestion();
      }
    } else if (e.key === 'Escape') {
      if (activeInputSuggestion) {
        e.preventDefault();
        setActiveInputSuggestion(null);
      } else if (ghostText) {
        e.preventDefault();
        setGhostText('');
      }
    }
  };

  const handleAcceptGhostText = () => {
    if (ghostText) {
      setInputText(inputText + ghostText);
      setGhostText('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // 1. "Gợi ý cho bước này"
  const handleQuickHint = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Gợi ý cho bước này',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    let replyText = '';
    if (runCount === 0) {
      replyText = `Gợi ý trước khi bạn chạy thử:\n\n• ${activeLab.hints[0] || 'Bắt đầu bằng việc đặt vai trò chuyên môn cho AI.'}\n• ${activeLab.hints[1] || 'Quy định rõ ràng định dạng bảng bạn muốn nhận được.'}\n\nBạn cứ tự nhiên gõ thử một câu lệnh ban đầu rồi bấm "Chạy prompt" để rèn luyện tư duy nhé!`;
    } else {
      replyText = `Gợi ý nâng cấp cho Bài ${activeLab.order}:\n\n` + 
        activeLab.hints.map((h, i) => `${i + 1}. ${h}`).join('\n') +
        `\n\nBạn có thể xem phần đề xuất sửa đổi ngay trên ô nhập liệu bên dưới để chèn nhanh vào câu lệnh!`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 2. "Giải thích ý nghĩa"
  const handleQuickConcept = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Giải thích ý nghĩa bài này',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    let explanation = '';
    switch (activeLab.order) {
      case 1:
        explanation = 'Vì sao câu lệnh ngắn lại cho kết quả kém?\nKhi chỉ nói chung chung "Hãy phân tích...", AI phải tự suy đoán bạn cần văn xuôi hay bảng biểu, dẫn đến phản hồi dài dòng, chứa thông tin nhạy cảm và khó đưa vào báo cáo.';
        break;
      case 2:
        explanation = 'Cấu trúc 5 thành phần chuyên nghiệp:\nTương tự như việc giao nhiệm vụ cho nhân viên mới: Nói rõ bạn là ai, bối cảnh là gì, nhiệm vụ làm gì, điều gì cấm làm, và nộp báo cáo bằng bảng Markdown.';
        break;
      case 3:
        explanation = 'Dạy AI bằng ví dụ mẫu (Few-shot):\nThay vì giải thích dài dòng "Hãy viết văn phong chu đáo", bạn đưa ra 1 ví dụ chuẩn, AI sẽ bắt chước chính xác phong cách xưng hô và cấu trúc.';
        break;
      case 4:
        explanation = 'Dạy bằng nhiều ví dụ đa dạng:\nKhi có nhiều trường hợp cần phân biệt (Khen ngợi, Khiếu nại, Góp ý), việc đưa ví dụ bao quát giúp AI phân loại chính xác 100%.';
        break;
      case 5:
        explanation = 'Neo thông tin vào tài liệu thực tế (Grounding):\nTriệt tiêu hiện tượng AI tự bịa số liệu bằng cách bắt buộc: Chỉ trả lời dựa trên những gì có trong văn bản được cung cấp.';
        break;
      default:
        explanation = `${activeLab.conceptTitle}:\n${activeLab.conceptExplanation}`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: explanation,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 3. "Kiểm tra câu lệnh"
  const handleQuickAudit = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Kiểm tra câu lệnh của tôi',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const audit = evaluatePromptRubric(currentPrompt);
    let feedback = '';

    if (!currentPrompt.trim()) {
      feedback = 'Ô câu lệnh của bạn hiện đang để trống. Hãy thử gõ một câu lệnh theo cách bạn muốn giao việc cho trợ lý rồi bấm lại để tôi góp ý nhé!';
      const coachMsg: Message = {
        id: `coach-${Date.now() + 1}`,
        sender: 'coach',
        text: feedback,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg, coachMsg]);
      return;
    }

    const points: string[] = [];
    if (audit.personaScore < 15) {
      points.push('• Bạn chưa nêu rõ vai trò chuyên môn cho AI (ví dụ: Chuyên viên phân tích hay Cán bộ tín dụng).');
    } else {
      points.push('• Vai trò chuyên môn đã được nêu rõ ràng.');
    }

    if (audit.formatScore < 15) {
      points.push('• Chưa có yêu cầu rõ về định dạng đầu ra (ví dụ: yêu cầu xuất bảng Markdown để dễ copy vào Excel).');
    } else {
      points.push('• Định dạng đầu ra đã được quy định cụ thể.');
    }

    if (audit.guardrailsScore < 10) {
      points.push('• Nên thêm ràng buộc: "Bỏ qua lời chào xã giao, đi thẳng vào nội dung chính" để báo cáo gọn gàng.');
    }

    feedback = `Nhận xét nhanh về câu lệnh của bạn (${audit.totalScore}/100 điểm rubric):\n\n` + 
      points.join('\n') + 
      `\n\nLời khuyên: ${audit.actionableAdvice}`;

    const diffSugg = createPromptDiffSuggestion(currentPrompt);
    if (diffSugg) {
      // Đặt đề xuất vào ô input field, không tạo bong bóng riêng
      setActiveInputSuggestion(diffSugg);
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: feedback,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // Gửi tin nhắn tự do
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');
    setGhostText('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    let coachReply = '';
    const lower = userText.toLowerCase();

    // Nếu người dùng hỏi về đề xuất, gợi ý, sửa lỗi, PII
    if (lower.includes('đề xuất') || lower.includes('gợi ý') || lower.includes('sửa') || lower.includes('diff') || lower.includes('pii')) {
      const diffSugg = createPromptDiffSuggestion(currentPrompt);
      if (diffSugg) {
        // Đặt đề xuất trực tiếp trên input field
        setActiveInputSuggestion(diffSugg);
        coachReply = `Tôi đã nạp phần đề xuất sửa đổi trực tiếp vào ô nhập liệu bên dưới. Bạn có thể bấm "Áp dụng" (hoặc phím Tab ⇥) để cập nhật vào bài làm nhé!`;
        const coachMsg: Message = {
          id: `coach-${Date.now() + 1}`,
          sender: 'coach',
          text: coachReply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg, coachMsg]);
        return;
      }
    }

    if (lower.includes('đáp án') || lower.includes('cho tôi prompt') || lower.includes('viết hộ') || lower.includes('làm mẫu')) {
      if (runCount >= 2) {
        coachReply = `Tôi thấy bạn đã thử nghiệm ${runCount} lần trong bài này! Bạn có thể bấm "Xem mẫu chuẩn" ngay phía trên ô soạn thảo Prompt để đối chiếu câu lệnh mẫu tối ưu của Agribank nhé.`;
      } else {
        coachReply = `Để bạn làm chủ kỹ năng, bạn cứ tự gõ thử ít nhất 1 lần trước nhé. Bạn chỉ cần tập trung vào 3 ý: "AI đóng vai ai", "Làm gì với dữ liệu này", và "Trả về dạng bảng hay văn bản". Thử bấm Chạy prompt một lần xem sao!`;
      }
    } else if (lower.includes('tại sao') || lower.includes('vì sao')) {
      coachReply = `Khi không quy định rõ ràng, AI sẽ chọn phương án xác suất phổ biến nhất — thường là trả lời dạng đàm thoại lịch sự và nhận xét chung chung. Đưa khuôn khổ cụ thể sẽ giúp AI tập trung 100% vào việc xử lý dữ liệu bạn cần.`;
    } else {
      coachReply = `Trong nghiệp vụ ngân hàng thực tế, bạn hãy nhớ nguyên tắc: "Giao việc cho AI như giao việc cho một thực tập sinh: Nói rõ vai trò, mục tiêu và hình thức nộp báo cáo." Bạn có thể bấm nút "Đề xuất tối ưu (Diff)" bên dưới để xem gợi ý trực tiếp nhé!`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: coachReply,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans flex flex-col items-end pointer-events-none">
      {/* 1. Bong bóng thông báo khi chưa mở Chat */}
      {!isOpen && showSpeechBubble && (
        <div 
          onClick={handleOpenCoach}
          className="pointer-events-auto cursor-pointer group relative bg-white border border-emerald-300 shadow-xl rounded-2xl p-4 max-w-[320px] sm:max-w-[360px] mb-2.5 text-left animate-fadeIn hover:shadow-2xl transition-all hover:scale-[1.02] border-l-4 border-l-emerald-600"
        >
          <button
            onClick={handleDismissBubble}
            className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-snug">
                {friendlyDesc}
              </p>
              <p className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                <span>Cần gợi ý hoặc xem đề xuất diff? Nhấp vào tôi nhé!</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" />
              </p>
              {onOpenTutorial && (
                <div className="pt-2 border-t border-slate-100 mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTutorial();
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Xem lại hướng dẫn làm bài</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute -bottom-2 right-6 w-3.5 h-3.5 bg-white border-r border-b border-emerald-300 rotate-45" />
        </div>
      )}

      {/* 2. Nút Launcher mở Chat Assistant */}
      {!isOpen ? (
        <button
          data-tour="tour-coach"
          onClick={handleOpenCoach}
          className="pointer-events-auto group relative flex items-center gap-3 p-2.5 pr-5 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-2xl border-2 border-emerald-500 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Trợ Lý AI Đồng Hành - Bấm để mở trợ giúp và đề xuất"
        >
          <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-900 rounded-full text-emerald-400 border border-emerald-400/60 shadow-inner group-hover:rotate-6 transition-transform">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </div>

          <div className="text-left">
            <span className="text-xs font-bold text-slate-900 block leading-tight flex items-center gap-1">
              <span>Trợ Lý AI</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-700 block leading-tight">
              Bài {activeLab.order}: {activeLab.badge}
            </span>
          </div>
        </button>
      ) : (
        /* 3. Khung Chat Mở Rộng Chiều Cao với Gợi Ý Trực Tiếp Trong Input Field */
        <div className={`pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-fadeIn transition-all duration-200 ${
          isMaximized 
            ? 'w-[95vw] sm:w-[620px] md:w-[680px] h-[840px] max-h-[92vh]' 
            : 'w-[94vw] sm:w-[460px] md:w-[500px] h-[660px] sm:h-[720px] max-h-[88vh]'
        }`}>
          {/* Header Panel */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex-shrink-0 bg-slate-800 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <span>Trợ Lý AI Đồng Hành</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    Bài {activeLab.order}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {activeLab.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title={isMaximized ? "Thu nhỏ chiều cao" : "Mở rộng tối đa chiều cao"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Vùng Lịch Sử Tin Nhắn (Gọn gàng, sạch sẽ, không bị ô nhiễm bởi các bong bóng đề xuất) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'coach' && (
                  <div className="w-7 h-7 flex-shrink-0 bg-slate-900 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/40 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div className={`max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl p-3.5 leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-xs ml-auto shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                    <span className={`block text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-slate-400 text-right' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Toast thông báo đã áp dụng đề xuất */}
          {suggestionAppliedToast && (
            <div className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-between animate-fadeIn border-t border-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Đã áp dụng đề xuất vào ô soạn thảo câu lệnh thành công!</span>
              </span>
            </div>
          )}

          {/* 4 QUICK ACTION CHIPS */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 flex-shrink-0">
            {/* Quick Action: Kích hoạt đề xuất trực tiếp trên input field */}
            <button
              onClick={handleGeneratePromptDiff}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Phân tích và hiển thị đề xuất so khớp diff ngay trên input field"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Đề xuất tối ưu (Diff)</span>
            </button>

            <button
              onClick={handleQuickHint}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gợi ý bước này</span>
            </button>

            <button
              onClick={handleQuickConcept}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Giải thích ý nghĩa</span>
            </button>

            <button
              onClick={handleQuickAudit}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Kiểm tra câu lệnh</span>
            </button>

            {onOpenTutorial && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenTutorial();
                }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                title="Mở hướng dẫn làm bài từng bước"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xem lại hướng dẫn</span>
              </button>
            )}
          </div>

          {/* VÙNG INPUT FIELD GẮN LIỀN ĐỀ XUẤT DIFF & GHOST TEXT AUTOCOMPLETE (KHÔNG TẠO BONG BÓNG) */}
          <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0 space-y-2">
            {/* Đề xuất Diff chuẩn IDE Git gắn liền ngay trên input field (không tạo bong bóng chat) */}
            {activeInputSuggestion && (
              <InlineDiffSuggestionCard
                items={activeInputSuggestion.items}
                title={activeInputSuggestion.title}
                onAccept={handleApplyActiveInputSuggestion}
                onAcceptAll={handleApplyActiveInputSuggestion}
                onReject={() => setActiveInputSuggestion(null)}
              />
            )}

            {/* Form Input với Ghost Text / Autocomplete ngay trong input field */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  placeholder={
                    activeInputSuggestion 
                      ? "Nhấn phím Tab ⇥ để áp dụng đề xuất hoặc gõ câu hỏi..." 
                      : "Nhập câu hỏi hoặc yêu cầu đề xuất..."
                  }
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder-slate-400 transition pr-28"
                />

                {/* Ghost Text Autocomplete gợi ý ngay trong input field */}
                {ghostText && (
                  <span 
                    onClick={handleAcceptGhostText}
                    className="absolute right-3 top-2 text-[11px] text-slate-400 font-mono pointer-events-auto cursor-pointer hover:text-emerald-700 flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs"
                    title="Nhấn phím Tab ⇥ để chèn gợi ý này"
                  >
                    <span className="truncate max-w-[120px]">{ghostText}</span>
                    <kbd className="bg-slate-200 text-slate-700 px-1 py-0.2 rounded text-[9px] font-mono">Tab ⇥</kbd>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition flex-shrink-0 cursor-pointer shadow-xs"
                title="Gửi tin nhắn"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
