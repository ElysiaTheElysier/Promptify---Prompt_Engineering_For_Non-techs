import React, { useState } from 'react';
import { 
  Building2, 
  Megaphone, 
  Briefcase, 
  Clock, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  BookOpen, 
  LogOut, 
  AlertCircle,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { ClassCohort, Learner, Enrollment } from '../../types';
import { CLASS_COHORTS, DEFAULT_ENROLLMENTS } from '../../data/classesData';

interface Props {
  learner?: Learner | null;
  cohorts: ClassCohort[];
  enrollments: Record<string, Enrollment>;
  totalLabCount: number;
  onSelectClass: (cohort: ClassCohort) => Promise<boolean>;
  onJoinClassByCode: (code: string) => Promise<boolean>;
  onLogout: () => void;
  onResetAll?: () => void;
}

export const ClassSelectionScreen: React.FC<Props> = ({
  learner,
  cohorts,
  enrollments,
  totalLabCount,
  onSelectClass,
  onJoinClassByCode,
  onLogout,
  onResetAll,
}) => {
  const [classCodeInput, setClassCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [joinSuccess, setJoinSuccess] = useState<string>('');

  const getCohortIcon = (iconName: string) => {
    switch (iconName) {
      case 'Megaphone':
        return <Megaphone className="w-5 h-5 text-emerald-400" />;
      case 'Building2':
        return <Building2 className="w-5 h-5 text-teal-400" />;
      default:
        return <Briefcase className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    if (!classCodeInput.trim()) {
      setJoinError('Vui lòng nhập mã lớp do giảng viên hoặc ban tổ chức cung cấp.');
      return;
    }
    const ok = await onJoinClassByCode(classCodeInput.trim());
    if (ok) {
      setJoinSuccess(`Đã tham gia lớp thành công với mã ${classCodeInput.toUpperCase()}!`);
      setClassCodeInput('');
    } else {
      setJoinError('Tài khoản chưa được giảng viên ghi danh vào lớp này, hoặc mã lớp không hợp lệ.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-3 select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white font-display">
                Promptify
              </span>
              <span className="text-[11px] text-slate-400 block">
                Cổng đào tạo Cán bộ Nghiệp vụ
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700 text-xs">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
                {learner?.avatarInitials || 'LP'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="font-semibold text-slate-200 block">{learner?.name || 'Học viên'}</span>
                <span className="text-[10px] text-slate-400">{learner?.email || ''}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Đăng xuất khỏi tài khoản"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Không gian học tập của bạn</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Chọn lớp học của bạn
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Chào mừng <strong>{learner?.name || 'Học viên'}</strong> ({learner?.department || ''}). Chỉ những lớp mà giảng viên đã ghi danh tài khoản của bạn mới xuất hiện tại đây.
          </p>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cohorts.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <ShieldAlert className="mx-auto h-9 w-9 text-amber-600" />
              <h2 className="mt-3 text-base font-bold text-amber-950">Bạn chưa được ghi danh vào khóa học</h2>
              <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-amber-800">
                Hãy liên hệ giảng viên hoặc quản trị viên để được thêm vào một lớp. Đăng nhập hoặc biết mã lớp không tự động cấp quyền học và làm bài.
              </p>
            </div>
          )}
          {cohorts.map((cohort) => {
            const enrollmentKey = learner ? `${learner.id}_${cohort.id}` : '';
            const enrollment = enrollments[enrollmentKey] || DEFAULT_ENROLLMENTS[enrollmentKey];
            const completedCount = enrollment ? enrollment.completedLabIds.length : 0;
            const safeTotal = Math.max(1, totalLabCount);
            const progressPercent = Math.round((completedCount / safeTotal) * 100);

            return (
              <div
                key={cohort.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-lg hover:border-emerald-500/60 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Header of Card */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      {getCohortIcon(cohort.iconName)}
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {cohort.classCode}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                      {cohort.name}
                    </h3>
                    <div className="text-xs font-semibold text-slate-700 mt-1">
                      {cohort.organization} • {cohort.department}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Ngành: <span className="font-medium text-slate-700">{cohort.industry}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {cohort.description}
                  </p>

                  {/* Expiry Badge */}
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Thời hạn truy cập: <strong>{cohort.expiryDateText || `Còn ${cohort.expiryDurationHours} giờ`}</strong></span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Tiến độ bài học:</span>
                      <span className="font-bold text-slate-800">{completedCount} / {totalLabCount} bài ({progressPercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      const ok = await onSelectClass(cohort);
                      if (!ok) setJoinError('Quyền truy cập lớp đã hết hạn hoặc bị thu hồi.');
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <span>{completedCount > 0 ? 'Tiếp tục học' : 'Vào lớp học'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Join new class section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-xl">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-1">
            <Plus className="w-5 h-5 text-emerald-600" />
            <h3>Tham gia thêm lớp học bằng mã</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Mã lớp chỉ dùng để tìm lớp mà tài khoản của bạn đã được giảng viên ghi danh. Mã lớp không tự cấp quyền truy cập:
          </p>

          <form onSubmit={handleJoinSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={classCodeInput}
                onChange={(e) => {
                  setClassCodeInput(e.target.value);
                  setJoinError('');
                  setJoinSuccess('');
                }}
                placeholder="Ví dụ: AGRI-COMM hoặc AGRI-CREDIT"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Tham gia lớp
              </button>
            </div>

            {joinError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            {joinSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{joinSuccess}</span>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};
