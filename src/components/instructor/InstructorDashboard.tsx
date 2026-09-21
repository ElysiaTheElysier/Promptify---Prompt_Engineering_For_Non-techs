import React, { useState } from 'react';
import { ArrowRight, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { InstructorClass, InstructorViewMode } from '../../types/instructor';
import { INSTRUCTOR_CLASSES, INSTRUCTOR_STATS, INSTRUCTOR_ACTIVITIES } from '../../data/instructorData';
import { InstructorDashboardOriginal } from './InstructorDashboardOriginal';

interface Props {
  onSelectClass: (cohortClass: InstructorClass) => void;
  onNavigate: (view: InstructorViewMode) => void;
}

export const InstructorDashboard: React.FC<Props> = ({ onSelectClass, onNavigate }) => {
  // Hỗ trợ A/B comparison giữa bản thử nghiệm mới (Humanized) và bản cũ (Card-heavy)
  const [useOriginalView, setUseOriginalView] = useState<boolean>(false);

  // Lớp cần chú ý nhất (focal point: tiến độ thấp nhất, nhiều học viên chưa bắt đầu nhất)
  const primaryClass = [...INSTRUCTOR_CLASSES].sort((a, b) => a.avgProgressPercent - b.avgProgressPercent)[0];
  const otherClasses = INSTRUCTOR_CLASSES.filter((c) => c.id !== primaryClass.id);

  const primaryNotStarted = primaryClass.totalLearners - primaryClass.startedLearners;
  const primaryInProgress = primaryClass.startedLearners - primaryClass.completedLearners;

  if (useOriginalView) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <span>Đang hiển thị: <strong>Bản giao diện cũ (Card-heavy / SaaS style)</strong></span>
          <button
            onClick={() => setUseOriginalView(false)}
            className="font-semibold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Chuyển sang Bản thử nghiệm (Humanized)</span>
          </button>
        </div>
        <InstructorDashboardOriginal onSelectClass={onSelectClass} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-2">
      {/* A/B Switcher Pill (Tinh tế, góc trên) */}
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-[11px] text-slate-500">
          <span className="px-2 py-0.5 font-semibold text-slate-900 bg-white rounded shadow-2xs">
            Bản mới (Humanized)
          </span>
          <button
            onClick={() => setUseOriginalView(true)}
            className="px-2 py-0.5 hover:text-slate-900 transition cursor-pointer"
            title="Bấm để đối chiếu với bản Card-heavy trước đây"
          >
            Bản cũ (Card-heavy)
          </button>
        </div>
      </div>

      {/* 1. HEADER RẤT GỌN (Typography rõ ràng, không dark hero, không gradient) */}
      <header className="space-y-1 pb-1">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
          Tổng quan lớp học
        </h1>
        <p className="text-sm text-slate-500">
          Theo dõi các lớp bạn đang phụ trách
        </p>
      </header>

      {/* 2. SUMMARY NHỎ (Inline Text Stats với Divider mỏng, KHÔNG dùng card lớn) */}
      <section className="flex flex-wrap items-baseline gap-6 sm:gap-10 py-4 border-y border-slate-200 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-slate-900 font-display">
            {INSTRUCTOR_STATS.activeClasses}
          </span>
          <span className="text-slate-500">lớp đang hoạt động</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200 self-center" />

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-slate-900 font-display">
            {INSTRUCTOR_STATS.totalLearners}
          </span>
          <span className="text-slate-500">học viên</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200 self-center" />

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-emerald-600 font-display">
            {INSTRUCTOR_STATS.completedLearners}
          </span>
          <span className="text-slate-500">đã hoàn thành</span>
          <span className="text-xs text-slate-400 ml-1">
            ({Math.round((INSTRUCTOR_STATS.completedLearners / INSTRUCTOR_STATS.totalLearners) * 100)}%)
          </span>
        </div>
      </section>

      {/* 3. SECTION QUAN TRỌNG NHẤT: LỚP CẦN CHÚ Ý (Focal Point duy nhất có visual emphasis rõ) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Lớp cần chú ý
          </span>
          <span className="text-xs text-slate-400">
            Thời hạn: {primaryClass.timeRemainingText}
          </span>
        </div>

        <div className="bg-white border-l-4 border-l-amber-500 border-y border-r border-slate-200/80 p-6 sm:p-7 rounded-r-xl space-y-6">
          {/* Class Title & Context */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              {primaryClass.name}
            </h2>
            <p className="text-sm text-slate-500">
              {primaryClass.organization} · {primaryClass.department}
            </p>
          </div>

          {/* Progress (Clean, high-contrast, no gradient) */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-xl font-semibold text-slate-900">
                {primaryClass.avgProgressPercent}% hoàn thành
              </span>
              <span className="text-xs text-slate-500">
                {primaryClass.completedLearners}/{primaryClass.totalLearners} học viên
              </span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${primaryClass.avgProgressPercent}%` }}
              />
            </div>

            {/* Plain text breakdown - No chips, no badge spam */}
            <p className="text-xs text-slate-500 pt-1">
              <span>{primaryClass.completedLearners} hoàn thành</span>
              <span className="mx-2 text-slate-300">·</span>
              <span>{primaryInProgress} đang học</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-amber-800 font-medium">
                {primaryNotStarted} học viên chưa bắt đầu
              </span>
            </p>
          </div>

          {/* Single Primary Action */}
          <div className="pt-2">
            <button
              onClick={() => onSelectClass(primaryClass)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition cursor-pointer"
            >
              <span>Xem chi tiết lớp</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. CÁC LỚP KHÁC (Compact List / Light Table, NO nested cards, NO shadows) */}
      <section className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Các lớp khác ({otherClasses.length})
          </span>
          <button
            onClick={() => onNavigate('classes')}
            className="text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            Tất cả lớp →
          </button>
        </div>

        <div className="border-t border-b border-slate-200 divide-y divide-slate-100">
          {otherClasses.map((cls) => (
            <div
              key={cls.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 px-2 -mx-2 transition"
            >
              {/* Class Info */}
              <div className="space-y-0.5 min-w-[280px]">
                <h3 className="text-sm font-medium text-slate-900">
                  {cls.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {cls.organization} · {cls.department}
                </p>
              </div>

              {/* Progress & Stat */}
              <div className="flex items-center gap-6 sm:gap-10 text-xs">
                <div className="w-32 sm:w-44 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-medium text-slate-900">{cls.avgProgressPercent}%</span>
                    <span className="text-slate-400">{cls.completedLearners}/{cls.totalLearners}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${cls.avgProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Single Link CTA */}
                <button
                  onClick={() => onSelectClass(cls)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-emerald-700 transition cursor-pointer whitespace-nowrap"
                >
                  <span>Xem</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. RECENT ACTIVITY (Chuyển xuống đáy, supporting information yên tĩnh, không cạnh tranh chú ý) */}
      <section className="space-y-3 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hoạt động gần đây
          </span>
          <button
            onClick={() => onNavigate('activity')}
            className="text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            Xem nhật ký đầy đủ →
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs text-slate-600">
          {INSTRUCTOR_ACTIVITIES.slice(0, 4).map((act) => (
            <div key={act.id} className="py-2.5 flex items-center justify-between gap-4">
              <div className="truncate pr-4">
                <span className="font-medium text-slate-900">{act.learnerName}</span>{' '}
                <span className="text-slate-600">{act.detail}</span>
              </div>
              <span className="text-slate-400 flex-shrink-0 text-right">
                {act.timeAgo}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
