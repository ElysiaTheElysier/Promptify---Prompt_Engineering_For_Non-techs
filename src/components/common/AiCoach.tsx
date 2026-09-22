import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Lightbulb, 
  BookOpen, 
  CheckCircle2, 
  Sparkles,
  Compass
} from 'lucide-react';
import { LabStep, UIMode } from '../../types';
import { evaluatePromptRubric } from '../../services/llmService';

/**
 * Pixelated Cute Mascot SVG Component
 * Thiết kế phong cách pixel-art retro đáng yêu: Mắt pixel to tròn lấp lánh, má hồng pixel, ăng-ten vàng chớp sáng.
 */
export const PixelCuteMascot: React.FC<{ className?: string }> = ({ className = "w-11 h-11" }) => {
  return (
    <svg 
      viewBox="0 0 16 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
    >
      {/* Halo Glow */}
      <rect x="2" y="2" width="12" height="12" fill="#34D399" opacity="0.25" />

      {/* Ăng-ten phát sáng (Yellow Pixel Beacon) */}
      <rect x="7" y="0" width="2" height="2" fill="#FBBF24" />
      <rect x="7" y="2" width="2" height="2" fill="#047857" />

      {/* Thân robot bo vuông pixel (Emerald Body) */}
      <rect x="3" y="4" width="10" height="9" fill="#10B981" />
      <rect x="4" y="3" width="8" height="1" fill="#10B981" />
      <rect x="4" y="13" width="8" height="1" fill="#059669" />

      {/* Tai nghe 2 bên (Headphones) */}
      <rect x="2" y="6" width="1" height="4" fill="#047857" />
      <rect x="13" y="6" width="1" height="4" fill="#047857" />

      {/* Màn hình mặt kính (Dark Navy Screen) */}
      <rect x="4" y="5" width="8" height="6" fill="#0F172A" />

      {/* Mắt Pixel to lấp lánh (Sparkly Pixel Eyes) */}
      <rect x="5" y="6" width="2" height="2" fill="#34D399" />
      <rect x="5" y="6" width="1" height="1" fill="#FFFFFF" />

      <rect x="9" y="6" width="2" height="2" fill="#34D399" />
      <rect x="9" y="6" width="1" height="1" fill="#FFFFFF" />

      {/* Má hồng Pixel dễ thương (Rosy Cheeks) */}
      <rect x="4" y="9" width="1" height="1" fill="#F472B6" />
      <rect x="11" y="9" width="1" height="1" fill="#F472B6" />

      {/* Miệng cười Pixel (Happy Smile) */}
      <rect x="7" y="9" width="2" height="1" fill="#34D399" />

      {/* Chân robot (Feet) */}
      <rect x="5" y="14" width="2" height="1" fill="#047857" />
      <rect x="9" y="14" width="2" height="1" fill="#047857" />
    </svg>
  );
};

interface Props {
  currentMode: UIMode;
  activeLab: LabStep;
  currentPrompt: string;
  runCount: number;
  onApplyPromptSuggestion?: (suggestion: string) => void;
  onOpenTutorial?: () => void;
}

interface Message {
  id: string;
  sender: 'coach' | 'user';
  text: string;
  timestamp: string;
}

export const AiCoach: React.FC<Props> = ({
  activeLab,
  currentPrompt,
  runCount,
  onOpenTutorial,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(() => {
    return localStorage.getItem('promptify_coach_intro_dismissed') !== 'true';
  });

  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mô tả bài tập bằng ngôn ngữ đời thường (không dùng jargon như zero-shot)
  const getFriendlyExerciseDescription = (order: number) => {
    switch (order) {
      case 1:
        return 'Bạn đang viết một câu prompt cơ bản để phân tích phản hồi khách hàng...';
      case 2:
        return 'Bạn đang học cách cấu trúc câu lệnh chuyên nghiệp với 5 thành phần...';
      case 3:
        return 'Bạn đang dạy AI bằng một ví dụ mẫu chuẩn văn phong ngân hàng...';
      case 4:
        return 'Bạn đang phân loại các tình huống phức tạp bằng nhiều ví dụ đa dạng...';
      case 5:
        return 'Bạn đang neo câu trả lời vào tài liệu thực tế để chống AI bịa đặt...';
      default:
        return 'Bạn đang thực hành bài tập nâng cao kỹ năng prompt...';
    }
  };

  const friendlyDesc = getFriendlyExerciseDescription(activeLab.order);

  // Câu hỏi gợi mở khởi tạo thân thiện, không dùng thuật ngữ kỹ thuật
  const getInitialCoachQuestion = (): string => {
    switch (activeLab.order) {
      case 1:
        return `Chào bạn! Tôi là Bé Trợ Lý AI của bạn.\n\nỞ bài tập này: ${friendlyDesc}\n\nBạn thử quan sát xem: Bạn đã nói rõ AI cần làm nhiệm vụ gì và nộp báo cáo bằng bảng hay văn bản chưa?`;
      case 2:
        return `Chào bạn! Ở bài cấu trúc câu lệnh này, hãy kiểm tra xem bạn đã nêu đủ 5 ý: Vai trò (Ai làm?) - Ngữ cảnh - Nhiệm vụ - Ràng buộc - Định dạng bảng chưa?`;
      case 3:
        return `Chào bạn! Khi dạy AI qua ví dụ mẫu, ví dụ bạn đưa ra có đúng phong cách chu đáo và bảng biểu bạn mong muốn không?`;
      case 4:
        return `Chào bạn! Khi có nhiều tình huống khác nhau, các ví dụ bạn đưa ra đã bao quát được cả khen, chê và khiếu nại chưa?`;
      case 5:
        return `Chào bạn! Ở bài này cần cẩn trọng chống AI bịa số liệu. Kết luận này dựa trên tài liệu nào? Có trích dẫn cụ thể chưa?`;
      default:
        return `Chào bạn! Tôi đang đồng hành cùng bạn ở Bài ${activeLab.order}. Bạn cần tôi hỗ trợ góc nhìn nào?`;
    }
  };

  useEffect(() => {
    const welcomeMsg: Message = {
      id: `welcome-${activeLab.id}-${Date.now()}`,
      sender: 'coach',
      text: getInitialCoachQuestion(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);
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
  };

  // 1. "Gợi ý cho bước này" (Không đưa đáp án hoàn chỉnh nếu chưa thử)
  const handleQuickHint = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Gợi ý cho bước này',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    let replyText = '';
    if (runCount === 0) {
      replyText = `💡 Gợi ý nhỏ trước khi bạn chạy thử:\n\n• ${activeLab.hints[0] || 'Hãy bắt đầu bằng việc đặt vai trò cho AI.'}\n• ${activeLab.hints[1] || 'Quy định rõ định dạng bạn muốn nhận được.'}\n\n👉 Bạn cứ tự gõ thử một câu lệnh tự nhiên nhất rồi bấm "Chạy prompt" nhé, đừng ngại sai!`;
    } else {
      replyText = `💡 Gợi ý nâng cấp cho Bài ${activeLab.order}:\n\n` + 
        activeLab.hints.map((h, i) => `${i + 1}. ${h}`).join('\n') +
        `\n\nBạn có muốn tôi hỗ trợ kiểm tra xem câu lệnh hiện tại của bạn đã đủ các ý này chưa?`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 2. "Giải thích concept" (Dễ hiểu cho nghiệp vụ)
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
        explanation = '📖 Vì sao câu lệnh ngắn lại cho kết quả kém?\nKhi bạn chỉ nói chung chung "Hãy phân tích...", AI phải tự đoán xem bạn cần văn xuôi hay bảng, dẫn đến câu trả lời dài dòng và không copy vào báo cáo được.';
        break;
      case 2:
        explanation = '📖 Cấu trúc 5 thành phần:\nGiống như giao việc cho nhân viên mới: Nói rõ bạn là ai, bối cảnh là gì, nhiệm vụ làm gì, điều gì cấm làm, và nộp báo cáo bằng bảng.';
        break;
      case 3:
        explanation = '📖 Dạy bằng ví dụ mẫu:\nThay vì giải thích dài dòng "Hãy viết văn phong chu đáo", bạn đưa đúng 1 ví dụ chuẩn, AI sẽ bắt chước chính xác cách xưng hô và trình bày.';
        break;
      case 4:
        explanation = '📖 Dạy bằng nhiều ví dụ:\nKhi có nhiều trường hợp cần phân biệt (như Khen ngợi, Khiếu nại, Góp ý), việc đưa ví dụ đa dạng giúp AI không phân loại nhầm.';
        break;
      case 5:
        explanation = '📖 Neo thông tin vào tài liệu thực tế:\nNgăn chặn việc AI tự bịa số liệu bằng cách bắt buộc: Chỉ trả lời đúng những gì có trong văn bản được cung cấp.';
        break;
      default:
        explanation = `📖 ${activeLab.conceptTitle}:\n${activeLab.conceptExplanation}`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: explanation,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 3. "Kiểm tra prompt của tôi"
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
      feedback = '🔍 Ô câu lệnh của bạn hiện đang để trống. Hãy thử gõ một câu lệnh theo cách bạn muốn giao việc cho trợ lý rồi bấm lại để tôi góp ý nhé!';
    } else {
      const points: string[] = [];
      if (audit.personaScore < 15) {
        points.push('• Bạn chưa nêu rõ vai trò chuyên môn cho AI (ví dụ: Chuyên viên phân tích hay Cán bộ tín dụng).');
      } else {
        points.push('• ✅ Vai trò chuyên môn đã được nêu rõ ràng.');
      }

      if (audit.formatScore < 15) {
        points.push('• Chưa có yêu cầu rõ về định dạng đầu ra (ví dụ: yêu cầu xuất bảng Markdown để dễ copy vào Excel).');
      } else {
        points.push('• ✅ Định dạng đầu ra đã được quy định cụ thể.');
      }

      if (audit.guardrailsScore < 10) {
        points.push('• Nên thêm ràng buộc: "Bỏ qua lời chào xã giao, đi thẳng vào nội dung chính" để báo cáo gọn gàng.');
      }

      feedback = `🔍 Nhận xét nhanh về câu lệnh của bạn (${audit.totalScore}/100 điểm):\n\n` + 
        points.join('\n') + 
        `\n\n💡 Lời khuyên: ${audit.actionableAdvice}\n\nHãy thử tinh chỉnh thêm rồi bấm "Chạy prompt" để kiểm tra kết quả thực tế nhé!`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: feedback,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // Gửi tin nhắn tùy chọn
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    let coachReply = '';
    const lower = userText.toLowerCase();

    // Guardrail: Không đưa luôn đáp án hoàn chỉnh nếu chưa thử
    if (lower.includes('đáp án') || lower.includes('cho tôi prompt') || lower.includes('viết hộ') || lower.includes('làm mẫu')) {
      if (runCount >= 2) {
        coachReply = `Tôi thấy bạn đã thử nghiệm ${runCount} lần trong bài này rồi! Bạn có thể bấm nút "Nạp Prompt chuẩn" ngay trên đầu ô Prompt để xem mẫu đã được tối ưu nhé!`;
      } else {
        coachReply = `Để bạn nắm vững kỹ năng, bạn cứ tự gõ thử ít nhất 1 lần trước nhé. Bạn chỉ cần tập trung vào 3 ý: "AI đóng vai ai", "Làm gì với dữ liệu này", và "Trả về dạng bảng hay văn bản". Thử bấm Chạy một lần xem sao!`;
      }
    } else if (lower.includes('tại sao') || lower.includes('vì sao')) {
      coachReply = `Khi bạn không quy định rõ ràng, AI sẽ chọn phương án xác suất phổ biến nhất — thường là trả lời dạng đàm thoại lịch sự và nhận xét chung chung. Đưa khuôn khổ cụ thể sẽ giúp AI tập trung 100% vào việc xử lý dữ liệu bạn cần.`;
    } else {
      coachReply = `Câu hỏi rất hay! Trong nghiệp vụ ngân hàng thực tế, bạn hãy nhớ nguyên tắc: "Giao việc cho AI như giao việc cho một thực tập sinh: Nói rõ vai trò, mục tiêu và hình thức nộp báo cáo." Bạn có muốn tôi kiểm tra lại câu lệnh bạn vừa soạn không?`;
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
      {/* 1. Ô TEXT BONG BÓNG THOẠI ĐANG NÓI (CHỈ HIỆN LẦN ĐẦU, FONT RÕ RÀNG, NÓI RÕ BÀI TẬP HIỆN TẠI) */}
      {!isOpen && showSpeechBubble && (
        <div 
          onClick={handleOpenCoach}
          className="pointer-events-auto cursor-pointer group relative bg-white border border-emerald-300 shadow-xl rounded-2xl p-4 max-w-[320px] sm:max-w-[350px] mb-2.5 text-left animate-fadeIn hover:shadow-2xl transition-all hover:scale-[1.02] border-l-4 border-l-emerald-600"
        >
          <button
            onClick={handleDismissBubble}
            className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
            title="Đóng bong bóng này"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-4">
            <span className="text-xl flex-shrink-0 animate-bounce">👋</span>
            <div className="space-y-1.5">
              <p className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-snug">
                {friendlyDesc}
              </p>
              <p className="text-xs text-emerald-800 font-medium">
                Nếu cần gợi ý hoặc kiểm tra câu lệnh, hãy bấm vào tôi nhé! ✨
              </p>
              {onOpenTutorial && (
                <div className="pt-2 border-t border-slate-100 mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTutorial();
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 hover:underline"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Xem lại hướng dẫn làm bài</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Mũi tên bong bóng chỉ xuống bé trợ lý */}
          <div className="absolute -bottom-2 right-6 w-3.5 h-3.5 bg-white border-r border-b border-emerald-300 rotate-45" />
        </div>
      )}

      {/* 2. ICON MASCOT CUTE PIXEL-ART */}
      {!isOpen ? (
        <button
          data-tour="tour-coach"
          onClick={handleOpenCoach}
          className="pointer-events-auto group relative flex items-center gap-2.5 p-2 pr-4 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-2xl border-2 border-emerald-500 transition-all hover:scale-105 active:scale-95"
          title="Bé Trợ Lý AI Học Tập - Bấm vào tôi để được hỗ trợ"
        >
          {/* Cute Pixel Mascot Avatar */}
          <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center bg-slate-900 rounded-full p-1 border border-emerald-400/60 shadow-inner group-hover:rotate-6 transition-transform">
            <PixelCuteMascot className="w-9 h-9" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </div>

          <div className="text-left">
            <span className="text-xs font-bold text-slate-900 block leading-tight">
              Bé AI Coach
            </span>
            <span className="text-[11px] font-medium text-emerald-700 block leading-tight">
              Bài {activeLab.order}: {activeLab.badge}
            </span>
          </div>
        </button>
      ) : (
        /* 3. PANEL CHAT ĐẦY ĐỦ CỦA AI COACH */
        <div className="pointer-events-auto w-[360px] sm:w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-fadeIn">
          {/* Header Panel với Mascot Cute Pixel-art */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex-shrink-0 bg-slate-800 rounded-lg p-0.5 flex items-center justify-center border border-emerald-500/40">
                <PixelCuteMascot className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <span>Bé AI Coach</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    Bài {activeLab.order}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {activeLab.title}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Thu gọn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Vùng Tin Nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'coach' && (
                  <div className="w-6 h-6 flex-shrink-0 bg-slate-900 rounded-md p-0.5 flex items-center justify-center border border-emerald-500/40 mt-0.5">
                    <PixelCuteMascot className="w-5 h-5" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                  <span className={`block text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-slate-400 text-right' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 3 QUICK ACTIONS */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 flex-shrink-0">
            <button
              onClick={handleQuickHint}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3 text-emerald-600" />
              <span>Gợi ý cho bước này</span>
            </button>

            <button
              onClick={handleQuickConcept}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3 text-indigo-600" />
              <span>Giải thích ý nghĩa</span>
            </button>

            <button
              onClick={handleQuickAudit}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-amber-700" />
              <span>Kiểm tra câu lệnh của tôi</span>
            </button>

            {onOpenTutorial && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenTutorial();
                }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1"
                title="Mở hướng dẫn làm bài từng bước"
              >
                <Compass className="w-3 h-3 text-emerald-600" />
                <span>Xem lại hướng dẫn</span>
              </button>
            )}
          </div>

          {/* Form Nhập Tin Nhắn */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Hỏi Bé Trợ Lý AI điều gì đó..."
              className="flex-1 text-xs px-3 py-2 bg-slate-100 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition flex-shrink-0"
              title="Gửi"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
