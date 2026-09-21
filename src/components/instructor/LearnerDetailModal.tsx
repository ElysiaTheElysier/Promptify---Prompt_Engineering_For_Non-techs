import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  Send
} from 'lucide-react';
import { InstructorLearner } from '../../types/instructor';
import { LABS_DATA } from '../../data/labsData';

interface Props {
  learner: InstructorLearner | null;
  onClose: () => void;
}

export const LearnerDetailModal: React.FC<Props> = ({ learner, onClose }) => {
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [reminderSent, setReminderSent] = useState<boolean>(false);

  if (!learner) return null;

  const handleCopyPrompt = () => {
    if (learner.recentPromptSample) {
      navigator.clipboard.writeText(learner.recentPromptSample);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleSendReminder = () => {
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 3000);
  };

  const renderStatus = (status: InstructorLearner['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đã hoàn thành toàn bộ
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Đang thực hành
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-800 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Chưa bắt đầu học
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Linear style: Clean, quiet) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200">
              {learner.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">{learner.name}</h3>
                <span className="text-xs text-slate-400 font-mono">
                  {learner.employeeCode}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {learner.email} · {learner.department} · {learner.className}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast */}
        {reminderSent && (
          <div className="bg-slate-900 text-white px-6 py-2 text-xs flex items-center justify-between">
            <span>Đã gửi thông báo nhắc nhở tiến độ học tới {learner.name} ({learner.email}).</span>
            <button onClick={() => setReminderSent(false)} className="text-slate-400 hover:text-white ml-3">✕</button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Metrics: Linear/Stripe inline strip (NO card-inside-card) */}
          <div className="flex flex-wrap items-baseline gap-6 sm:gap-8 py-3 border-b border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Trạng thái</span>
              <span className="mt-0.5 block">{renderStatus(learner.status)}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 self-center hidden sm:block" />
            <div>
              <span className="text-slate-400 block text-[11px]">Tiến độ khóa học</span>
              <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                {learner.completedLabIds.length}/5 bài lab
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 self-center hidden sm:block" />
            <div>
              <span className="text-slate-400 block text-[11px]">Tổng lần thử prompt</span>
              <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                {learner.promptAttemptsTotal} lần
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 self-center hidden sm:block" />
            <div>
              <span className="text-slate-400 block text-[11px]">Hoạt động cuối</span>
              <span className="text-slate-600 mt-0.5 block">
                {learner.lastActive}
              </span>
            </div>
          </div>

          {/* 5-Lesson Checklist: Flat clean list with thin dividers */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Chi tiết 5 bài thực hành
            </span>

            <div className="border-t border-b border-slate-200 divide-y divide-slate-100">
              {LABS_DATA.map((lab, index) => {
                const isCompleted = learner.completedLabIds.includes(lab.id);
                const isCurrent = learner.currentLabId === lab.id && !isCompleted;
                const attempts = learner.attemptsByLab[lab.id] || 0;

                return (
                  <div 
                    key={lab.id} 
                    className="py-2.5 flex items-baseline justify-between gap-4 hover:bg-slate-50/50 px-1 transition"
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-mono text-slate-400 text-[11px] w-4">{index + 1}.</span>
                      <span className="font-medium text-slate-900 truncate">{lab.title}</span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">· {lab.badge}</span>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0 text-xs">
                      <span className="text-slate-400 text-[11px] font-mono">
                        {attempts > 0 ? `${attempts} lần thử` : '—'}
                      </span>
                      <span className={`text-[11px] w-20 text-right ${
                        isCompleted ? 'text-emerald-700 font-medium' : isCurrent ? 'text-slate-700 font-medium' : 'text-slate-400'
                      }`}>
                        {isCompleted ? '✓ Đã xong' : isCurrent ? '▶ Đang làm' : 'Chưa mở'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Prompt Sample */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Câu lệnh prompt gần nhất
              </span>
              {learner.recentPromptSample && (
                <button
                  onClick={handleCopyPrompt}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer inline-flex items-center gap-1"
                >
                  {copiedPrompt ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPrompt ? 'Đã sao chép' : 'Sao chép prompt'}</span>
                </button>
              )}
            </div>

            {learner.recentPromptSample ? (
              <div className="bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-md font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                {learner.recentPromptSample}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                Học viên chưa thực hiện câu lệnh prompt nào trong buổi thực hành.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
          <button
            onClick={handleSendReminder}
            disabled={reminderSent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 hover:bg-white text-slate-700 font-medium transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3 h-3 text-slate-400" />
            <span>Gửi nhắc nhở (Email / Teams)</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
