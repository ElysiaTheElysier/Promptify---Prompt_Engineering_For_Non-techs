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
      default: return `Lesson ${order}`;
    }
  };

  const stageName = getStageName(activeLab.order);

  // Câu hỏi gợi mở khởi tạo theo đúng yêu cầu đề bài cho từng Lab
  const getInitialCoachQuestion = (order: number): string => {
    switch (order) {
      case 1:
        return 'Hello! In this Zero-shot step, check: Did you clearly define the task for the AI and specify the target format?';
      case 2:
        return 'Hello! In this Structured Prompt step, make sure your prompt includes the 5 core elements: Role, Context, Task, Constraints, and Output Format.';
      case 3:
        return 'Hello! One-shot means teaching AI with 1 standard example. Does your sample accurately represent the target table structure?';
      case 4:
        return 'Hello! In this Few-shot step, are your examples diverse enough to cover all common customer situations?';
      case 5:
        return 'Hello! Grounding requires AI to stick strictly to facts. Ask yourself: Is this conclusion directly backed by evidence in the document?';
      default:
        return `Hello! I am here to assist you with ${stageName}. What would you like feedback on?`;
    }
  };

  // Cập nhật tin nhắn khởi đầu khi chuyển lab
  useEffect(() => {
    const welcomeMsg: Message = {
      id: `welcome-${activeLab.id}-${Date.now()}`,
      sender: 'coach',
      text: getInitialCoachQuestion(activeLab.order),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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
      text: 'Hint for this step',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    let replyText = '';
    if (runCount === 0) {
      replyText = `💡 Quick hints before running test:\n\n• Start by setting a professional role for the AI.\n• Specify the exact format you want to receive.\n\n👉 Feel free to write naturally and click "Run Prompt"!`;
    } else {
      replyText = `💡 Upgrade hints for ${stageName}:\n\n` + 
        activeLab.hints.map((h, i) => `${i + 1}. ${h}`).join('\n') +
        `\n\nWould you like me to check if your current prompt meets these requirements?`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 2. "Giải thích concept" (Dễ hiểu cho non-tech/business users, không dùng jargon)
  const handleQuickConcept = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Explain lesson concept',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    let explanation = '';
    switch (activeLab.order) {
      case 1:
        explanation = '📖 Zero-shot (No Examples):\nPrompting the AI without prior examples. If instructions are too brief, AI guesses the tone and yields generic, conversational prose.';
        break;
      case 2:
        explanation = '📖 Structured Prompt Framework:\nFrame your prompt with 5 parts: Role, Context, Task, Constraints, and Output Format. Guides AI directly to target on the first run.';
        break;
      case 3:
        explanation = '📖 One-shot Prompting (1 Example):\nProvide exactly 1 standard Input ➔ Output example. AI mirrors the exact columns and tone.';
        break;
      case 4:
        explanation = '📖 Few-shot Prompting (Multiple Examples):\nProvide 2-3 diverse examples to prevent misclassification across edge cases.';
        break;
      case 5:
        explanation = '📖 Grounding (Source Document Anchoring):\nPrevent hallucinations by strictly requiring: Answer ONLY based on provided source documents without external speculation.';
        break;
      default:
        explanation = `📖 ${activeLab.conceptTitle}:\n${activeLab.conceptExplanation}`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: explanation,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 3. "Kiểm tra prompt của tôi" (Đọc prompt hiện tại, phản hồi gợi mở, không làm thay)
  const handleQuickAudit = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Review my prompt',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    const audit = evaluatePromptRubric(currentPrompt);
    let feedback = '';

    if (!currentPrompt.trim()) {
      feedback = '🔍 Your prompt composer is currently empty. Try drafting an instruction as you would assign a task to an assistant, then click here for feedback!';
    } else {
      const points: string[] = [];
      if (audit.personaScore < 15) {
        points.push('• Missing an explicit professional role (e.g., Credit Analyst or Senior Auditor).');
      } else {
        points.push('• ✅ Professional role is clearly defined.');
      }

      if (audit.formatScore < 15) {
        points.push('• Missing output formatting instructions (e.g., 5-column Markdown table).');
      } else {
        points.push('• ✅ Output format is well-specified.');
      }

      if (audit.guardrailsScore < 10) {
        points.push('• Recommended constraint: "Skip conversational pleasantries; proceed directly to findings."');
      }

      feedback = `🔍 Quick Review on Your Current Prompt (${audit.totalScore}/100 points):\n\n` + 
        points.join('\n') + 
        `\n\n💡 Advice: ${audit.actionableAdvice}\n\nTry refining further and click "Run Prompt" to test results!`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: feedback,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    // Phản hồi dựa trên guardrails: gợi mở, không làm thay, ngôn ngữ tự nhiên
    let coachReply = '';
    const lower = userText.toLowerCase();

    if (lower.includes('đáp án') || lower.includes('cho tôi prompt') || lower.includes('viết hộ') || lower.includes('làm mẫu')) {
      if (runCount >= 2) {
        coachReply = `I see you have run ${runCount} attempts on this lesson! Click "Reference Solution" to compare with the benchmark prompt.`;
      } else {
        coachReply = `To master prompt skills, try at least one draft on your own first! Focus on: Role, Task with Data, and Output Format. Give it a run!`;
      }
    } else if (lower.includes('tại sao') || lower.includes('vì sao')) {
      coachReply = `When instructions are vague, AI picks the most statistically probable path — conversational prose. Clear constraints channel 100% of model capacity into your specific task.`;
    } else {
      coachReply = `Delegate to AI as you would to a new team member: specify role, context, goal, constraints, and output format. Would you like me to review your prompt?`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: coachReply,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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
          title="Open AI Learning Coach"
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
                  Lesson {activeLab.order}: {activeLab.focusSkill}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Collapse"
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
              <span>Step Hint</span>
            </button>

            <button
              onClick={handleQuickConcept}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3 text-indigo-600" />
              <span>Explain Concept</span>
            </button>

            <button
              onClick={handleQuickAudit}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-amber-700" />
              <span>Review Prompt</span>
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
              placeholder="Ask Coach a question..."
              className="flex-1 text-xs px-3 py-2 bg-slate-100 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition flex-shrink-0"
              title="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

