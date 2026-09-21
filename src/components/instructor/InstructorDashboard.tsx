import React from 'react';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Activity, 
  AlertTriangle, 
  Zap, 
  Sparkles, 
  Calendar,
  ChevronRight,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { InstructorClass, InstructorDashboardStats, InstructorViewMode } from '../../types/instructor';
import { INSTRUCTOR_CLASSES, INSTRUCTOR_STATS, INSTRUCTOR_ACTIVITIES } from '../../data/instructorData';

interface Props {
  onSelectClass: (cohortClass: InstructorClass) => void;
  onNavigate: (view: InstructorViewMode) => void;
}

export const InstructorDashboard: React.FC<Props> = ({ onSelectClass, onNavigate }) => {
  return (
    <div className="space-y-6">
      {/* 1. Top Summary Banner & 5-Second Clarity Headline */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="max-w-3xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trung tâm Điều phối Đào tạo AI & Workshop Giảng viên</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Tổng quan Tiến độ Giảng dạy & Đào tạo Promptify
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Theo dõi tức thì số lượng học viên đang thực hành, mức độ hoàn thành từng kỹ thuật Prompting và hỗ trợ kịp thời các cán bộ gặp khó khăn.
          </p>
        </div>

        {/* 4 Core Summary Cards (In line with 5-second clarity) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 relative z-10">
          {/* Card 1: Active Classes */}
          <div className="bg-slate-800/80 backdrop-blur-xs border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Lớp đang diễn ra</span>
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {INSTRUCTOR_STATS.activeClasses}
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              ● Đang trong giờ đào tạo
            </p>
          </div>

          {/* Card 2: Total Learners */}
          <div className="bg-slate-800/80 backdrop-blur-xs border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Tổng số học viên</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {INSTRUCTOR_STATS.totalLearners}
            </div>
            <p className="text-[11px] text-slate-400">
              Cán bộ Agribank & DN
            </p>
          </div>

          {/* Card 3: Learners Started */}
          <div className="bg-slate-800/80 backdrop-blur-xs border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Đã bắt đầu học</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {INSTRUCTOR_STATS.startedLearners}
            </div>
            <p className="text-[11px] text-amber-300 font-medium">
              {Math.round((INSTRUCTOR_STATS.startedLearners / INSTRUCTOR_STATS.totalLearners) * 100)}% đã chạy bài lab
            </p>
          </div>

          {/* Card 4: Learners Completed */}
          <div className="bg-slate-800/80 backdrop-blur-xs border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Đã hoàn thành</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {INSTRUCTOR_STATS.completedLearners}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {Math.round((INSTRUCTOR_STATS.completedLearners / INSTRUCTOR_STATS.totalLearners) * 100)}% hoàn tất 5 bài
            </p>
          </div>
        </div>
      </div>

      {/* 2. Grid: Class Cards Overview (Left 8 Cols) + Quick Activity Stream (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Class Cards Overview */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Các lớp đang quản lý ({INSTRUCTOR_CLASSES.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('learners')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              Xem danh sách toàn bộ học viên →
            </button>
          </div>

          <div className="space-y-4">
            {INSTRUCTOR_CLASSES.map((cls) => {
              const notStarted = cls.totalLearners - cls.startedLearners;

              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {cls.name}
                        </h3>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {cls.classCode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {cls.organization} • {cls.department}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ● Đang diễn ra
                      </span>
                      <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        {cls.timeRemainingText}
                      </span>
                    </div>
                  </div>

                  {/* Progress & Stats Bar */}
                  <div className="bg-slate-50/80 rounded-xl p-3.5 space-y-2 border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Tiến độ trung bình lớp: <strong className="text-emerald-700">{cls.avgProgressPercent}%</strong>
                      </span>
                      <span className="text-slate-500">
                        {cls.completedLearners}/{cls.totalLearners} hoàn thành (5/5 lab)
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${cls.avgProgressPercent}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Tổng: <strong>{cls.totalLearners}</strong> học viên</span>
                      <span className="text-amber-700">Chưa học: <strong>{notStarted}</strong></span>
                      <span className="text-indigo-600">Đang học: <strong>{cls.startedLearners - cls.completedLearners}</strong></span>
                      <span className="text-emerald-700 font-semibold">Hoàn thành: <strong>{cls.completedLearners}</strong></span>
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Khai giảng: {cls.startDate}</span>
                    </div>

                    <button
                      onClick={() => onSelectClass(cls)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                    >
                      <span>Xem chi tiết lớp này</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Alerts & Activity Preview */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Hoạt động mới nhất
              </h2>
            </div>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              Xem tất cả →
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {INSTRUCTOR_ACTIVITIES.slice(0, 5).map((act) => (
              <div key={act.id} className="p-3.5 hover:bg-slate-50/70 transition space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                      {act.learnerAvatar}
                    </div>
                    <span className="font-bold text-xs text-slate-900">{act.learnerName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{act.timeAgo}</span>
                </div>

                <p className="text-xs text-slate-700 leading-snug pl-8">
                  {act.detail}
                </p>
                <div className="text-[10px] text-slate-400 pl-8 font-medium">
                  {act.className}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Alert Card */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Ghi chú Điều phối viên:</span>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              Hiện có <strong>19 học viên</strong> chưa đăng nhập hoặc chưa bắt đầu Lab 1. Hãy nhắc nhở trong nhóm Zalo/Teams của lớp để kịp tiến độ buổi workshop.
            </p>
            <button
              onClick={() => onNavigate('learners')}
              className="text-xs font-bold text-amber-800 hover:underline cursor-pointer pt-1 block"
            >
              Lọc danh sách học viên chưa bắt đầu →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
