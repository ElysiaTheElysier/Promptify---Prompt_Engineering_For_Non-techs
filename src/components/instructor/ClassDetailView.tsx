import React, { useState } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { InstructorClass } from '../../types/instructor';
import { LearnerTableView } from './LearnerTableView';

interface Props {
  cohortClass: InstructorClass;
  onBack: () => void;
  onOpenTutorial?: () => void;
}

export const ClassDetailView: React.FC<Props> = ({ cohortClass, onBack, onOpenTutorial }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const notStartedCount = cohortClass.totalLearners - cohortClass.startedLearners;
  const inProgressCount = cohortClass.startedLearners - cohortClass.completedLearners;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 px-2 sm:px-0">
      {/* Toast notification */}
      {toastMessage && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-md text-xs flex items-center justify-between animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 1. Header (Linear Style: Clean Breadcrumb & Typography) */}
      <div className="space-y-3 pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại lớp học</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {cohortClass.name}
              </h1>
              <span className="font-mono text-xs text-slate-400">
                {cohortClass.classCode}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {cohortClass.organization} · {cohortClass.department} · Thời hạn: {cohortClass.timeRemainingText}
            </p>
          </div>

          {/* Clean Action Buttons */}
          <div className="flex items-center gap-2 text-xs flex-shrink-0">
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1 px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-md font-medium transition cursor-pointer"
                title="Xem hướng dẫn chi tiết lớp"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Hướng dẫn tab này</span>
              </button>
            )}
            <button
              onClick={() => showToast('Đã xuất báo cáo tiến độ lớp dạng file CSV (Mock).')}
              className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium transition cursor-pointer"
            >
              Xuất danh sách
            </button>
            <button
              onClick={() => showToast(`Đã gửi thông báo nhắc nhở tới ${notStartedCount + inProgressCount} học viên.`)}
              className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition cursor-pointer"
            >
              Gửi nhắc nhở lớp
            </button>
          </div>
        </div>
      </div>

      {/* 2. Summary Row (Stripe Style: Concise, No Card clutter) */}
      <div className="flex flex-wrap items-baseline gap-6 sm:gap-10 text-sm text-slate-600">
        <div>
          <span className="text-xl font-semibold text-slate-900 mr-1.5">{cohortClass.totalLearners}</span>
          <span className="text-xs text-slate-500">học viên</span>
        </div>
        <div className="h-3 w-px bg-slate-200 self-center hidden sm:block" />
        <div>
          <span className="text-xl font-semibold text-slate-900 mr-1.5">{cohortClass.avgProgressPercent}%</span>
          <span className="text-xs text-slate-500">tiến độ trung bình</span>
        </div>
        <div className="h-3 w-px bg-slate-200 self-center hidden sm:block" />
        <div className="text-xs text-slate-500">
          <span className="text-emerald-700 font-medium">{cohortClass.completedLearners} hoàn thành</span>
          <span className="mx-2 text-slate-300">·</span>
          <span>{inProgressCount} đang học</span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-amber-800 font-medium">{notStartedCount} chưa bắt đầu</span>
        </div>
      </div>

      {/* 3. Progress by Lesson / Technique (Linear Style: Clean Linear Roadmap Rows) */}
      <section className="space-y-3 pt-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Tiến độ theo 5 kỹ thuật Prompting
        </span>

        <div className="border-t border-b border-slate-200 divide-y divide-slate-100 text-xs">
          {cohortClass.lessonProgress.map((lp, idx) => (
            <div key={lp.labId} className="py-2.5 flex items-center justify-between gap-6 hover:bg-slate-50/60 px-2 -mx-2 transition">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-mono text-slate-400 text-[11px] w-4">{idx + 1}.</span>
                <span className="font-medium text-slate-900 truncate">{lp.labTitle}</span>
              </div>

              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="w-28 sm:w-40 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span className="font-medium text-slate-900">{lp.completionPercent}%</span>
                    <span className="text-slate-400">{lp.completedCount}/{lp.totalCount}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${lp.completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Learner Management within this class (GitHub Style Flat Table) */}
      <section className="space-y-3 pt-4 border-t border-slate-200">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Học viên trong lớp ({cohortClass.totalLearners})
        </span>

        <LearnerTableView
          initialClassId={cohortClass.id}
          showClassFilter={false}
        />
      </section>
    </div>
  );
};
