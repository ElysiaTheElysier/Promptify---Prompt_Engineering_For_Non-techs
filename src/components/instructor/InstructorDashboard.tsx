import React, { useState } from 'react';
import { ChevronRight, SlidersHorizontal, HelpCircle } from 'lucide-react';
import { InstructorClass, InstructorViewMode } from '../../types/instructor';
import { INSTRUCTOR_CLASSES, INSTRUCTOR_STATS, INSTRUCTOR_ACTIVITIES } from '../../data/instructorData';
import { InstructorDashboardOriginal } from './InstructorDashboardOriginal';

interface Props {
  onSelectClass: (cohortClass: InstructorClass) => void;
  onNavigate: (view: InstructorViewMode) => void;
  onOpenTutorial?: () => void;
}

export const InstructorDashboard: React.FC<Props> = ({ onSelectClass, onNavigate, onOpenTutorial }) => {
  // Hỗ trợ A/B comparison giữa bản thử nghiệm mới (Linear / Stripe / GitHub style) và bản cũ
  const [useOriginalView, setUseOriginalView] = useState<boolean>(false);

  // Lớp cần chú ý nhất (focal point: tiến độ thấp nhất / nhiều học viên chưa bắt đầu nhất)
  const primaryClass = [...INSTRUCTOR_CLASSES].sort((a, b) => a.avgProgressPercent - b.avgProgressPercent)[0];
  const otherClasses = INSTRUCTOR_CLASSES.filter((c) => c.id !== primaryClass.id);

  const primaryNotStarted = primaryClass.totalLearners - primaryClass.startedLearners;
  const primaryInProgress = primaryClass.startedLearners - primaryClass.completedLearners;

  if (useOriginalView) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-md flex items-center justify-between text-xs text-amber-900">
          <span>Đang hiển thị: <strong>Bản giao diện cũ (Card-heavy SaaS template)</strong></span>
          <button
            onClick={() => setUseOriginalView(false)}
            className="font-medium text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Chuyển sang Bản mới (Linear / Stripe / GitHub style)</span>
          </button>
        </div>
        <InstructorDashboardOriginal onSelectClass={onSelectClass} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-4 px-2 sm:px-0">
      {/* 1. HEADER RẤT GỌN (Linear Style: Typography rõ ràng, không dark hero, không gradient) */}
      <header className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Tổng quan lớp học
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi các lớp bạn đang phụ trách
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
          {onOpenTutorial && (
            <>
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium transition cursor-pointer"
                title="Xem hướng dẫn sử dụng Dashboard"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Hướng dẫn tab này</span>
              </button>
              <span className="text-slate-300">·</span>
            </>
          )}
          <button
            onClick={() => setUseOriginalView(true)}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title="Bấm để đối chiếu với bản Card-heavy cũ"
          >
            So sánh bản cũ
          </button>
          <span className="text-slate-300">·</span>
          <button
            onClick={() => onNavigate('learners')}
            className="text-slate-600 hover:text-slate-900 font-medium transition cursor-pointer"
          >
            Danh sách học viên →
          </button>
        </div>
      </header>

      {/* 2. SUMMARY NHỎ (Stripe Style: Inline Text Stats với Divider, KHÔNG dùng card lớn) */}
      <section className="flex flex-wrap items-baseline gap-8 sm:gap-12 py-2 text-sm text-slate-600">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-slate-900">
            {INSTRUCTOR_STATS.activeClasses}
          </span>
          <span className="text-slate-500 text-sm">lớp đang hoạt động</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200 self-center" />

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-slate-900">
            {INSTRUCTOR_STATS.totalLearners}
          </span>
          <span className="text-slate-500 text-sm">học viên</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200 self-center" />

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-emerald-700">
            {INSTRUCTOR_STATS.completedLearners}
          </span>
          <span className="text-slate-500 text-sm">đã hoàn thành</span>
          <span className="text-xs text-slate-400 ml-1">
            ({Math.round((INSTRUCTOR_STATS.completedLearners / INSTRUCTOR_STATS.totalLearners) * 100)}%)
          </span>
        </div>
      </section>

      {/* 3. SECTION QUAN TRỌNG NHẤT: LỚP CẦN CHÚ Ý (Focal Point duy nhất có visual weight lớn) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Lớp cần chú ý
          </span>
          <span className="text-xs text-slate-400">
            Còn {primaryClass.timeRemainingText}
          </span>
        </div>

        {/* Focal Container: Viền mảnh tinh tế, border-l màu amber, KHÔNG bo góc quá đà, KHÔNG shadow */}
        <div className="bg-white border-y sm:border border-slate-200 sm:rounded-lg p-6 space-y-6">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                {primaryClass.name}
              </h2>
              <span className="font-mono text-xs text-slate-400">
                {primaryClass.classCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {primaryClass.organization} · {primaryClass.department}
            </p>
          </div>

          {/* Progress: Thanh đo tuyến tính thanh thoát */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-900">
                {primaryClass.avgProgressPercent}% hoàn thành
              </span>
              <span className="text-xs text-slate-400">
                {primaryClass.completedLearners}/{primaryClass.totalLearners} học viên
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${primaryClass.avgProgressPercent}%` }}
              />
            </div>

            {/* Plain text breakdown - Viết trực tiếp, KHÔNG dùng chip badge */}
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

          {/* Single Primary Action: Rõ ràng, dứt khoát */}
          <div className="pt-1">
            <button
              onClick={() => onSelectClass(primaryClass)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              <span>Xem chi tiết lớp →</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. CÁC LỚP KHÁC (GitHub Style: Compact List / Table mỏng, KHÔNG nested cards, KHÔNG shadow) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Các lớp khác
          </span>
          <button
            onClick={() => onNavigate('classes')}
            className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            Tất cả lớp →
          </button>
        </div>

        <div className="border-t border-b border-slate-200 divide-y divide-slate-100">
          {otherClasses.map((cls) => (
            <div
              key={cls.id}
              className="py-3.5 flex items-center justify-between gap-6 hover:bg-slate-50/70 px-2 -mx-2 transition"
            >
              {/* Class Info */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-slate-900 truncate">
                  {cls.name}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {cls.organization} · {cls.department}
                </p>
              </div>

              {/* Progress & Stat */}
              <div className="flex items-center gap-6 sm:gap-8 flex-shrink-0 text-xs">
                <div className="w-28 sm:w-36 space-y-1">
                  <div className="flex justify-between text-slate-600 text-[11px]">
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
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Xem →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. RECENT ACTIVITY (GitHub Style: Chuyển xuống đáy, thông tin tĩnh lặng, không tranh chấp chú ý) */}
      <section className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Hoạt động gần đây
          </span>
          <button
            onClick={() => onNavigate('activity')}
            className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            Xem nhật ký đầy đủ →
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs text-slate-600">
          {INSTRUCTOR_ACTIVITIES.slice(0, 4).map((act) => (
            <div key={act.id} className="py-2.5 flex items-baseline justify-between gap-4">
              <div className="truncate pr-4">
                <span className="font-medium text-slate-900">{act.learnerName}</span>{' '}
                <span className="text-slate-600">{act.detail}</span>
              </div>
              <span className="text-slate-400 flex-shrink-0 text-right text-[11px]">
                {act.timeAgo}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
