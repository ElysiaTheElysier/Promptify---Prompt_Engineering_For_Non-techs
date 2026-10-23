import React, { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import { ClassCohort, Enrollment, Learner } from '../../types';

interface Props {
  learner: Learner;
  cohorts: ClassCohort[];
  selectedCohort: ClassCohort;
  enrollments: Record<string, Enrollment>;
  totalLabCount: number;
  onChooseClass: (cohort: ClassCohort) => Promise<void>;
}

export const LearnerHome: React.FC<Props> = ({
  learner,
  cohorts,
  selectedCohort,
  enrollments,
  totalLabCount,
  onChooseClass,
}) => {
  const [loadingClassId, setLoadingClassId] = useState<string | null>(null);

  const chooseClass = async (cohort: ClassCohort) => {
    setLoadingClassId(cohort.id);
    try {
      await onChooseClass(cohort);
    } finally {
      setLoadingClassId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="relative max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            Không gian học tập của bạn
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Xin chào, {learner.name} 👋
          </h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Chọn một lớp bên dưới để mở đúng lộ trình và nội dung bài học được giao cho bạn.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Lớp học của bạn</h2>
          <p className="mt-1 text-sm text-slate-500">
            Lớp doanh nghiệp chỉ xuất hiện khi giảng viên đã ghi danh; lớp testing công khai luôn có thể tham gia.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cohorts.map((cohort) => {
            const enrollment = enrollments[`${learner.id}_${cohort.id}`];
            const completedCount = enrollment?.completedLabIds.length || 0;
            const progress = totalLabCount > 0
              ? Math.min(100, Math.round((completedCount / totalLabCount) * 100))
              : 0;
            const isSelected = cohort.id === selectedCohort.id;
            const isLoading = loadingClassId === cohort.id;

            return (
              <article
                key={cohort.id}
                className={`flex min-h-[280px] flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/15' : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-emerald-300">
                      {cohort.isPublic ? <Sparkles className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Đang chọn
                        </span>
                      )}
                      {cohort.isPublic && (
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200">
                          Công khai
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold leading-snug text-slate-950">{cohort.name}</h3>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{cohort.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-500">Tiến độ</span>
                      <span className="font-bold text-slate-700">{completedCount}/{totalLabCount} bài · {progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void chooseClass(cohort)}
                  disabled={isLoading}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                >
                  <BookOpen className="h-4 w-4" />
                  {isLoading ? 'Đang mở lớp...' : 'Xem lộ trình lớp này'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
