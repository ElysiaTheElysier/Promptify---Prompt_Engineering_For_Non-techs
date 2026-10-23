import React, { useEffect, useState } from 'react';
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
  TrendingUp,
  HelpCircle
} from 'lucide-react';
import { InstructorClass } from '../../types/instructor';
import { CourseCurriculumModule } from '../../types/database';
import { dbService } from '../../services/dbService';
import { LearnerTableView } from './LearnerTableView';
import { CourseManagementModal } from './CourseManagementModal';
import { AddLearnerModal } from './AddLearnerModal';

interface Props {
  cohortClass: InstructorClass;
  onBack: () => void;
  onOpenTutorial?: () => void;
  onRefreshClasses?: () => void;
}

export const ClassDetailView: React.FC<Props> = ({ 
  cohortClass, 
  onBack, 
  onOpenTutorial,
  onRefreshClasses
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [isAddLearnerModalOpen, setIsAddLearnerModalOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [curriculum, setCurriculum] = useState<CourseCurriculumModule[]>([]);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState<boolean>(true);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCurriculum = async () => {
      setIsCurriculumLoading(true);
      setCurriculumError(null);
      try {
        const modules = await dbService.getInstructorCourseCurriculum(cohortClass.courseId);
        if (isMounted) setCurriculum(modules);
      } catch (error) {
        if (isMounted) {
          setCurriculum([]);
          setCurriculumError(error instanceof Error ? error.message : 'Không thể tải nội dung khóa học.');
        }
      } finally {
        if (isMounted) setIsCurriculumLoading(false);
      }
    };

    loadCurriculum();
    return () => {
      isMounted = false;
    };
  }, [cohortClass.id, refreshKey]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const notStartedCount = cohortClass.totalLearners - cohortClass.startedLearners;
  const inProgressCount = Math.max(0, cohortClass.startedLearners - cohortClass.completedLearners);
  const learnerTotal = cohortClass.totalLearners || 0;
  const lessonCount = curriculum.reduce((total, module) => total + module.lessons.length, 0);
  const classStatusLabel = {
    active: 'Đang diễn ra',
    upcoming: 'Sắp diễn ra',
    completed: 'Đã hoàn thành',
    archived: 'Đã lưu trữ',
  }[cohortClass.status];
  const publicationLabel = (status: 'draft' | 'published' | 'archived') => ({
    draft: 'Bản nháp',
    published: 'Đã xuất bản',
    archived: 'Đã lưu trữ',
  }[status]);

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
      <div data-tour="class-detail-header" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
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
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-white shadow-xs">
                Mã Lớp: {cohortClass.classCode}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● {classStatusLabel}
              </span>
            </div>

            {/* Class Tracking Metadata: ClassID -> Course -> Client -> Industry -> Department */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Doanh nghiệp:</span> {cohortClass.organization}
              </span>
              {cohortClass.industry && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400 font-medium">Ngành:</span>
                    <strong className="text-slate-700 font-semibold">{cohortClass.industry}</strong>
                  </span>
                </>
              )}
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1">
                <span className="text-slate-400 font-medium">Phòng ban:</span>
                <strong className="text-slate-700 font-semibold">{cohortClass.department}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-amber-800 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Thời hạn:</span> {cohortClass.timeRemainingText}
              </span>
            </div>

            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed pt-1">
              {cohortClass.description}
            </p>
          </div>

          {/* Quick Class Actions */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Nút Quản lý Khóa học (P0.5) */}
            <button
              onClick={() => setIsCourseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-xs"
              title="Quản lý nội dung và cấu trúc khóa học"
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Quản lý nội dung</span>
            </button>

            {/* Nút Thêm học viên vào lớp (P0.6) */}
            <button
              onClick={() => setIsAddLearnerModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>+ Thêm học viên</span>
            </button>

            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition cursor-pointer"
                title="Xem lại hướng dẫn chi tiết lớp"
              >
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>Hướng dẫn</span>
              </button>
            )}
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
              ({learnerTotal > 0 ? Math.round((notStartedCount / learnerTotal) * 100) : 0}%)
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
            Đang thực hành trong {lessonCount || cohortClass.lessonProgress.length} bài học của khóa học
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
              ({learnerTotal > 0 ? Math.round((cohortClass.completedLearners / learnerTotal) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Đã hoàn tất toàn bộ {lessonCount || cohortClass.lessonProgress.length} bài học
          </p>
        </div>
      </div>

      {/* Course curriculum is loaded from course_modules and lessons for this class's course. */}
      <div data-tour="class-detail-roadmap" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Nội dung khóa học
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {isCurriculumLoading ? 'Đang tải...' : `${lessonCount} bài học • ${curriculum.length} chương`}
          </span>
        </div>

        {isCurriculumLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Đang tải nội dung khóa học từ database...</div>
        ) : curriculumError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {curriculumError}
          </div>
        ) : lessonCount === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Khóa học này chưa có bài học. Chọn “Quản lý nội dung” để thêm chương và bài học.
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            {curriculum.map((module, moduleIndex) => (
              <section key={module.id} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {moduleIndex + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{module.title}</h3>
                  <span className="text-[11px] text-slate-500">{module.lessons.length} bài học</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {publicationLabel(module.status)}
                  </span>
                </div>
                {module.description && <p className="text-xs text-slate-500 ml-8">{module.description}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <article key={lesson.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200 transition space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-mono font-semibold text-emerald-700">{lesson.lesson_key}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          {publicationLabel(lesson.status)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-relaxed" title={lesson.title}>
                        {lessonIndex + 1}. {lesson.title}
                      </h4>
                      {lesson.focus_skill && <p className="text-[11px] text-slate-500 line-clamp-2">{lesson.focus_skill}</p>}
                      <p className="text-[11px] text-slate-400">
                        {lesson.rubric_criteria.length} tiêu chí chấm • {lesson.resources.length} tài nguyên
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Embedded Learner Table for this class */}
      <div data-tour="class-detail-learners" className="space-y-3">
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
          key={refreshKey}
          initialClassId={cohortClass.id} 
          showClassFilter={false} 
          onLearnerCountChanged={() => {
            setRefreshKey(k => k + 1);
            onRefreshClasses?.();
          }}
        />
      </div>

      {/* Modal Quản lý Khóa học */}
      <CourseManagementModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onCoursesChanged={() => {
          setRefreshKey(k => k + 1);
          onRefreshClasses?.();
        }}
      />

      {/* Modal Thêm Học Viên */}
      <AddLearnerModal
        isOpen={isAddLearnerModalOpen}
        onClose={() => setIsAddLearnerModalOpen(false)}
        classId={cohortClass.id}
        classCode={cohortClass.classCode}
        department={cohortClass.department}
        onLearnerAdded={() => {
          showToast('Đã thêm học viên mới vào lớp thành công!');
          setRefreshKey(k => k + 1);
          onRefreshClasses?.();
        }}
      />
    </div>
  );
};

