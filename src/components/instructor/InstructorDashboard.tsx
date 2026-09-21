import React from 'react';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  Activity
} from 'lucide-react';
import { InstructorClass, InstructorViewMode } from '../../types/instructor';
import { INSTRUCTOR_CLASSES, INSTRUCTOR_STATS, INSTRUCTOR_ACTIVITIES } from '../../data/instructorData';

interface Props {
  onSelectClass: (cohortClass: InstructorClass) => void;
  onNavigate: (view: InstructorViewMode) => void;
}

export const InstructorDashboard: React.FC<Props> = ({ onSelectClass, onNavigate }) => {
  // Lớp cần chú ý nhất (tiến độ hoàn thành thấp nhất / nhiều học viên chưa bắt đầu nhất)
  const primaryClass = [...INSTRUCTOR_CLASSES].sort((a, b) => a.avgProgressPercent - b.avgProgressPercent)[0];
  const otherClasses = INSTRUCTOR_CLASSES.filter((c) => c.id !== primaryClass.id);

  const primaryNotStarted = primaryClass.totalLearners - primaryClass.startedLearners;
  const primaryInProgress = primaryClass.startedLearners - primaryClass.completedLearners;

  return (
    <div className="space-y-8">
      {/* 1. COMPACT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan Điều phối Lớp học
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát tiến độ học tập và can thiệp kịp thời các lớp đào tạo Prompt Engineering
          </p>
        </div>

        <button
          onClick={() => onNavigate('learners')}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer self-start sm:self-auto"
        >
          Xem toàn bộ 86 học viên →
        </button>
      </div>

      {/* 2. THREE SMALL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Active Classes */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Lớp đang hoạt động</span>
            <span className="text-2xl font-bold text-slate-900 block mt-0.5">{INSTRUCTOR_STATS.activeClasses}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 2: Total Learners */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Tổng học viên</span>
            <span className="text-2xl font-bold text-slate-900 block mt-0.5">{INSTRUCTOR_STATS.totalLearners}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 3: Completed Learners */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Đã hoàn thành</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-emerald-600">{INSTRUCTOR_STATS.completedLearners}</span>
              <span className="text-xs text-slate-400 font-medium">
                ({Math.round((INSTRUCTOR_STATS.completedLearners / INSTRUCTOR_STATS.totalLearners) * 100)}%)
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. PRIMARY CLASS REQUIRING ATTENTION (FEATURED CARD) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Lớp học cần ưu tiên chú ý
          </span>
          <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Tiến độ hoàn thành thấp nhất ({primaryClass.avgProgressPercent}%)
          </span>
        </div>

        <div className="bg-white rounded-2xl border-2 border-amber-200/90 p-6 shadow-sm hover:shadow-md transition space-y-5">
          {/* Header of Featured Card */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Cần hỗ trợ
                </span>
                <span className="font-mono text-xs font-semibold text-slate-400">
                  {primaryClass.classCode}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {primaryClass.name}
              </h2>
              <p className="text-xs text-slate-500">
                {primaryClass.organization} • {primaryClass.department}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 self-start">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Thời hạn: {primaryClass.timeRemainingText}</span>
            </div>
          </div>

          {/* Progress Bar (Visual Priority #2) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-baseline justify-between text-xs">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{primaryClass.avgProgressPercent}%</span>
                <span className="text-slate-500">tiến độ hoàn thành trung bình</span>
              </div>
              <span className="font-semibold text-slate-700">
                {primaryClass.completedLearners}/{primaryClass.totalLearners} học viên hoàn tất
              </span>
            </div>

            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${primaryClass.avgProgressPercent}%` }}
              />
            </div>

            {/* Lean metrics breakdown */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
              <span className="text-amber-700 font-medium">
                Chưa bắt đầu: <strong>{primaryNotStarted}</strong> học viên
              </span>
              <span className="text-slate-600">
                Đang học: <strong>{primaryInProgress}</strong> học viên
              </span>
              <span className="text-emerald-700 font-medium">
                Đã xong: <strong>{primaryClass.completedLearners}</strong> học viên
              </span>
            </div>
          </div>

          {/* Single Primary CTA */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onSelectClass(primaryClass)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
            >
              <span>Xem chi tiết lớp này</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. OTHER CLASSES AS COMPACT ROWS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Các lớp khác đang diễn ra ({otherClasses.length})
          </span>
          <button
            onClick={() => onNavigate('classes')}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Tất cả lớp học →
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {otherClasses.map((cls) => (
            <div
              key={cls.id}
              className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Left Info */}
              <div className="space-y-1 min-w-[260px] max-w-md">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400">{cls.classCode}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{cls.department}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {cls.name}
                </h3>
              </div>

              {/* Middle: Progress Bar */}
              <div className="flex-1 max-w-xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{cls.avgProgressPercent}%</span>
                  <span className="text-slate-400 text-[11px]">
                    {cls.completedLearners}/{cls.totalLearners} học viên
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${cls.avgProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Right: Single CTA Button */}
              <div className="flex items-center justify-end">
                <button
                  onClick={() => onSelectClass(cls)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition cursor-pointer"
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. RECENT ACTIVITY AT THE BOTTOM */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Hoạt động gần nhất
            </span>
          </div>
          <button
            onClick={() => onNavigate('activity')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Xem toàn bộ nhật ký →
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {INSTRUCTOR_ACTIVITIES.slice(0, 4).map((act) => (
            <div key={act.id} className="p-3.5 sm:px-5 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  {act.learnerAvatar}
                </div>
                <div className="truncate">
                  <span className="font-bold text-slate-900">{act.learnerName}</span>{' '}
                  <span className="text-slate-600">{act.detail}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 text-slate-400 text-[11px]">
                <span className="hidden md:inline text-slate-500">{act.className}</span>
                <span>{act.timeAgo}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
