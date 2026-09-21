import React from 'react';
import { 
  ArrowRight, 
  Check, 
  ChevronRight, 
  Sliders, 
  Bookmark, 
  History, 
  HelpCircle 
} from 'lucide-react';
import { ClassCohort, Learner, Enrollment, LabStep, AppView } from '../../types';

interface Props {
  learner: Learner;
  cohort: ClassCohort;
  enrollment: Enrollment;
  labs: LabStep[];
  onStartLesson: (labId: string) => void;
  onNavigate: (view: AppView) => void;
  onOpenTutorial: () => void;
}

export const LearnerDashboard: React.FC<Props> = ({
  learner,
  cohort,
  enrollment,
  labs,
  onStartLesson,
  onNavigate,
  onOpenTutorial,
}) => {
  const completedCount = enrollment.completedLabIds.length;
  const totalCount = labs.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Tìm bài học tiếp theo cần học
  const nextLab = labs.find((l) => !enrollment.completedLabIds.includes(l.id)) || labs[0];
  const isCourseCompleted = completedCount === totalCount;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* 1. Header (Linear Style: Typography + Whitespace + Thin Divider) */}
      <section className="space-y-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            Xin chào, {learner.name}
          </h1>
          <div className="text-sm font-medium text-slate-700">
            {cohort.name}
          </div>
          <div className="text-xs text-slate-500">
            {cohort.organization} · {cohort.department}
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">
              Tiến độ {completedCount} / {totalCount} bài
            </span>
            {/* Thanh tiến độ mảnh tối giản */}
            <div className="w-28 sm:w-36 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              {progressPercent}%
            </span>
          </div>

          {cohort.expiryDateText && (
            <span className="text-slate-400 font-medium">
              Thời gian sử dụng: {cohort.expiryDateText}
            </span>
          )}
        </div>
      </section>

      {/* 2. Bài tiếp theo (Primary Focal Point / Main Action) */}
      <section className="space-y-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isCourseCompleted ? 'Khóa học đã hoàn tất' : 'Bài tiếp theo'}
        </div>

        <div className="p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-700 font-mono">
                Bài {nextLab.order}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">
                {nextLab.badge}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
              {nextLab.title.startsWith(`Bài ${nextLab.order}`) ? nextLab.title : `Bài ${nextLab.order}: ${nextLab.title}`}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              {nextLab.taskGoal || nextLab.scenario}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onStartLesson(nextLab.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm transition cursor-pointer shadow-xs"
            >
              <span>{completedCount === 0 ? 'Bắt đầu học →' : 'Tiếp tục học →'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Lộ trình học (Learning Path - GitHub/Linear List Style with Thin Dividers) */}
      <section className="space-y-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Lộ trình học
        </div>

        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden text-xs sm:text-sm">
          {labs.map((lab) => {
            const isCompleted = enrollment.completedLabIds.includes(lab.id);
            const isCurrent = !isCompleted && nextLab.id === lab.id;

            return (
              <div
                key={lab.id}
                onClick={() => onStartLesson(lab.id)}
                className={`px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer transition ${
                  isCurrent
                    ? 'bg-slate-50 font-medium'
                    : isCompleted
                    ? 'hover:bg-slate-50/60 text-slate-700'
                    : 'hover:bg-slate-50/60 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status Indicator Icon */}
                  <div className="w-5 flex items-center justify-center flex-shrink-0">
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <ArrowRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <span className="text-slate-300 font-mono text-xs">
                        {lab.order < 10 ? `0${lab.order}` : lab.order}
                      </span>
                    )}
                  </div>

                  {/* Order prefix if completed or current */}
                  {(isCompleted || isCurrent) && (
                    <span className="font-mono text-xs text-slate-400 flex-shrink-0">
                      {lab.order < 10 ? `0${lab.order}` : lab.order}
                    </span>
                  )}

                  {/* Title & Technique */}
                  <span className={`truncate ${isCurrent ? 'font-semibold text-slate-900' : isCompleted ? 'text-slate-800' : 'text-slate-500'}`}>
                    {lab.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                  {isCurrent && (
                    <span className="text-emerald-700 font-medium text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      Đang học
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Công cụ (Tools - Clean Minimal Rows/Cards) */}
      <section className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Công cụ
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Playground */}
          <div
            onClick={() => onNavigate('playground')}
            className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 transition cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">Playground</span>
                <Sliders className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Tự do thử prompt ngoài bài học
              </p>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
              Mở Playground →
            </span>
          </div>

          {/* Thư viện */}
          <div
            onClick={() => onNavigate('library')}
            className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 transition cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">Thư viện Prompt</span>
                <Bookmark className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Kho prompt mẫu nghiệp vụ chuẩn
              </p>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
              Xem Thư viện →
            </span>
          </div>

          {/* Lịch sử */}
          <div
            onClick={() => onNavigate('history')}
            className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 transition cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">Lịch sử</span>
                <History className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Xem lại các câu lệnh và kết quả AI
              </p>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
              Xem Lịch sử →
            </span>
          </div>

          {/* Xem lại hướng dẫn */}
          <div
            onClick={onOpenTutorial}
            className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 transition cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">Xem lại hướng dẫn</span>
                <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Mở lại visual walkthrough 8 bước
              </p>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
              Bật hướng dẫn →
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
