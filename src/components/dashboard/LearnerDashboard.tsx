import React from 'react';
import { 
  CheckCircle2, 
  Play, 
  Bookmark, 
  History, 
  HelpCircle, 
  ChevronRight,
  Layers3
} from 'lucide-react';
import { ClassCohort, Enrollment, LabStep, AppView } from '../../types';

interface Props {
  cohort: ClassCohort;
  enrollment: Enrollment;
  labs: LabStep[];
  onStartLesson: (labId: string) => void;
  onNavigate: (view: AppView) => void;
  onOpenTutorial: () => void;
}

export const LearnerDashboard: React.FC<Props> = ({
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

  // Bản đồ tiêu đề phụ dễ hiểu theo yêu cầu bài toán
  const getLessonSubtitle = (order: number) => {
    switch (order) {
      case 1:
        return 'Zero-shot — Prompt cơ bản, chưa có ví dụ';
      case 2:
        return 'Structured Prompt — Thêm Role, Context, Constraint, Format';
      case 3:
        return 'One-shot — Học từ một ví dụ mẫu';
      case 4:
        return 'Few-shot & Grounding — Học từ nhiều ví dụ & đối chiếu tài liệu';
      case 5:
        return 'Thực hành tự do — Áp dụng vào nghiệp vụ thực tế của bạn';
      default:
        return 'Kỹ năng Prompt nâng cao cho nghiệp vụ';
    }
  };

  const getLessonStatus = (labId: string, index: number) => {
    if (enrollment.completedLabIds.includes(labId)) {
      return 'completed';
    }
    if (nextLab.id === labId) {
      return 'current';
    }
    return 'locked';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Thông tin lớp đang được chọn; lời chào và menu lớp nằm ở Trang chủ. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
                {cohort.classCode}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {cohort.organization} • {cohort.department}
              </span>
            </div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              <Layers3 className="h-6 w-6 text-emerald-600" />
              Lộ trình học
            </h1>
            <p className="text-base font-bold text-slate-800">{cohort.name}</p>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">{cohort.description}</p>
          </div>

          <div className="min-w-[260px] space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Tiến độ lớp này</span>
              <span className="font-extrabold text-emerald-700">{completedCount}/{totalCount} bài · {progressPercent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[11px] text-slate-500">
              {isCourseCompleted ? 'Đã hoàn thành toàn bộ lộ trình.' : `Bài tiếp theo: ${nextLab.title}`}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Lộ trình Học Tập (Learning Path) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Lộ trình {totalCount} bài học</span>
              <span className="text-xs font-normal text-slate-500 hidden sm:inline">
                (Từ Zero-shot đến Grounding tài liệu chuẩn mực)
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Bấm vào bài học bất kỳ để mở không gian làm bài tương tác
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {labs.map((lab) => {
            const status = getLessonStatus(lab.id, lab.order - 1);
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';

            return (
              <div
                key={lab.id}
                onClick={() => onStartLesson(lab.id)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group ${
                  isCurrent
                    ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : isCompleted
                    ? 'bg-emerald-50/30 border-emerald-200/80 hover:bg-emerald-50/60'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {/* Left: Indicator + Title + Subtitle */}
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {isCompleted ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-600 flex items-center justify-center font-bold text-xs shadow-xs animate-pulse">
                        <Play className="w-4 h-4 fill-emerald-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold text-xs">
                        {lab.order}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold font-mono text-slate-500">
                        Bài {lab.order}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isCompleted ? '✓ Đã hoàn thành' : isCurrent ? '▶ Đang học' : '○ Chưa học'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {lab.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                      {lab.title}
                    </h3>

                    <p className="text-xs text-slate-600 font-medium">
                      {getLessonSubtitle(lab.order)}
                    </p>

                    <p className="text-xs text-slate-400 line-clamp-1">
                      {lab.scenario}
                    </p>
                  </div>
                </div>

                {/* Right: CTA button */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
                    isCurrent
                      ? 'bg-emerald-600 text-white group-hover:bg-emerald-700'
                      : isCompleted
                      ? 'text-emerald-700 bg-emerald-100/60 group-hover:bg-emerald-200/60'
                      : 'text-slate-600 bg-slate-100 group-hover:bg-slate-200'
                  }`}>
                    {isCompleted ? 'Học lại' : isCurrent ? 'Làm bài ngay' : 'Vào bài'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Công Cụ Thực Hành (Practice Tools) */}
      <section className="space-y-4 pt-2">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Công cụ thực hành bổ trợ</span>
          </h2>
          <p className="text-xs text-slate-500">
            Các tiện ích hỗ trợ người học thử nghiệm, tra cứu và lưu trữ câu lệnh mẫu
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Tool 2: Prompt Library */}
          <div
            onClick={() => onNavigate('library')}
            className="bg-white border border-slate-200/90 hover:border-emerald-500/60 rounded-2xl p-4 shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Bookmark className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                Thư viện Prompt
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Khám phá kho prompt chuẩn mực nghiệp vụ ngân hàng được chuyên gia khuyên dùng.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-amber-600 group-hover:text-amber-700">
              <span>Xem Thư viện</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Tool 3: History */}
          <div
            onClick={() => onNavigate('history')}
            className="bg-white border border-slate-200/90 hover:border-emerald-500/60 rounded-2xl p-4 shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition">
                Lịch sử câu lệnh
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Xem lại toàn bộ các lần thử, so sánh câu lệnh trước và kết quả AI sinh ra.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
              <span>Xem Lịch sử</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Tool 4: Tutorial */}
          <div
            onClick={onOpenTutorial}
            className="bg-white border border-slate-200/90 hover:border-emerald-500/60 rounded-2xl p-4 shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition">
                Xem lại hướng dẫn
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Khởi động lại visual walkthrough hướng dẫn quy trình học 8 bước trực quan.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-teal-600 group-hover:text-teal-700">
              <span>Bật hướng dẫn</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

