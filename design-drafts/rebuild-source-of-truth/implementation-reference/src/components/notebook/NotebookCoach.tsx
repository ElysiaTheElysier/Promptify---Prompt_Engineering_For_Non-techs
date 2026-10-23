import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  ChevronDown, 
  Send, 
  Lightbulb, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle,
  Bot,
  User,
  MessageSquare
} from 'lucide-react';
import { LabStep } from '../../types';
import { evaluatePromptRubric } from '../../services/llmService';

interface Props {
  activeLab: LabStep;
  currentPrompt: string;
  runCount: number;
  onApplyPromptSuggestion?: (suggestion: string) => void;
}

interface Message {
  id: string;
  sender: 'coach' | 'user';
  text: string;
  timestamp: string;
  actions?: { label: string; action: () => void }[];
}

export const NotebookCoach: React.FC<Props> = ({
  activeLab,
  currentPrompt,
  runCount,
  onApplyPromptSuggestion
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Xác định tên kỹ thuật theo progression
  const getStageName = (order: number) => {
    switch (order) {
      case 1: return 'Zero-shot';
      case 2: return 'Structured Prompt';
      case 3: return 'One-shot';
      case 4: return 'Few-shot';
      case 5: return 'Grounding';
      default: return `Bài ${order}`;
    }
  };

  const stageName = getStageName(activeLab.order);

  // Câu hỏi gợi mở khởi tạo theo đúng yêu cầu đề bài cho từng Lab
  const getInitialCoachQuestion = (order: number): string => {
    switch (order) {
      case 1:
        return 'Chào bạn! Ở bước Zero-shot này, bạn thử quan sát xem: Bạn đã nói rõ AI cần làm nhiệm vụ gì và trả về định dạng nào chưa?';
      case 2:
        return 'Chào bạn! Ở bước Structured Prompt, hãy kiểm tra lại câu lệnh của bạn có đủ 5 thành phần: Role (vai trò), Context (ngữ cảnh), Task (nhiệm vụ), Constraint (ràng buộc) và Output Format (định dạng) chưa?';
      case 3:
        return 'Chào bạn! One-shot nghĩa là dạy AI qua 1 ví dụ mẫu chuẩn. Ví dụ bạn cung cấp có thực sự đại diện cho cấu trúc output mong muốn không?';
      case 4:
        return 'Chào bạn! Ở bước Few-shot, các ví dụ mẫu bạn đưa ra có đủ đa dạng để bao quát các tình huống thường gặp của khách hàng không?';
      case 5:
        return 'Chào bạn! Bước Grounding yêu cầu AI trả lời bám sát sự thật. Bạn hãy tự hỏi: Kết luận này dựa trên tài liệu nào? Có bằng chứng (evidence) cụ thể trong văn bản chưa?';
      default:
        return `Chào bạn! Tôi đang đồng hành cùng bạn ở ${stageName}. Bạn cần tôi hỗ trợ góc nhìn nào?`;
    }
  };

  // Cập nhật tin nhắn khởi đầu khi chuyển lab
  useEffect(() => {
    const welcomeMsg: Message = {
      id: `welcome-${activeLab.id}-${Date.now()}`,
      sender: 'coach',
      text: getInitialCoachQuestion(activeLab.order),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);
  }, [activeLab.id]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // XỬ LÝ 3 QUICK ACTIONS THEO GUARDRAILS

  // 1. "Gợi ý cho bước này" (Không đưa luôn đáp án hoàn chỉnh nếu chưa thử, ưu tiên gợi mở)
  const handleQuickHint = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Gợi ý cho bước này',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    let replyText = '';
    if (runCount === 0) {
      replyText = `💡 Gợi ý nhỏ trước khi bạn chạy thử:\n\n• ${activeLab.hints[0] || 'Hãy bắt đầu bằng việc đặt vai trò cho AI.'}\n• ${activeLab.hints[1] || 'Quy định rõ định dạng bạn muốn nhận được.'}\n\n👉 Bạn cứ thử viết theo cách hiểu tự nhiên nhất rồi bấm "Chạy prompt" nhé, đừng sợ sai!`;
    } else {
      replyText = `💡 Gợi ý nâng cấp cho ${stageName}:\n\n` + 
        activeLab.hints.map((h, i) => `${i + 1}. ${h}`).join('\n') +
        `\n\nBạn có muốn tôi hỗ trợ kiểm tra xem prompt hiện tại của bạn đã đáp ứng các ý này chưa?`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 2. "Giải thích concept" (Dễ hiểu cho non-tech/business users, không dùng jargon)
  const handleQuickConcept = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Giải thích concept bài này',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    let explanation = '';
    switch (activeLab.order) {
      case 1:
        explanation = '📖 Zero-shot (Không có ví dụ mẫu):\nLà khi bạn yêu cầu AI làm việc ngay mà không đưa ra ví dụ nào trước. Nếu câu lệnh quá ngắn, AI sẽ tự phỏng đoán văn phong và thường trả lời chung chung, dài dòng, khó xuất ra báo cáo.';
        break;
      case 2:
        explanation = '📖 Structured Prompt (Cấu trúc hóa câu lệnh):\nThay vì nói vu vơ, bạn đóng khung câu lệnh thành 5 phần: Vai trò (Ai làm?) - Ngữ cảnh (Ở đâu?) - Nhiệm vụ (Làm gì?) - Ràng buộc (Không được làm gì?) - Định dạng (Bảng hay danh sách?). Giúp AI trả lời trúng đích ngay lần đầu.';
        break;
      case 3:
        explanation = '📖 One-shot Prompting (Dạy bằng 1 ví dụ):\nBạn cung cấp cho AI đúng 1 cặp "Đầu vào mẫu ➔ Đầu ra mẫu". AI sẽ nhìn vào ví dụ đó để bắt chước chính xác cấu trúc cột bảng và cách hành văn nghiệp vụ.';
        break;
      case 4:
        explanation = '📖 Few-shot Prompting (Dạy bằng nhiều ví dụ):\nKhi nghiệp vụ phức tạp có nhiều trường hợp (Khen ngợi, Khiếu nại, Góp ý), việc đưa 2-3 ví dụ đa dạng sẽ giúp AI không bị nhầm lẫn giữa các nhóm phản hồi.';
        break;
      case 5:
        explanation = '📖 Grounding (Neo dữ liệu thực tế):\nNgăn ngừa hiện tượng AI "tự bịa" (ảo giác) bằng cách bắt buộc AI: Chỉ được trả lời dựa trên văn bản đính kèm, tuyệt đối không suy diễn thêm thông tin ngoài tài liệu.';
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

  // 3. "Kiểm tra prompt của tôi" (Đọc prompt hiện tại, phản hồi gợi mở, không làm thay)
  const handleQuickAudit = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Kiểm tra prompt của tôi',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const audit = evaluatePromptRubric(currentPrompt);
    let feedback = '';

    if (!currentPrompt.trim()) {
      feedback = '🔍 Ô prompt của bạn hiện đang để trống. Hãy thử gõ một câu lệnh theo cách bạn muốn giao việc cho trợ lý, rồi bấm lại để tôi góp ý nhé!';
    } else {
      const points: string[] = [];
      if (audit.personaScore < 15) {
        points.push('• Bạn chưa chỉ định rõ vai trò chuyên môn cho AI (ví dụ: Chuyên viên phân tích hay Cán bộ tín dụng).');
      } else {
        points.push('• ✅ Vai trò chuyên môn đã được nêu rõ ràng.');
      }

      if (audit.formatScore < 15) {
        points.push('• Chưa có yêu cầu rõ về định dạng đầu ra (ví dụ: yêu cầu xuất bảng Markdown 5 cột để dễ copy vào Excel).');
      } else {
        points.push('• ✅ Định dạng đầu ra đã được quy định cụ thể.');
      }

      if (audit.guardrailsScore < 10) {
        points.push('• Nên thêm ràng buộc tiêu cực: "Bỏ qua lời chào xã giao, chỉ trả về nội dung chính" để báo cáo gọn gàng.');
      }

      feedback = `🔍 Nhận xét nhanh về Prompt hiện tại của bạn (${audit.totalScore}/100 điểm):\n\n` + 
        points.join('\n') + 
        `\n\n💡 Lời khuyên: ${audit.actionableAdvice}\n\nHãy thử tinh chỉnh thêm rồi bấm "Chạy prompt" để xem kết quả thực tế nhé!`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: feedback,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // Gửi câu hỏi tùy chỉnh
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

    // Phản hồi dựa trên guardrails: gợi mở, không làm thay, ngôn ngữ tự nhiên
    let coachReply = '';
    const lower = userText.toLowerCase();

    if (lower.includes('đáp án') || lower.includes('cho tôi prompt') || lower.includes('viết hộ') || lower.includes('làm mẫu')) {
      if (runCount >= 2) {
        coachReply = `Tôi nhận thấy bạn đã thử nghiệm ${runCount} lần trong bài này. Bạn có thể bấm nút "Gợi ý prompt chuẩn" ngay trên đầu ô Prompt để tham khảo mẫu chuẩn đã được tối ưu cho bài toán này nhé!`;
      } else {
        coachReply = `Để bạn nắm vững kỹ năng, tôi khuyên bạn nên tự gõ thử ít nhất 1 lần trước. Bạn chỉ cần tập trung vào 3 ý: "AI đóng vai ai", "Làm gì với dữ liệu này", và "Trả lời bằng bảng hay văn bản". Thử bấm "Chạy prompt" một lần xem sao nhé!`;
      }
    } else if (lower.includes('tại sao') || lower.includes('vì sao')) {
      coachReply = `Khi bạn không quy định rõ ràng, AI sẽ chọn phương án xác suất phổ biến nhất — thường là trả lời dạng đàm thoại lịch sự và nhận xét chung chung. Đưa khuôn khổ cụ thể sẽ buộc AI phải tập trung 100% vào việc xử lý dữ liệu bạn cần.`;
    } else {
      coachReply = `Câu hỏi rất hay! Trong nghiệp vụ thực tế tại Agribank, bạn hãy luôn nhớ nguyên tắc: "Giao việc cho AI như giao việc cho một thực tập sinh thông minh nhưng chưa quen việc: Cần nói rõ vai trò, mục tiêu và hình thức nộp báo cáo." Bạn có muốn tôi kiểm tra lại câu lệnh bạn vừa soạn không?`;
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
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      {/* TRẠNG THÁI 1: THU GỌN THÀNH ICON GÓC MÀN HÌNH */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl border border-slate-700/80 transition-all hover:scale-105 active:scale-95"
          title="Mở AI Learning Coach"
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse border-2 border-slate-900" />
          </div>
          <div className="text-left pr-1">
            <span className="text-xs font-bold block leading-tight">AI Coach</span>
            <span className="text-[10px] text-slate-400 block leading-tight font-medium">
              {stageName}
            </span>
          </div>
        </button>
      ) : (
        /* TRẠNG THÁI 2: PANEL CHAT NHỎ, KHÔNG CHE NỘI DUNG CHÍNH */
        <div className="w-[360px] sm:w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-fadeIn">
          {/* Header Panel */}
          <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <span>AI Learning Coach</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    {stageName}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Bài {activeLab.order}: {activeLab.focusSkill}
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

          {/* Vùng Lịch Sử Tin Nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'coach' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                    AI
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

          {/* 3 QUICK ACTIONS (THEO YÊU CẦU ĐỀ BÀI) */}
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
              <span>Giải thích concept</span>
            </button>

            <button
              onClick={handleQuickAudit}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-amber-700" />
              <span>Kiểm tra prompt của tôi</span>
            </button>
          </div>

          {/* Ô Nhập Tin Nhắn Hỏi Đáp Tùy Chọn */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Đặt câu hỏi cho Coach..."
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

