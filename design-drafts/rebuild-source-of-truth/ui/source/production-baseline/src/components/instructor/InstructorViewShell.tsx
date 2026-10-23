import React, { useState, useEffect } from 'react';
import { InstructorActivity, InstructorClass, InstructorViewMode } from '../../types/instructor';
import { dbService } from '../../services/dbService';
import { ClassWithDetails, CourseCurriculumModule, DbLessonProgress, DbPromptAttempt, LearnerInClassDetail } from '../../types/database';
import { InstructorNavbar } from './InstructorNavbar';
import { InstructorDashboard } from './InstructorDashboard';
import { ClassDetailView } from './ClassDetailView';
import { LearnerTableView } from './LearnerTableView';
import { ActivityStreamView } from './ActivityStreamView';
import { InstructorWalkthrough } from './InstructorWalkthrough';
import { ArrowRight, HelpCircle } from 'lucide-react';

interface Props {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    avatarInitials?: string;
  } | null;
  onLogout: () => void;
}

function formatTimeRemaining(endDate?: string | null): string {
  if (!endDate) return 'Không giới hạn';
  const remainingMs = new Date(endDate).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 'Đã kết thúc';
  const hours = Math.ceil(remainingMs / 3_600_000);
  return hours < 24 ? `${hours} giờ` : `${Math.ceil(hours / 24)} ngày`;
}

function formatTimeAgo(timestamp?: string): string {
  if (!timestamp) return 'Không rõ thời gian';
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(timestamp).getTime()) / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} giờ trước` : `${Math.floor(hours / 24)} ngày trước`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1]?.[0] || ''}` : parts[0]?.slice(0, 2) || 'HV').toUpperCase();
}

function publishedLessons(curriculum: CourseCurriculumModule[]) {
  return curriculum
    .filter((module) => module.status === 'published')
    .flatMap((module) => module.lessons.filter((lesson) => lesson.status === 'published'));
}

function attemptMatchesLesson(attempt: DbPromptAttempt, lesson: ReturnType<typeof publishedLessons>[number]): boolean {
  return attempt.lesson_ref_id === lesson.id || attempt.lesson_id === lesson.id || attempt.lesson_id === lesson.lesson_key;
}

function mapDbClassToInstructorClass(
  cls: ClassWithDetails,
  learners: LearnerInClassDetail[],
  curriculum: CourseCurriculumModule[],
  progressRows: DbLessonProgress[],
): InstructorClass {
  const enrolledLearners = learners.filter((learner) => learner.enrollment_status !== 'removed');
  const enrolledIds = new Set(enrolledLearners.map((learner) => learner.learner_id));
  const realProgress = progressRows.filter((progress) => enrolledIds.has(progress.learner_id));
  const lessons = publishedLessons(curriculum);
  const startedLearnerIds = new Set(realProgress.filter((progress) => progress.attempts_count > 0).map((progress) => progress.learner_id));
  const learnerProgress = enrolledLearners.map((learner) => {
    if (lessons.length === 0) return 0;
    const completedLessonIds = new Set(realProgress
      .filter((progress) => progress.learner_id === learner.learner_id && progress.status === 'completed')
      .map((progress) => progress.lesson_id));
    return (lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length / lessons.length) * 100;
  });
  // Preserve the existing product semantic: class completion is the enrollment
  // lifecycle status, while lesson/class percentages come from learning events.
  const completedLearnerIds = enrolledLearners
    .filter((learner) => learner.enrollment_status === 'completed')
    .map((learner) => learner.learner_id);
  const avgProgress = learnerProgress.length > 0
    ? Math.round(learnerProgress.reduce((sum, value) => sum + value, 0) / learnerProgress.length)
    : 0;

  return {
    id: cls.id,
    courseId: cls.course_id,
    classCode: cls.class_code,
    name: cls.course?.title || cls.class_code,
    organization: cls.client?.name || '',
    industry: cls.client?.industry || '',
    department: cls.department || '',
    totalLearners: enrolledLearners.length,
    learnerIds: [...enrolledIds],
    startedLearners: startedLearnerIds.size,
    completedLearners: completedLearnerIds.length,
    completedLearnerIds,
    avgProgressPercent: avgProgress,
    status: cls.status,
    timeRemainingText: formatTimeRemaining(cls.end_date),
    startDate: cls.start_date,
    description: cls.course?.description || '',
    lessonProgress: lessons.map((lesson) => {
      const attemptedBy = new Set(realProgress
        .filter((progress) => progress.lesson_id === lesson.id && progress.status === 'completed')
        .map((progress) => progress.learner_id));
      return {
        labId: lesson.id,
        labTitle: lesson.title,
        completedCount: attemptedBy.size,
        totalCount: enrolledLearners.length,
        completionPercent: enrolledLearners.length > 0 ? Math.round((attemptedBy.size / enrolledLearners.length) * 100) : 0,
      };
    }),
  };
}

function buildActivities(
  attempts: DbPromptAttempt[],
  classes: InstructorClass[],
  learnersByClass: Map<string, LearnerInClassDetail[]>,
  curriculaByCourse: Map<string, CourseCurriculumModule[]>,
  dbClasses: ClassWithDetails[],
): InstructorActivity[] {
  const classById = new Map(classes.map((item) => [item.id, item]));
  const dbClassById = new Map(dbClasses.map((item) => [item.id, item]));
  return [...attempts]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map((attempt) => {
      const dbClass = dbClassById.get(attempt.class_id);
      const learner = (learnersByClass.get(attempt.class_id) || []).find((item) => item.learner_id === attempt.learner_id);
      const lesson = publishedLessons(curriculaByCourse.get(dbClass?.course_id || '') || [])
        .find((item) => attemptMatchesLesson(attempt, item));
      const learnerName = learner?.full_name || learner?.learner_code || 'Học viên';
      const score = attempt.evaluation_json?.total;
      return {
        id: attempt.id,
        timestamp: attempt.created_at || '',
        timeAgo: formatTimeAgo(attempt.created_at),
        learnerId: attempt.learner_id,
        learnerName,
        learnerAvatar: initials(learnerName),
        classId: attempt.class_id,
        className: classById.get(attempt.class_id)?.name || dbClass?.class_code || 'Lớp học',
        actionType: 'run_prompt' as const,
        actionText: 'Chạy Prompt',
        detail: `Đã chạy prompt lần ${attempt.attempt_number}${typeof score === 'number' ? ` · Điểm ${score}/10` : ' · Chưa có đánh giá'}`,
        labId: lesson?.id || attempt.lesson_ref_id || attempt.lesson_id,
        labName: lesson?.title || attempt.lesson_id,
      };
    });
}

export const InstructorViewShell: React.FC<Props> = ({ currentUser, onLogout }) => {
  const [currentView, setCurrentView] = useState<InstructorViewMode>(() => {
    const saved = sessionStorage.getItem('promptify_instructor_view') as InstructorViewMode;
    if (saved && ['dashboard', 'classes', 'class_detail', 'learners', 'activity'].includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });
  const [classes, setClasses] = useState<InstructorClass[]>([]);
  const [activities, setActivities] = useState<InstructorActivity[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<InstructorClass | null>(null);

  // Sync instructor view to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('promptify_instructor_view', currentView);
  }, [currentView]);

  // Sync selectedClass ID to sessionStorage
  useEffect(() => {
    if (selectedClass) {
      sessionStorage.setItem('promptify_instructor_class_id', selectedClass.id);
    }
  }, [selectedClass]);

  // Nạp danh sách lớp động từ DB với guard kiểm tra unmount và session
  const reloadClasses = async (isMounted = true) => {
    if (!currentUser) return;
    setIsLoadingClasses(true);
    setClassesError(null);
    try {
      const dbClasses = await dbService.getInstructorClassesWithDetails();
      if (!isMounted) return;
      if (dbClasses && dbClasses.length > 0) {
        const courseIds = [...new Set(dbClasses.map((item) => item.course_id))];
        const curriculaByCourse = new Map(await Promise.all(courseIds.map(async (courseId) => (
          [courseId, await dbService.getInstructorCourseCurriculum(courseId)] as const
        ))));
        const learnersByClass = new Map(await Promise.all(dbClasses.map(async (item) => (
          [item.id, await dbService.getInstructorLearnersInClass(item.id)] as const
        ))));
        const allAttempts = await dbService.getInstructorPromptAttempts(dbClasses.map((item) => item.id));
        const allProgress = await dbService.getInstructorLessonProgress(dbClasses.map((item) => item.id));
        const attemptsByClass = new Map<string, DbPromptAttempt[]>();
        allAttempts.forEach((attempt) => {
          const list = attemptsByClass.get(attempt.class_id) || [];
          list.push(attempt);
          attemptsByClass.set(attempt.class_id, list);
        });
        if (!isMounted) return;
        const mapped = dbClasses.map((item) => mapDbClassToInstructorClass(
          item,
          learnersByClass.get(item.id) || [],
          curriculaByCourse.get(item.course_id) || [],
          allProgress.filter((progress) => progress.class_id === item.id),
        ));
        setClasses(mapped);
        setActivities(buildActivities(allAttempts, mapped, learnersByClass, curriculaByCourse, dbClasses));
        const savedClassId = sessionStorage.getItem('promptify_instructor_class_id');
        setSelectedClass(prev => {
          if (prev) {
            const found = mapped.find(m => m.id === prev.id || m.classCode === prev.classCode);
            if (found) return found;
          }
          if (savedClassId) {
            const found = mapped.find(m => m.id === savedClassId || m.classCode === savedClassId);
            if (found) return found;
          }
          return mapped[0];
        });
      } else {
        setClasses([]);
        setActivities([]);
        setSelectedClass(null);
      }
    } catch (err) {
      if (isMounted) {
        console.error('Lỗi tải dữ liệu giám sát lớp học:', err);
        setClasses([]);
        setActivities([]);
        setClassesError(err instanceof Error ? err.message : 'Không thể tải dữ liệu giám sát từ cơ sở dữ liệu.');
      }
    } finally {
      if (isMounted) setIsLoadingClasses(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    reloadClasses(isMounted);
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Quản lý Spotlight Walkthrough cho từng tab
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [tutorialView, setTutorialView] = useState<InstructorViewMode>('dashboard');

  const tutorialKeyForView = (view: InstructorViewMode) => `instructor_${view}`;

  const handleOpenTutorial = (view?: InstructorViewMode) => {
    setTutorialView(view || currentView);
    setIsTutorialOpen(true);
  };

  // Chỉ mở sau khi trạng thái DB của đúng user + screen đã resolve.
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    dbService.hasCompletedTutorial(currentUser.id, tutorialKeyForView(currentView))
      .then((completed) => {
        if (!cancelled && !completed) {
          setTutorialView(currentView);
          timer = setTimeout(() => setIsTutorialOpen(true), 350);
        }
      })
      .catch((error) => console.warn('[Instructor tutorial] Không thể resolve trạng thái:', error));
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentView, currentUser?.id]);

  const handleTutorialClose = () => {
    setIsTutorialOpen(false);
    if (currentUser?.id) {
      void dbService.completeTutorial(currentUser.id, tutorialKeyForView(tutorialView))
        .catch((error) => console.warn('[Instructor tutorial] Không thể lưu trạng thái:', error));
    }
  };

  const handleSelectClass = (cls: InstructorClass) => {
    setSelectedClass(cls);
    sessionStorage.setItem('promptify_instructor_class_id', cls.id);
    sessionStorage.setItem('promptify_instructor_view', 'class_detail');
    setCurrentView('class_detail');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar for Instructor */}
      <InstructorNavbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={onLogout}
        onOpenTutorial={() => handleOpenTutorial(currentView)}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {classesError && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Không thể tải dữ liệu giám sát từ Supabase: {classesError}
          </div>
        )}
        {/* VIEW 1: DASHBOARD OVERVIEW */}
        {currentView === 'dashboard' && (
          <InstructorDashboard
            onSelectClass={handleSelectClass}
            onNavigate={setCurrentView}
            onOpenTutorial={() => handleOpenTutorial('dashboard')}
            classes={classes}
            activities={activities}
            isLoading={isLoadingClasses}
          />
        )}

        {/* VIEW 2: CLASSES LIST */}
        {currentView === 'classes' && (
          <div className="space-y-6">
            <div data-tour="classes-header" className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Danh sách Lớp học Đang phụ trách
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Chọn một lớp để theo dõi tiến độ chi tiết từng học viên và các bài lab
                </p>
              </div>

              <button
                onClick={() => handleOpenTutorial('classes')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-medium rounded-md transition cursor-pointer self-start sm:self-auto"
                title="Xem lại hướng dẫn danh sách lớp học"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xem lại hướng dẫn</span>
              </button>
            </div>

            <div data-tour="classes-list-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {classes.map((cls, idx) => (
                <div
                  key={cls.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {cls.classCode}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {{ active: 'Đang diễn ra', upcoming: 'Sắp diễn ra', completed: 'Đã hoàn thành', archived: 'Đã lưu trữ' }[cls.status]}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {[cls.organization, cls.department].filter(Boolean).join(' • ') || 'Chưa có thông tin đơn vị'}
                    </p>

                    <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Tiến độ trung bình:</span>
                        <span className="font-bold text-emerald-700">{cls.avgProgressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${cls.avgProgressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Học viên: <strong>{cls.totalLearners}</strong></span>
                        <span className="text-emerald-700">Xong: <strong>{cls.completedLearners}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    {...(idx === 0 ? { 'data-tour': 'classes-detail-btn' } : {})}
                    onClick={() => handleSelectClass(cls)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    <span>Vào chi tiết lớp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: CLASS DETAIL */}
        {currentView === 'class_detail' && (
          selectedClass ? (
            <ClassDetailView
              cohortClass={selectedClass}
              onBack={() => {
                sessionStorage.setItem('promptify_instructor_view', 'classes');
                sessionStorage.removeItem('promptify_instructor_class_id');
                reloadClasses();
                setCurrentView('classes');
              }}
              onOpenTutorial={() => handleOpenTutorial('class_detail')}
              onRefreshClasses={reloadClasses}
            />
          ) : (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
              <span>Đang tải thông tin chi tiết lớp học...</span>
            </div>
          )
        )}

        {/* VIEW 4: LEARNERS TABLE (ALL CLASSES) */}
        {currentView === 'learners' && (
          <div className="space-y-4">
            <div data-tour="learners-header">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Quản lý & Theo dõi Toàn bộ Học viên
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Tìm kiếm, lọc trạng thái và bấm vào từng học viên để xem chi tiết câu lệnh prompt đã chạy
              </p>
            </div>
            <LearnerTableView 
              showClassFilter={true} 
              onOpenTutorial={() => handleOpenTutorial('learners')}
            />
          </div>
        )}

        {/* VIEW 5: ACTIVITY STREAM */}
        {currentView === 'activity' && (
          <div className="space-y-4">
            <ActivityStreamView
              onOpenTutorial={() => handleOpenTutorial('activity')}
              classes={classes}
              activities={activities}
              isLoading={isLoadingClasses}
            />
          </div>
        )}
      </main>

      {/* Guided Spotlight Walkthrough */}
      <InstructorWalkthrough
        isOpen={isTutorialOpen}
        currentView={tutorialView}
        onClose={handleTutorialClose}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-700">
              Promptify • Instructor & Workshop Management Portal
            </p>
            <p className="text-slate-500">
              Hệ thống giám sát và điều phối buổi đào tạo Prompt Engineering doanh nghiệp
            </p>
          </div>
          <div className="text-slate-400 text-[11px]">
            Phiên làm việc bảo mật • Supabase Role Enforcement Active
          </div>
        </div>
      </footer>
    </div>
  );
};
