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

// Quick suggestions when typing in chat (Ghost Text Autocompletion)
const CHAT_AUTOCOMPLETE_DICTIONARY = [
  'review my prompt',
  'suggest diff optimization',
  'give me a hint for this step',
  'explain the objective of this lesson',
  'remove sensitive PII data',
  'how do I format output as a Markdown table?',
  'how do I specify an expert role?',
  'how do I prevent AI hallucinations?'
];

export const AiCoach: React.FC<Props> = ({
  activeLab,
  currentPrompt,
  runCount,
  onOpenTutorial,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const wasOpenBeforeTutorialRef = useRef<boolean | null>(null);

  useEffect(() => {
    const handleTutorialStep = (event: Event) => {
      const detail = (event as CustomEvent).detail as { isOpen?: boolean; demoAction?: string };
      if (!detail?.isOpen) {
        if (wasOpenBeforeTutorialRef.current !== null) {
          setIsOpen(wasOpenBeforeTutorialRef.current);
          wasOpenBeforeTutorialRef.current = null;
        }
        return;
      }
      if (detail.demoAction === 'show-coach') {
        if (wasOpenBeforeTutorialRef.current === null) {
          wasOpenBeforeTutorialRef.current = isOpen;
        }
        setShowSpeechBubble(false);
        setIsOpen(true);
      }
    };
    window.addEventListener('promptify:tutorial-step', handleTutorialStep);
    return () => window.removeEventListener('promptify:tutorial-step', handleTutorialStep);
  }, [isOpen]);

  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(() => {
    return localStorage.getItem('promptify_coach_intro_dismissed') !== 'true';
  });

  const [inputText, setInputText] = useState<string>('');
  const [ghostText, setGhostText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Directly attached suggestions on input field
  const [activeInputSuggestion, setActiveInputSuggestion] = useState<SuggestionPayload | null>(null);
  const [suggestionAppliedToast, setSuggestionAppliedToast] = useState<boolean>(false);

  const friendlyDesc = activeLab.taskGoal || activeLab.scenario || `You are practicing ${activeLab.title}.`;

  // Socratic introductory coaching message
  const getInitialCoachQuestion = (): string => {
    return `Hello! I'm your AI Learning Coach for ${activeLab.title}.\n\nGoal: ${friendlyDesc}\n\nMake sure your prompt clearly defines the role, task, input data, constraints, and expected output format.`;
  };

  // Generate diff suggestions for current prompt
  const createPromptDiffSuggestion = (prompt: string): SuggestionPayload | null => {
    if (!prompt.trim()) return null;

    // 1. Prioritize PII check
    const piiCheck = detectPiiEntities(prompt);
    if (piiCheck.hasPii) {
      const piiItems: DiffSuggestionItem[] = piiCheck.piiItems.map((item, idx) => {
        let replacement = '{{VARIABLE}}';
        if (item.type === 'cccd') replacement = '{{NATIONAL_ID}}';
        else if (item.type === 'phone') replacement = '{{PHONE_NUMBER}}';
        else if (item.type === 'bank_account') replacement = '{{BANK_ACCOUNT}}';
        else if (item.type === 'contract_id') replacement = '{{CONTRACT_ID}}';
        else if (item.type === 'person_name') {
          if (item.value.includes('Tèo') || item.value.toLowerCase().includes('john')) replacement = '{{CUSTOMER_NAME}}';
          else if (item.value.includes('Mận') || item.value.toLowerCase().includes('jane')) replacement = '{{SPOUSE_NAME}}';
          else replacement = '{{PERSON_NAME}}';
        } else if (item.type === 'serial_id') {
          replacement = '{{DOCUMENT_SERIAL}}';
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
        title: 'PII Data Sanitization Suggestion',
        description: 'Detected sensitive personal identifying information. Recommended replacing with simulated placeholders.',
        items: piiItems,
        suggestedPrompt: sanitized
      };
    }

    // 2. Check Rubric Structure
    const audit = evaluatePromptRubric(prompt, activeLab);
    const missingItems: DiffSuggestionItem[] = [];
    let improved = prompt.trim();

    if (audit.personaScore < 15) {
      missingItems.push({
        id: `sugg-role-${Date.now()}`,
        originalText: '(No expert role defined)',
        replacementText: `ROLE: You are a professional assistant specialized in "${activeLab.title}".`,
        label: 'Expert Role'
      });
      improved = `ROLE: You are a professional assistant specialized in "${activeLab.title}".\n\n` + improved;
    }

    if (audit.formatScore < 15) {
      missingItems.push({
        id: `sugg-format-${Date.now()}`,
        originalText: '(No output format specified)',
        replacementText: `OUTPUT FORMAT: ${activeLab.expectedOutputFormat || 'Present results clearly and concisely.'}`,
        label: 'Output Format'
      });
      improved = improved + `\n\nOUTPUT FORMAT: ${activeLab.expectedOutputFormat || 'Present results clearly and concisely.'}`;
    }

    if (audit.guardrailsScore < 10) {
      missingItems.push({
        id: `sugg-guard-${Date.now()}`,
        originalText: '(No safety constraints)',
        replacementText: `CONSTRAINTS: ${activeLab.systemInstruction || 'Only use provided data and do not speculate.'}`,
        label: 'Safety Guardrails'
      });
      improved = improved + `\nCONSTRAINTS: ${activeLab.systemInstruction || 'Only use provided data and do not speculate.'}`;
    }

    if (missingItems.length > 0) {
      return {
        id: `sugg-struct-${Date.now()}`,
        type: 'structure',
        title: `Prompt Upgrade Suggestion for ${activeLab.title}`,
        description: 'Add missing business components to achieve full marks on the evaluation rubric.',
        items: missingItems,
        suggestedPrompt: improved
      };
    }

    return null;
  };

  // Initialize coach welcome message
  useEffect(() => {
    const welcomeMsg: Message = {
      id: `welcome-${activeLab.id}-${Date.now()}`,
      sender: 'coach',
      text: getInitialCoachQuestion(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);

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
    const diff = createPromptDiffSuggestion(currentPrompt);
    if (diff) {
      setActiveInputSuggestion(diff);
    }
  };

  const handleApplyActiveInputSuggestion = () => {
    if (!activeInputSuggestion) return;
    navigator.clipboard.writeText(activeInputSuggestion.suggestedPrompt);

    setActiveInputSuggestion(null);
    setSuggestionAppliedToast(true);
    setTimeout(() => setSuggestionAppliedToast(false), 2500);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleGeneratePromptDiff = () => {
    if (!currentPrompt.trim()) {
      setActiveInputSuggestion(null);
      const coachMsg: Message = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: 'The prompt composer is currently empty. Type an initial instruction or load the sample prompt to inspect diff recommendations!',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, coachMsg]);
      return;
    }

    const diffSugg = createPromptDiffSuggestion(currentPrompt);

    if (diffSugg) {
      setActiveInputSuggestion(diffSugg);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setActiveInputSuggestion(null);
      const coachMsg: Message = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: 'Great job! Your current prompt adheres to core guidelines and enterprise data safety standards for this lesson.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, coachMsg]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!val.trim()) {
      setGhostText('');
      return;
    }

    const valLower = val.toLowerCase().trim();
    const matched = CHAT_AUTOCOMPLETE_DICTIONARY.find(item => 
      item.toLowerCase().startsWith(valLower) && item.length > valLower.length
    );

    if (matched) {
      setGhostText(matched.slice(val.length));
    } else {
      setGhostText('');
    }
  };

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

  // 1. "Hint for this step"
  const handleQuickHint = () => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Hint for this step',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    let replyText = '';
    if (runCount === 0) {
      replyText = `Hints before running your test:\n\n• ${activeLab.hints[0] || 'Start by establishing an expert role for the AI.'}\n• ${activeLab.hints[1] || 'Specify the exact table or report format you need.'}\n\nDraft an initial prompt and click "Run Prompt" to test your thinking!`;
    } else {
      replyText = `Optimization hints for Lesson ${activeLab.order}:\n\n` + 
        activeLab.hints.map((h, i) => `${i + 1}. ${h}`).join('\n') +
        `\n\nYou can review the suggested modifications in the input box below to quickly enhance your prompt!`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 2. "Explain concept"
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
        explanation = 'Why do brief prompts yield poor results?\nWhen you simply say "Analyze this...", the AI must guess whether you want prose or a table, leading to lengthy, unstructured replies that may leak sensitive data.';
        break;
      case 2:
        explanation = '5-Part Professional Prompt Framework:\nJust like delegating to a new team member: clarify who the AI is, context, task objective, constraints/guardrails, and the target output format.';
        break;
      case 3:
        explanation = 'Few-Shot Examples:\nInstead of writing vague instructions, provide concrete input/output examples. The AI will mirror the exact tone and structure.';
        break;
      case 4:
        explanation = 'Multi-Case Few-Shot:\nWhen distinguishing multiple scenarios (Compliments, Complaints, Inquiries), comprehensive examples ensure high classification accuracy.';
        break;
      case 5:
        explanation = 'Grounding in Source Documents:\nEliminate hallucinations by strictly requiring: "Answer ONLY using facts explicitly stated in the provided document."';
        break;
      default:
        explanation = `${activeLab.conceptTitle}:\n${activeLab.conceptExplanation}`;
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: explanation,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

  // 3. "Review prompt"
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
      feedback = 'Your prompt composer is currently empty. Try drafting an instruction as you would assign a task to an assistant, then click here for feedback!';
      const coachMsg: Message = {
        id: `coach-${Date.now() + 1}`,
        sender: 'coach',
        text: feedback,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg, coachMsg]);
      return;
    }

    const points: string[] = [];
    if (audit.personaScore < 15) {
      points.push('• Missing an explicit expert role (e.g., Senior Credit Analyst or Quality Specialist).');
    } else {
      points.push('• Expert role is clearly defined.');
    }

    if (audit.formatScore < 15) {
      points.push('• Missing output formatting instructions (e.g., Markdown table for easy export to spreadsheet).');
    } else {
      points.push('• Output format is well-specified.');
    }

    if (audit.guardrailsScore < 10) {
      points.push('• Recommended constraint: "Skip conversational pleasantries; proceed directly to findings."');
    }

    feedback = `Quick Review on Your Prompt (${audit.totalScore}/100 rubric points):\n\n` + 
      points.join('\n') + 
      `\n\nRecommendation: ${audit.actionableAdvice}`;

    const diffSugg = createPromptDiffSuggestion(currentPrompt);
    if (diffSugg) {
      setActiveInputSuggestion(diffSugg);
    }

    const coachMsg: Message = {
      id: `coach-${Date.now() + 1}`,
      sender: 'coach',
      text: feedback,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, coachMsg]);
  };

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
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    let coachReply = '';
    const lower = userText.toLowerCase();

    if (lower.includes('diff') || lower.includes('suggest') || lower.includes('optimize') || lower.includes('pii') || lower.includes('fix') || lower.includes('đề xuất') || lower.includes('gợi ý')) {
      const diffSugg = createPromptDiffSuggestion(currentPrompt);
      if (diffSugg) {
        setActiveInputSuggestion(diffSugg);
        coachReply = `I've loaded the suggested diff improvements directly into the input bar below. Click "Apply" (or press Tab ⇥) to update your prompt!`;
        const coachMsg: Message = {
          id: `coach-${Date.now() + 1}`,
          sender: 'coach',
          text: coachReply,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg, coachMsg]);
        return;
      }
    }

    if (lower.includes('answer') || lower.includes('solution') || lower.includes('give me prompt') || lower.includes('write for me') || lower.includes('đáp án') || lower.includes('làm mẫu')) {
      if (runCount >= 2) {
        coachReply = `I see you've run ${runCount} attempts on this lesson! You can check the "Reference Solution" tab to compare with the benchmark prompt.`;
      } else {
        coachReply = `To build lasting prompt mastery, try at least one draft on your own first! Focus on 3 essentials: Role, Task with Data, and Output Format. Give it a run!`;
      }
    } else if (lower.includes('why') || lower.includes('reason') || lower.includes('tại sao') || lower.includes('vì sao')) {
      coachReply = `When instructions are vague, AI picks the most statistically generic path — typically conversational prose. Clear constraints channel 100% of the model's capacity into your specific task.`;
    } else {
      coachReply = `Remember the core principle: "Delegate to AI as you would to a new team member: specify role, context, goal, constraints, and output format." Click "Suggest Diff" for tailored recommendations.`;
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
    <div className="fixed bottom-6 right-6 z-40 font-sans flex flex-col items-end pointer-events-none">
      {/* 1. Speech bubble teaser before chat is opened */}
      {!isOpen && showSpeechBubble && (
        <div 
          onClick={handleOpenCoach}
          className="pointer-events-auto cursor-pointer group relative bg-white border border-emerald-300 shadow-xl rounded-2xl p-4 max-w-[320px] sm:max-w-[360px] mb-2.5 text-left animate-fadeIn hover:shadow-2xl transition-all hover:scale-[1.02] border-l-4 border-l-emerald-600"
        >
          <button
            onClick={handleDismissBubble}
            className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
            title="Dismiss notification"
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
                <span>Need a hint or diff suggestions? Click here!</span>
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
                    <span>Review lesson tutorial</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute -bottom-2 right-6 w-3.5 h-3.5 bg-white border-r border-b border-emerald-300 rotate-45" />
        </div>
      )}

      {/* 2. Launcher button to open AI Coach */}
      {!isOpen ? (
        <button
          data-tour="tour-coach"
          onClick={handleOpenCoach}
          className="pointer-events-auto group relative flex items-center gap-3 p-2.5 pr-5 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-2xl border-2 border-emerald-500 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="AI Learning Coach - Click for guidance and suggestions"
        >
          <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-900 rounded-full text-emerald-400 border border-emerald-400/60 shadow-inner group-hover:rotate-6 transition-transform">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </div>

          <div className="text-left">
            <span className="text-xs font-bold text-slate-900 block leading-tight flex items-center gap-1">
              <span>AI Coach</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-700 block leading-tight">
              Lesson {activeLab.order}: {activeLab.badge}
            </span>
          </div>
        </button>
      ) : (
        /* 3. Expanded Coach Window */
        <div data-tour="tour-coach-panel" className={`pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-fadeIn transition-all duration-200 ${
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
                  <span>AI Learning Coach</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    Lesson {activeLab.order}
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
                title={isMaximized ? "Minimize window height" : "Maximize window height"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message History */}
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

          {/* Toast Notification */}
          {suggestionAppliedToast && (
            <div className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-between animate-fadeIn border-t border-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Applied suggestion to prompt composer successfully!</span>
              </span>
            </div>
          )}

          {/* Quick Action Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 flex-shrink-0">
            <button
              onClick={handleGeneratePromptDiff}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Analyze and show diff recommendation directly on input field"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Suggest Diff</span>
            </button>

            <button
              onClick={handleQuickHint}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
              <span>Step Hint</span>
            </button>

            <button
              onClick={handleQuickConcept}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Explain Concept</span>
            </button>

            <button
              onClick={handleQuickAudit}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Review Prompt</span>
            </button>

            {onOpenTutorial && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenTutorial();
                }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                title="Open step-by-step tutorial"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tutorial</span>
              </button>
            )}
          </div>

          {/* Input field with inline diff suggestion card & ghost text */}
          <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0 space-y-2">
            {activeInputSuggestion && (
              <InlineDiffSuggestionCard
                items={activeInputSuggestion.items}
                title={activeInputSuggestion.title}
                onAccept={handleApplyActiveInputSuggestion}
                onAcceptAll={handleApplyActiveInputSuggestion}
                onReject={() => setActiveInputSuggestion(null)}
              />
            )}

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
                      ? "Press Tab ⇥ to apply suggestion or type a question..." 
                      : "Ask a question or request suggestions..."
                  }
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder-slate-400 transition pr-28"
                />

                {ghostText && (
                  <span 
                    onClick={handleAcceptGhostText}
                    className="absolute right-3 top-2 text-[11px] text-slate-400 font-mono pointer-events-auto cursor-pointer hover:text-emerald-700 flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs"
                    title="Press Tab ⇥ to insert suggestion"
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
                title="Send message"
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
