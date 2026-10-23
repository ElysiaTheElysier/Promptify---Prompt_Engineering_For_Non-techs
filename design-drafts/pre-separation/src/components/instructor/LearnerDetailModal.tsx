import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  Terminal, 
  Copy, 
  Check, 
  Building2, 
  Mail, 
  Award,
  Zap,
  BookOpen
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
    setTimeout(() => setReminderSent(false), 3500);
  };

  const getStatusBadge = (status: InstructorLearner['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã hoàn thành toàn bộ
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Đang thực hành
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Chưa bắt đầu học
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-base flex items-center justify-center shadow-md">
              {learner.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{learner.name}</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {learner.employeeCode}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {learner.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {learner.department}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reminder Toast Notification */}
        {reminderSent && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Đã gửi email thông báo nhắc nhở tiến độ học tới <strong>{learner.name}</strong> ({learner.email})!</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Trạng thái</span>
              <div>{getStatusBadge(learner.status)}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Tiến độ khóa học</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900">{learner.completedLabIds.length}</span>
                <span className="text-xs text-slate-500">/ 5 bài lab</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Tổng lần chạy prompt</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-emerald-700">{learner.promptAttemptsTotal}</span>
                <span className="text-xs text-slate-500">lần thử</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Hoạt động gần nhất</span>
              <span className="text-xs font-semibold text-slate-700 block mt-1">
                {learner.lastActive}
              </span>
            </div>
          </div>

          {/* 5-Lesson Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Tiến độ chi tiết từng bài học (5 Kỹ thuật Prompt)
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Lớp: <strong className="text-slate-700">{learner.className}</strong>
              </span>
            </div>

            <div className="space-y-2 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
              {LABS_DATA.map((lab, index) => {
                const isCompleted = learner.completedLabIds.includes(lab.id);
                const isCurrent = learner.currentLabId === lab.id && !isCompleted;
                const attempts = learner.attemptsByLab[lab.id] || 0;

                return (
                  <div 
                    key={lab.id} 
                    className={`p-3.5 flex items-center justify-between text-xs transition ${
                      isCompleted ? 'bg-emerald-50/30' : isCurrent ? 'bg-indigo-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            ▶
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{lab.title}</span>
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {lab.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {lab.taskGoal}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {attempts > 0 ? `${attempts} lần thử nghiệm` : 'Chưa thử'}
                      </span>
                      <span className={`text-[11px] font-semibold ${
                        isCompleted ? 'text-emerald-700' : isCurrent ? 'text-indigo-600' : 'text-slate-400'
                      }`}>
                        {isCompleted ? 'Hoàn thành' : isCurrent ? 'Đang thực hiện' : 'Chưa mở'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Prompt Sample */}
          {learner.recentPromptSample ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  Mẫu Prompt gần nhất học viên vừa thử nghiệm
                </h4>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Đã sao chép' : 'Sao chép prompt'}</span>
                </button>
              </div>

              <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-xs border border-slate-800 whitespace-pre-wrap leading-relaxed">
                {learner.recentPromptSample}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Học viên chưa thực hiện câu lệnh prompt nào trong buổi thực hành.</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleSendReminder}
            disabled={reminderSent}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{reminderSent ? 'Đang gửi thông báo...' : 'Gửi nhắc nhở học tập (Email / Teams)'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};

