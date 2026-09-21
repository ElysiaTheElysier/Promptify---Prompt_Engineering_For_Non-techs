import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  FileSpreadsheet, 
  Bell, 
  Building2, 
  Calendar,
  Sparkles,
  Zap,
  TrendingUp
} from 'lucide-react';
import { InstructorClass } from '../../types/instructor';
import { LearnerTableView } from './LearnerTableView';

interface Props {
  cohortClass: InstructorClass;
  onBack: () => void;
}

export const ClassDetailView: React.FC<Props> = ({ cohortClass, onBack }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const notStartedCount = cohortClass.totalLearners - cohortClass.startedLearners;
  const inProgressCount = cohortClass.startedLearners - cohortClass.completedLearners;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Class Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại Tổng quan</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {cohortClass.name}
              </h1>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                {cohortClass.classCode}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Đang diễn ra
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {cohortClass.organization} • {cohortClass.department}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Bắt đầu: {cohortClass.startDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Thời hạn lớp: {cohortClass.timeRemainingText}
              </span>
            </div>

            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed pt-1">
              {cohortClass.description}
            </p>
          </div>

          {/* Quick Class Actions */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => showToast('Đã xuất báo cáo tiến độ lớp dạng Excel/CSV (Mock)!')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất danh sách</span>
            </button>

            <button
              onClick={() => showToast(`Đã gửi thông báo nhắc nhở tới ${notStartedCount + inProgressCount} học viên chưa hoàn thành!`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>Gửi thông báo lớp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Class Health Breakdown (3 Summary Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total & Avg Progress */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng học viên</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{cohortClass.totalLearners}</span>
            <span className="text-xs text-slate-500 font-medium">người</span>
          </div>
          <div className="pt-1">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-medium">
              <span>Tiến độ trung bình:</span>
              <span className="font-bold text-slate-800">{cohortClass.avgProgressPercent}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${cohortClass.avgProgressPercent}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Chưa bắt đầu */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Chưa bắt đầu</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{notStartedCount}</span>
            <span className="text-xs text-slate-500 font-medium">
              ({Math.round((notStartedCount / cohortClass.totalLearners) * 100)}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Học viên chưa kích hoạt bài lab đầu tiên
          </p>
        </div>

        {/* Đang học */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Đang thực hành</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600">{inProgressCount}</span>
            <span className="text-xs text-slate-500 font-medium">
              ({Math.round((inProgressCount / cohortClass.totalLearners) * 100)}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Đang hoàn thành các bài từ Lab 1 tới Lab 4
          </p>
        </div>

        {/* Hoàn thành */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Đã hoàn thành</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{cohortClass.completedLearners}</span>
            <span className="text-xs text-slate-500 font-medium">
              ({Math.round((cohortClass.completedLearners / cohortClass.totalLearners) * 100)}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Đã hoàn tất trọn bộ 5 bài thực hành
          </p>
        </div>
      </div>

      {/* Progress by Lesson / Technique (5 Labs) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Tiến độ theo từng bài học & kỹ thuật Prompting
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Chuẩn hóa năng lực Prompting doanh nghiệp
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {cohortClass.lessonProgress.map((lp, idx) => (
            <div 
              key={lp.labId} 
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {lp.completionPercent}%
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={lp.labTitle}>
                  {lp.labTitle}
                </h4>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold text-slate-800">{lp.completedCount}</span>
                  <span className="text-xs text-slate-400">/ {lp.totalCount} học viên</span>
                </div>
              </div>

              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${lp.completionPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded Learner Table for this class */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Danh sách học viên trong lớp</span>
          </h2>
          <span className="text-xs text-slate-500">
            Dữ liệu đồng bộ trực tiếp từ các buổi thực hành
          </span>
        </div>

        <LearnerTableView 
          initialClassId={cohortClass.id} 
          showClassFilter={false} 
        />
      </div>
    </div>
  );
};

