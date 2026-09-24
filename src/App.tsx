import React, { useState, useEffect } from 'react';
import { 
  UIMode, 
  AppView,
  ClassCohort, 
  Learner,
  Enrollment,
  LabStep, 
  ApiConfig, 
  PromptRun 
} from './types';
import { LABS_DATA } from './data/labsData';
import { LandingLoginScreen } from './components/auth/LandingLoginScreen';
import { ClassSelectionScreen } from './components/classes/ClassSelectionScreen';
import { ProductNavbar } from './components/navigation/ProductNavbar';
import { LearnerDashboard } from './components/dashboard/LearnerDashboard';
import { LearnerHome } from './components/dashboard/LearnerHome';
import { LessonHeaderBar } from './components/lesson/LessonHeaderBar';
import { PromptLibraryView } from './components/library/PromptLibraryView';
import { PromptHistoryView } from './components/history/PromptHistoryView';
import { ApiKeyModal } from './components/common/ApiKeyModal';
import { DiffCompareModal } from './components/common/DiffCompareModal';
import { HybridView } from './components/hybrid/HybridView';
import { AiCoach } from './components/common/AiCoach';
import { GuidedWalkthrough } from './components/common/GuidedWalkthrough';
import { PromptLibraryModal } from './components/common/PromptLibraryModal';
import { InstructorViewShell } from './components/instructor/InstructorViewShell';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { dbService } from './services/dbService';
import { mapCurriculumToLabs } from './services/curriculumAdapter';
import { buildLessonUrl, readLessonId, resolveAuthorizedLessonId } from './services/lessonUrlState';
const reviewClassCode = import.meta.env.VITE_REVIEW_CLASS_CODE?.trim();

const EMPTY_COHORT: ClassCohort = {
  id: '',
  classCode: '',
  name: '',
  organization: '',
  industry: '',
  department: '',
  expiryDurationHours: 0,
  description: '',
  iconName: 'BookOpen',
};

const EMPTY_LAB: LabStep = {
  id: '',
  badge: '',
  title: 'Loading...',
  focusSkill: '',
  scenario: '',
  taskGoal: '',
  baselinePrompt: '',
  improvedPrompt: '',
  hints: [],
  focusComponents: [],
  expectedOutputFormat: '',
  sampleInputContext: '',
  promptPlaceholder: '',
  order: 1,
  conceptTag: '',
  conceptTitle: '',
  conceptExplanation: '',
  rubricCriteria: {
    persona: '',
    task: '',
    guardrails: '',
    format: '',
  },
  simulatedBaselineOutput: '',
  simulatedImprovedOutput: '',
};

export const App: React.FC = () => {
  // Trạng thái kiểm tra phiên đăng nhập (Ngăn loading vô hạn)
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // User thật từ Supabase Auth & public.users
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    organization?: string;
    department?: string;
    avatarInitials?: string;
  } | null>(null);

  // 1. Quản lý Đăng nhập & Học viên (Khởi tạo null, chỉ nhận dữ liệu khi có phiên xác thực)
  const [currentLearner, setCurrentLearner] = useState<Learner | null>(null);

  // 1.1 Quản lý Vai trò (Learner vs Instructor - DUY NHẤT từ public.users.role)
  const [userRole, setUserRole] = useState<'LEARNER' | 'INSTRUCTOR' | null>(null);
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState<boolean>(false);
  const [enrolledClassIds, setEnrolledClassIds] = useState<string[]>([]);

  // 2. Quản lý Màn hình ứng dụng (App View - Khôi phục từ sessionStorage nếu tab đang mở)
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = sessionStorage.getItem('promptify_current_view') as AppView;
    if (saved && saved !== 'landing') return saved;
    return 'landing';
  });

  // 3. Quản lý Lớp học được chọn
  const [selectedCohort, setSelectedCohort] = useState<ClassCohort>(EMPTY_COHORT);

  // 4. Danh sách các lớp học hiện có
  const [cohorts, setCohorts] = useState<ClassCohort[]>([]);

  // Curriculum thật từ database; giữ LABS_DATA làm fallback khi chưa triển khai
  // migration hoặc khóa học chưa có nội dung đã xuất bản.
  const [labs, setLabs] = useState<LabStep[]>([]);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [curriculumReadyKey, setCurriculumReadyKey] = useState<string | null>(null);

  // 5. Quản lý Tiến độ ghi danh (Enrollments)
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({});

  // 6. Chế độ giao diện trong bài học (Hybrid song song hoặc Notebook tuần tự)
  const [preferredLessonMode, setPreferredLessonMode] = useState<UIMode>(() => {
    const saved = sessionStorage.getItem('promptify_lesson_mode') as UIMode;
    if (saved === 'hybrid' || saved === 'notebook') return saved;
    return 'hybrid';
  });

  // 7. Bài lab hiện tại đang học
  const [activeLabId, setActiveLabId] = useState<string>(() => {
    return readLessonId(window.location.search)
      || sessionStorage.getItem('promptify_active_lab_id')
      || 'lab-1';
  });

  // 8. Prompt đang được nạp vào Playground (khi chuyển từ Prompt Library sang)
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>('');

  // 9. Cấu hình AI API
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('promptify_api_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          mode: parsed.mode === 'simulated' ? 'simulated' : 'gemini',
          geminiApiKey: '',
          model: 'server-managed',
          temperature: parsed.temperature ?? 0.3,
        };
      } catch {
        // fallback
      }
    }
    return {
      mode: 'gemini',
      geminiApiKey: '',
      model: 'server-managed',
      temperature: 0.3
    };
  });

  // 10. Lịch sử Telemetry
  const [history, setHistory] = useState<PromptRun[]>(() => {
    const saved = localStorage.getItem('promptify_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Trạng thái modal
  const [activeCompareLab, setActiveCompareLab] = useState<LabStep | null>(null);
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);
  const [isPromptLibraryModalOpen, setIsPromptLibraryModalOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  // Ngữ cảnh học tập hiện tại để Bé Trợ Lý AI Cute đồng hành
  const [activeLab, setActiveLab] = useState<LabStep>(() => {
    const savedId = sessionStorage.getItem('promptify_active_lab_id') || 'lab-1';
    return labs.find((l) => l.id === savedId) || labs[0] || EMPTY_LAB;
  });
  const [activePrompt, setActivePrompt] = useState<string>(() => {
    const savedId = sessionStorage.getItem('promptify_active_lab_id') || 'lab-1';
    const found = labs.find((l) => l.id === savedId) || labs[0];
    return found ? found.baselinePrompt : '';
  });
  const [activeRunCount, setActiveRunCount] = useState<number>(0);

  // Sync activeLab when activeLabId changes và lưu sessionStorage
  useEffect(() => {
    sessionStorage.setItem('promptify_active_lab_id', activeLabId);
    const found = labs.find((l) => l.id === activeLabId);
    if (found) {
      setActiveLab(found);
      setActivePrompt(found.baselinePrompt);
    }
  }, [activeLabId, labs]);

  useEffect(() => {
    let cancelled = false;
    const readyKey = currentUser?.id && hasActiveEnrollment
      ? `${currentUser.id}:${selectedCohort.id}`
      : null;

    setCurriculumReadyKey(null);
    if (!readyKey) return () => { cancelled = true; };

    const loadCourseCurriculum = async () => {
      try {
        setCurriculumError(null);
        const classDetails = await dbService.getClassDetail(selectedCohort.id);
        if (!classDetails) {
          if (!cancelled) {
            setLabs([]);
            setCurriculumError('Class details could not be found in the database. Please verify your enrollment.');
          }
          return;
        }
        const curriculum = await dbService.getCourseCurriculum(classDetails.course_id);
        const databaseLabs = mapCurriculumToLabs(curriculum);
        if (cancelled) return;
        if (databaseLabs.length === 0) {
          setLabs([]);
          setCurriculumError('No published curriculum found for this course in the database. Please run the English review database seed.');
          return;
        }

        setLabs(databaseLabs);
      } catch (error) {
        // Migration chưa được deploy hoặc phiên chưa có quyền: tiếp tục dùng static fallback.
        console.error('[App] Failed to load curriculum from database:', error);
        if (!cancelled) {
          setLabs([]);
          setCurriculumError('Database error loading curriculum: ' + ((error as any)?.message || 'Connection error') + '. Real Supabase data is required for English review.');
        }
      } finally {
        if (!cancelled) setCurriculumReadyKey(readyKey);
      }
    };

    loadCourseCurriculum();
    return () => { cancelled = true; };
  }, [selectedCohort.id, currentUser?.id, hasActiveEnrollment]);

  // URL là source of truth cho bài đang mở, nhưng chỉ được đọc sau khi curriculum
  // của đúng user/lớp đã tải xong và đã qua enrollment authorization.
  useEffect(() => {
    const expectedReadyKey = currentUser?.id && hasActiveEnrollment
      ? `${currentUser.id}:${selectedCohort.id}`
      : null;
    if (!expectedReadyKey || curriculumReadyKey !== expectedReadyKey || labs.length === 0) return;

    const applyLocation = (historyMode: 'replace' | 'pop') => {
      const requestedId = readLessonId(window.location.search);
      if (!requestedId && historyMode === 'pop') {
        setCurrentView('dashboard');
        return;
      }
      if (!requestedId && currentView !== 'lesson') return;

      const authorizedIds = labs.map((lab) => lab.id);
      const resolvedId = resolveAuthorizedLessonId(requestedId, authorizedIds, activeLabId);
      if (!resolvedId) return;

      setActiveLabId(resolvedId);
      const resolvedLab = labs.find((lab) => lab.id === resolvedId);
      if (resolvedLab) {
        setActiveLab(resolvedLab);
        setActivePrompt(resolvedLab.baselinePrompt);
      }
      setCurrentView('lesson');

      if (requestedId !== resolvedId) {
        window.history.replaceState({}, '', buildLessonUrl(window.location.href, resolvedId));
      }
    };

    applyLocation('replace');
    const handlePopState = () => applyLocation('pop');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [curriculumReadyKey, currentUser?.id, hasActiveEnrollment, selectedCohort.id, labs]);

  useEffect(() => {
    sessionStorage.setItem('promptify_lesson_mode', preferredLessonMode);
  }, [preferredLessonMode]);

  // Persist storage
  useEffect(() => {
    if (currentLearner) {
      localStorage.setItem('promptify_learner', JSON.stringify(currentLearner));
    } else {
      localStorage.removeItem('promptify_learner');
    }
  }, [currentLearner]);

  // One-time cleanup of the retired browser-backed learning-progress cache.
  useEffect(() => {
    localStorage.removeItem('promptify_enrollments');
  }, []);

  useEffect(() => {
    if (currentView && currentView !== 'landing') {
      sessionStorage.setItem('promptify_current_view', currentView);
      localStorage.setItem('promptify_view', currentView);
    } else {
      sessionStorage.removeItem('promptify_current_view');
      localStorage.removeItem('promptify_view');
    }
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('promptify_cohort', JSON.stringify(selectedCohort));
    if (selectedCohort?.id) {
      sessionStorage.setItem('promptify_selected_class_id', selectedCohort.id);
    }
  }, [selectedCohort]);

  useEffect(() => {
    localStorage.setItem('promptify_api_config', JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem('promptify_history', JSON.stringify(history));
  }, [history]);



  // Active context change handler
  const handleActiveContextChange = (lab: LabStep, prompt?: string, runCount?: number) => {
    setActiveLab(lab);
    setActiveLabId(lab.id);
    if (prompt !== undefined) setActivePrompt(prompt);
    if (runCount !== undefined) setActiveRunCount(runCount);
  };

  // Record Run is called only after the atomic DB write confirms progress.
  const handleRecordRun = (run: PromptRun) => {
    setHistory((prev) => [run, ...prev]);
    const lab = labs.find((l) => l.id === run.labId);
    if (lab) setActiveLab(lab);
    setActivePrompt(run.promptText);
    setActiveRunCount((prev) => prev + 1);

    // Mirror confirmed server state in memory only. Refresh/login always reloads DB.
    if (currentLearner) {
      const enrollmentKey = `${currentLearner.id}_${selectedCohort.id}`;
      setEnrollments((prev) => {
        const existing = prev[enrollmentKey] || {
          learnerId: currentLearner.id,
          classId: selectedCohort.id,
          completedLabIds: [],
          currentLabId: run.labId,
          enrolledAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString()
        };

        const updatedCompleted = existing.completedLabIds.includes(run.labId)
          ? existing.completedLabIds
          : [...existing.completedLabIds, run.labId];

        return {
          ...prev,
          [enrollmentKey]: {
            ...existing,
            completedLabIds: updatedCompleted,
            currentLabId: run.labId
          }
        };
      });
    }
  };

  // Ref ngăn concurrent duplicate session resolution & giữ user hiện tại
  const isResolvingRef = React.useRef<string | null>(null);
  const currentUserRef = React.useRef<typeof currentUser>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Phân giải User và gán đúng vai trò theo DB (P0.2 & P0.4)
  const resolveUserSession = async (
    email: string, 
    fullName?: string, 
    authProviderId?: string,
    isExplicitLogin = false
  ) => {
    if (isResolvingRef.current === email) return;
    isResolvingRef.current = email;

    const isSameUser = currentUserRef.current && currentUserRef.current.email === email;

    // Chỉ bật loading toàn màn hình khi chưa có user (lần đầu vào app hoặc đổi user)
    if (!currentUserRef.current || !isSameUser) {
      setIsAuthLoading(true);
    }

    try {
      // 1. Sync User vào Database
      const dbUser = await dbService.syncUserFromOAuth({
        email,
        full_name: fullName,
        auth_provider_id: authProviderId,
      });

      const resolvedName = dbUser.full_name || fullName || email.split('@')[0];
      const initials = resolvedName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'US';

      // 2. Quyền Instructor: DO DB QUYẾT ĐỊNH (public.users.role)
      if (dbUser.role === 'instructor' || dbUser.role === 'admin') {
        const instructorProfile = {
          id: dbUser.id,
          name: resolvedName,
          email: dbUser.email,
          role: 'Instructor',
          avatarInitials: initials
        };
        setCurrentUser(instructorProfile);
        setCurrentLearner(null);
        setUserRole('INSTRUCTOR');
        setHasActiveEnrollment(false);

        // Điều hướng: Giữ nguyên view nếu user đang làm việc (tab switch / token refresh),
        // hoặc khôi phục từ sessionStorage. Chỉ ép về 'dashboard' nếu là explicit login mới từ landing.
        setCurrentView(prevView => {
          if (!isExplicitLogin && isSameUser && prevView && prevView !== 'landing') {
            return prevView;
          }
          const saved = sessionStorage.getItem('promptify_current_view') as AppView;
          if (!isExplicitLogin && saved && saved !== 'landing') {
            return saved;
          }
          return 'dashboard';
        });
        return;
      }

      // 3. Quyền Learner: DO DB QUYẾT ĐỊNH (public.users.role)
      const activeViews = await dbService.getLearnerActiveEnrollments(dbUser.id);
      const savedClassId = sessionStorage.getItem('promptify_selected_class_id');
      let activeView: (typeof activeViews)[0] | undefined;
      if (reviewClassCode) {
        activeView = activeViews.find(
          (view) => view.classDetails.class_code === reviewClassCode || view.classDetails.id === reviewClassCode
        );
        if (savedClassId && (!activeView || activeView.classDetails.id !== savedClassId)) {
          sessionStorage.removeItem('promptify_selected_class_id');
          localStorage.removeItem('promptify_cohort');
        }
      } else {
        activeView = activeViews.find((view) => view.classDetails.id === savedClassId) || activeViews[0];
      }
      if (activeView) {
        const learnerData: Learner = {
          id: activeView.learner.learner_code,
          name: activeView.user.full_name || resolvedName,
          email: activeView.user.email,
          role: 'STUDENT',
          organization: '',
          department: '',
          avatarInitials: initials
        };
        setCurrentLearner(learnerData);
        setCurrentUser({
          id: dbUser.id,
          name: activeView.user.full_name || resolvedName,
          email: dbUser.email,
          role: 'Learner',
          avatarInitials: initials
        });
        setUserRole('LEARNER');
        setHasActiveEnrollment(true);
        setEnrolledClassIds(activeViews.map((view) => view.classDetails.id));

        // Chọn đúng Class Cohort từ DB Class Details
        const cohortData: ClassCohort = {
          id: activeView.classDetails.id,
          classCode: activeView.classDetails.class_code,
          name: activeView.classDetails.course?.title || activeView.classDetails.class_code,
          organization: activeView.classDetails.client?.name || '',
          industry: activeView.classDetails.client?.industry || '',
          department: activeView.classDetails.department,
          expiryDurationHours: 8,
          expiryDateText: reviewClassCode ? 'Access expires at 18:00 today' : 'Hết hạn lúc 18:00 hôm nay',
          description: activeView.classDetails.course?.description || 'Executive Prompt Engineering Curriculum.',
          iconName: activeView.classDetails.enrollment_mode === 'self_enroll' ? 'Sparkles' : 'Building2',
          isPublic: activeView.classDetails.enrollment_mode === 'self_enroll',
        };
        setSelectedCohort(cohortData);

        const progressByClass = await Promise.all(activeViews.map(async (view) => {
          const progressRows = await dbService.getLessonProgress(view.classDetails.id);
          const completedRows = progressRows.filter((row) => row.status === 'completed');
          return [
            `${view.learner.learner_code}_${view.classDetails.id}`,
            {
              learnerId: view.learner.learner_code,
              classId: view.classDetails.id,
              completedLabIds: completedRows.map((row) => row.lesson_id),
              currentLabId: progressRows[0]?.lesson_id || '',
              enrolledAt: view.enrollment.joined_at || new Date().toISOString(),
              expiresAt: view.classDetails.end_date || new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
            } satisfies Enrollment,
          ] as const;
        }));
        setEnrollments(Object.fromEntries(progressByClass));

        // Khôi phục view của học viên nếu đang trong bài học hoặc tab khác
        setCurrentView(prevView => {
          if (!isExplicitLogin && isSameUser && prevView && prevView !== 'landing') {
            return prevView;
          }
          const saved = sessionStorage.getItem('promptify_current_view') as AppView;
          if (!isExplicitLogin && saved && saved !== 'landing') {
            return saved;
          }
          return 'dashboard';
        });
      } else {
        const learnerWithoutEnrollment: Learner = {
          id: dbUser.id,
          name: resolvedName,
          email: dbUser.email,
          role: 'STUDENT',
          organization: '',
          department: '',
          avatarInitials: initials
        };
        setCurrentLearner(learnerWithoutEnrollment);
        setCurrentUser({
          id: dbUser.id,
          name: resolvedName,
          email: dbUser.email,
          role: 'Learner',
          avatarInitials: initials
        });
        setUserRole('LEARNER');
        setHasActiveEnrollment(false);
        setEnrolledClassIds([]);
        setCohorts([]);
        setEnrollments({});
        setCurrentView('class_select');
      }
    } catch (err) {
      console.error('Lỗi phân giải phiên đăng nhập:', err);
    } finally {
      setIsAuthLoading(false);
      isResolvingRef.current = null;
    }
  };

  // Ref ngăn chặn concurrent/re-entrant logout loops
  const isLoggingOutRef = React.useRef<boolean>(false);

  // Dọn dẹp toàn bộ dữ liệu session (Single Source of Truth)
  const clearSessionState = () => {
    setCurrentUser(null);
    setCurrentLearner(null);
    setUserRole(null);
    setHasActiveEnrollment(false);
    setEnrolledClassIds([]);
    setCohorts([]);
    setCurrentView('landing');
    setSelectedCohort(EMPTY_COHORT);
    setActiveLabId('lab-1');

    // LocalStorage
    localStorage.removeItem('promptify_learner');
    localStorage.removeItem('promptify_view');
    localStorage.removeItem('promptify_role');
    localStorage.removeItem('promptify_cohort');
    localStorage.removeItem('promptify_enrollments');

    // SessionStorage Navigation
    sessionStorage.removeItem('promptify_current_view');
    sessionStorage.removeItem('promptify_active_lab_id');
    sessionStorage.removeItem('promptify_lesson_mode');
    sessionStorage.removeItem('promptify_instructor_view');
    sessionStorage.removeItem('promptify_instructor_class_id');
    sessionStorage.removeItem('promptify_learner_table_class_id');
    sessionStorage.removeItem('promptify_selected_class_id');
  };

  // Xử lý Đăng xuất an toàn tuyệt đối
  const handleLogout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsAuthLoading(true);

    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Lỗi khi đăng xuất Supabase:', err);
    } finally {
      clearSessionState();
      setIsAuthLoading(false);
      isLoggingOutRef.current = false;
    }
  };

  // Lắng nghe phiên đăng nhập Supabase Google OAuth
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    // Safety timeout: không bao giờ để loading kéo dài quá 8 giây
    const authTimeout = setTimeout(() => {
      setIsAuthLoading(false);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(authTimeout);
      if (session?.user && session.user.email) {
        resolveUserSession(
          session.user.email,
          session.user.user_metadata?.full_name,
          session.user.id
        );
      } else {
        setIsAuthLoading(false);
      }
    }).catch(err => {
      console.error('Lỗi lấy phiên đăng nhập Supabase:', err);
      clearTimeout(authTimeout);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 1. TOKEN_REFRESHED: Làm mới token ngầm trong client, KHÔNG reset navigation, KHÔNG giật màn hình
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      // 2. SIGNED_IN: Chỉ xử lý nếu chưa có user hoặc user thực sự thay đổi
      if (event === 'SIGNED_IN') {
        if (isLoggingOutRef.current) return;
        
        // Nếu user này đã có currentUser trùng email, không làm gì cả (tránh reset khi browser tab focus)
        if (currentUserRef.current && session?.user?.email && currentUserRef.current.email === session.user.email) {
          return;
        }

        if (session?.user?.email) {
          resolveUserSession(
            session.user.email,
            session.user.user_metadata?.full_name,
            session.user.id,
            false
          );
        }
      } else if (event === 'SIGNED_OUT') {
        // KHÔNG gọi lại handleLogout() ở đây để tránh race condition / loop
        clearSessionState();
        setIsAuthLoading(false);
      }
    });

    return () => {
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Tải danh sách các lớp học động từ DB (chỉ khi học viên đã đăng nhập)
  useEffect(() => {
    if (!currentUser || userRole === 'INSTRUCTOR' || !currentLearner) return;

    let isMounted = true;
    const fetchClasses = async () => {
      try {
        const dbClasses = await dbService.getClassesWithDetails();
        const lessonCounts = await dbService.getPublishedLessonCounts(dbClasses.map((item) => item.course_id));
        if (isMounted) {
          const targetClasses = reviewClassCode
            ? dbClasses.filter(c => c.class_code === reviewClassCode || c.id === reviewClassCode)
            : dbClasses;

          const mappedCohorts: ClassCohort[] = targetClasses.map((c) => ({
              id: c.id,
              classCode: c.class_code,
              name: c.course?.title || c.class_code,
              organization: c.client?.name || '',
              industry: c.client?.industry || '',
              department: c.department,
              expiryDurationHours: 8,
              expiryDateText: reviewClassCode ? 'Access expires at 18:00 today' : 'Hết hạn lúc 18:00 hôm nay',
              description: c.course?.description || 'Executive Prompt Engineering Curriculum.',
              iconName: c.enrollment_mode === 'self_enroll' ? 'Sparkles' : 'Building2',
              isPublic: c.enrollment_mode === 'self_enroll',
              totalLessons: lessonCounts[c.course_id] || 0,
          }));
          setCohorts(mappedCohorts);
        }
      } catch (e) {
        if (isMounted) console.error('Lỗi nạp danh sách lớp:', e);
      }
    };
    fetchClasses();
    return () => { isMounted = false; };
  }, [currentUser, currentLearner, userRole]);

  // Mở hướng dẫn (nếu đang ở màn hình khác thì chuyển vào bài học trước để target highlight chuẩn xác)
  const handleOpenTutorial = () => {
    if (currentView !== 'lesson') {
      setCurrentView('lesson');
      setTimeout(() => {
        setIsTutorialOpen(true);
      }, 450);
    } else {
      setIsTutorialOpen(true);
    }
  };

  // Resolve từ DB trước khi mở để tutorial không flash sai sau reload/login.
  useEffect(() => {
    if (currentView !== 'lesson' || !currentUser?.id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    dbService.hasCompletedTutorial(currentUser.id, 'lesson_workspace')
      .then((completed) => {
        if (!cancelled && !completed) {
          timer = setTimeout(() => setIsTutorialOpen(true), 500);
        }
      })
      .catch((error) => console.warn('[Tutorial] Không thể resolve trạng thái:', error));
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentView, currentUser?.id]);

  const handleTutorialClose = () => {
    setIsTutorialOpen(false);
    if (currentUser?.id) {
      void dbService.completeTutorial(currentUser.id, 'lesson_workspace')
        .catch((error) => console.warn('[Tutorial] Không thể lưu trạng thái:', error));
    }
  };

  // Xử lý Chọn lớp
  const handleSelectClass = async (cohort: ClassCohort): Promise<boolean> => {
    if (!currentUser || userRole !== 'LEARNER') return false;
    let learnerCode = currentLearner?.id || '';
    let canAccess = await dbService.canUserAccessClass(currentUser.id, cohort.id);
    if (!canAccess && cohort.isPublic) {
      const selfEnrollment = await dbService.selfEnrollInPublicClass(cohort.id);
      if (selfEnrollment) {
        canAccess = true;
        learnerCode = selfEnrollment.learnerCode;
        setEnrolledClassIds((ids) => ids.includes(cohort.id) ? ids : [...ids, cohort.id]);
        setCurrentLearner((learner) => learner ? {
          ...learner,
          id: selfEnrollment.learnerCode,
        } : learner);
      }
    }
    if (!canAccess) {
      setHasActiveEnrollment(false);
      setCurrentView('class_select');
      return false;
    }
    setHasActiveEnrollment(true);
    setEnrolledClassIds((ids) => ids.includes(cohort.id) ? ids : [...ids, cohort.id]);
    setSelectedCohort(cohort);
    const progressRows = await dbService.getLessonProgress(cohort.id);
    setEnrollments((previous) => ({
      ...previous,
      [`${learnerCode}_${cohort.id}`]: {
        learnerId: learnerCode,
        classId: cohort.id,
        completedLabIds: progressRows.filter((row) => row.status === 'completed').map((row) => row.lesson_id),
        currentLabId: progressRows[0]?.lesson_id || '',
        enrolledAt: previous[`${learnerCode}_${cohort.id}`]?.enrolledAt || new Date().toISOString(),
        expiresAt: previous[`${learnerCode}_${cohort.id}`]?.expiresAt || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      },
    }));
    const classUrl = new URL(window.location.href);
    classUrl.searchParams.delete('lesson');
    window.history.replaceState({}, '', classUrl.toString());
    setCurrentView('dashboard');
    return true;
  };

  // Bắt đầu một bài học từ Dashboard hoặc Lộ trình
  const handleStartLesson = (labId: string) => {
    if (!hasActiveEnrollment) {
      setCurrentView('class_select');
      return;
    }
    setActiveLabId(labId);
    window.history.pushState({}, '', buildLessonUrl(window.location.href, labId));
    const lab = labs.find((l) => l.id === labId);
    if (lab) {
      setActiveLab(lab);
      setActivePrompt(lab.baselinePrompt);
    }
    setCurrentView('lesson');
  };

  // Sử dụng Prompt từ Thư viện vào Bài thực hành
  const handleOpenInPlayground = (promptText: string) => {
    if (!hasActiveEnrollment) {
      setCurrentView('class_select');
      return;
    }
    setActivePrompt(promptText);
    setCurrentView('lesson');
  };

  // Lấy enrollment hiện tại của learner (với null-check an toàn)
  const currentEnrollmentKey = currentLearner && selectedCohort ? `${currentLearner.id}_${selectedCohort.id}` : '';
  const currentEnrollment: Enrollment = (currentEnrollmentKey && enrollments[currentEnrollmentKey]) || {
    learnerId: currentLearner?.id || '',
    classId: selectedCohort?.id || '',
    completedLabIds: [],
    currentLabId: labs[0]?.id || '',
    enrolledAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString()
  };
  const selectableCohorts = (reviewClassCode
    ? cohorts.filter((cohort) => cohort.classCode === reviewClassCode || cohort.id === reviewClassCode)
    : cohorts
  ).filter((cohort) => (
    cohort.isPublic || enrolledClassIds.includes(cohort.id) || (hasActiveEnrollment && cohort.id === selectedCohort.id)
  ));

  // Enforce review cohort when VITE_REVIEW_CLASS_CODE is set: reset any stale Vietnamese or other class
  useEffect(() => {
    if (reviewClassCode && cohorts.length > 0) {
      const reviewCohort = cohorts.find((c) => c.classCode === reviewClassCode || c.id === reviewClassCode);
      if (reviewCohort && selectedCohort.id && selectedCohort.id !== reviewCohort.id && selectedCohort.classCode !== reviewCohort.classCode) {
        setSelectedCohort(reviewCohort);
        sessionStorage.setItem('promptify_selected_class_id', reviewCohort.id);
        localStorage.setItem('promptify_cohort', JSON.stringify(reviewCohort));
      }
    }
  }, [cohorts, selectedCohort.id, selectedCohort.classCode]);

  const handleProductNavigate = (view: AppView) => {
    if (view === 'dashboard') {
      const homeUrl = new URL(window.location.href);
      homeUrl.searchParams.delete('lesson');
      window.history.replaceState({}, '', homeUrl.toString());
    }
    setCurrentView(view);
  };

  // Loading Screen khi đang kiểm tra auth session hoặc đang đăng xuất
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium">
          {isLoggingOutRef.current ? 'Signing out securely...' : 'Authenticating and loading data from server...'}
        </p>
      </div>
    );
  }

  // 1. Màn hình Landing & Login (khi chưa có currentUser HOẶC view === 'landing')
  if (!currentUser || currentView === 'landing') {
    return (
      <LandingLoginScreen />
    );
  }

  // 2. Màn hình Dành riêng cho Giảng viên / Quản lý lớp (Instructor View)
  if (userRole === 'INSTRUCTOR') {
    return (
      <InstructorViewShell
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // Learner chưa được instructor ghi danh không thể khôi phục route cũ từ
  // sessionStorage để vào dashboard/lesson/playground.
  if (userRole === 'LEARNER' && !hasActiveEnrollment) {
    return (
      <ClassSelectionScreen
        learner={currentLearner}
        cohorts={selectableCohorts}
        enrollments={{}}
        totalLabCount={labs.length}
        onSelectClass={handleSelectClass}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Màn hình Chọn lớp / Tham gia lớp (sau khi đăng nhập)
  if (currentView === 'class_select') {
    if (!currentLearner) {
      return (
          <LandingLoginScreen />
      );
    }
    return (
      <ClassSelectionScreen
        learner={currentLearner}
        cohorts={selectableCohorts}
        enrollments={enrollments}
        totalLabCount={labs.length}
        onSelectClass={handleSelectClass}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Không gian chính của học viên (Product Shell)
  if (!currentLearner) {
    return (
      <LandingLoginScreen />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Product Top Navbar */}
      <ProductNavbar
        currentView={currentView}
        onNavigate={handleProductNavigate}
        selectedCohort={selectedCohort}
        availableCohorts={selectableCohorts}
        onSelectClass={async (cohort) => {
          const selected = await handleSelectClass(cohort);
          if (selected) setCurrentView('learning_path');
          return selected;
        }}
        onChangeClass={() => setCurrentView('class_select')}
        learner={currentLearner}
        onLogout={handleLogout}
      />

      {/* Main Content Area based on currentView */}
      <main className="flex-1">
        {curriculumError && (
          <div className="max-w-4xl mx-auto my-8 p-6 bg-red-50 border border-red-200 rounded-xl text-red-900 shadow-sm">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-base">!</span>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-red-900">Database Curriculum Required</h3>
                <p className="mt-1 text-sm text-red-700 leading-relaxed">{curriculumError}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold tracking-wide transition shadow-sm"
                  >
                    Retry Loading
                  </button>
                  <button
                    onClick={() => setCurrentView('class_select')}
                    className="px-4 py-2 bg-white border border-red-300 text-red-800 rounded-lg text-xs font-semibold hover:bg-red-50 transition"
                  >
                    Select Another Class
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {!curriculumError && !curriculumReadyKey && (
          <div className="max-w-4xl mx-auto my-16 flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">Loading course curriculum from Supabase...</p>
          </div>
        )}
        {/* VIEW 1: LEARNER DASHBOARD (Trang chủ chính) */}
        {currentView === 'dashboard' && (
          <LearnerHome
            learner={currentLearner}
            cohorts={selectableCohorts}
            selectedCohort={selectedCohort}
            enrollments={enrollments}
            totalLabCount={labs.length}
            onChooseClass={async (cohort) => {
              const selected = await handleSelectClass(cohort);
              if (selected) setCurrentView('learning_path');
            }}
          />
        )}

        {currentView === 'learning_path' && (
          <LearnerDashboard
            cohort={selectedCohort}
            enrollment={currentEnrollment}
            labs={labs}
            onStartLesson={handleStartLesson}
            onNavigate={setCurrentView}
            onOpenTutorial={handleOpenTutorial}
          />
        )}

        {/* VIEW 2: LESSON WORKSPACE (Không gian học tương tác Song song) */}
        {currentView === 'lesson' && (
          <div className="flex flex-col">
            {/* Breadcrumb & Workspace Header Bar */}
            <LessonHeaderBar
              cohort={selectedCohort}
              activeLab={activeLab}
              currentMode="hybrid"
              onSelectMode={() => {}}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onOpenTutorial={() => setIsTutorialOpen(true)}
              onOpenPromptLibrary={() => setIsPromptLibraryModalOpen(true)}
              onOpenHistory={() => setCurrentView('history')}
              apiConfig={apiConfig}
              onOpenApiModal={() => setIsApiModalOpen(true)}
            />

            {/* Chốt chỉ dùng giao diện Song song (HybridView) */}
            <HybridView
              labs={labs}
              apiConfig={apiConfig}
              onRecordRun={handleRecordRun}
              onOpenCompare={(lab) => setActiveCompareLab(lab)}
              onActiveContextChange={handleActiveContextChange}
              onOpenTutorial={() => setIsTutorialOpen(true)}
              initialLabId={activeLabId}
              onSelectLab={(labId) => {
                setActiveLabId(labId);
                window.history.pushState({}, '', buildLessonUrl(window.location.href, labId));
              }}
              currentLearnerId={currentLearner?.id || currentUser?.id}
              currentClassId={selectedCohort?.id}
              onOpenApiModal={() => setIsApiModalOpen(true)}
            />
          </div>
        )}

        {/* VIEW 4: PROMPT LIBRARY (Toàn trang) */}
        {currentView === 'library' && (
          <PromptLibraryView
            cohort={selectedCohort}
            onOpenInPlayground={handleOpenInPlayground}
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        )}

        {/* VIEW 5: PROMPT HISTORY (Toàn trang) */}
        {currentView === 'history' && (
          <PromptHistoryView
            cohort={selectedCohort}
            history={history}
            onClearHistory={() => setHistory([])}
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-bold text-slate-700">
              Promptify • Executive AI & Prompt Engineering Training
            </p>
            <p className="text-slate-600">
              Course: {selectedCohort.name}
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <span className="text-emerald-700 font-medium">Server AI Engine (Active)</span>
            <span>•</span>
            <button
              onClick={() => setCurrentView('history')}
              className="text-indigo-600 font-medium hover:underline cursor-pointer"
            >
              Practice History ({history.length})
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Telemetry */}
      <ApiKeyModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        config={apiConfig}
        onSaveConfig={setApiConfig}
      />

      <DiffCompareModal
        isOpen={activeCompareLab !== null}
        onClose={() => setActiveCompareLab(null)}
        lab={activeCompareLab || activeLab || EMPTY_LAB}
      />

      <PromptLibraryModal
        isOpen={isPromptLibraryModalOpen}
        onClose={() => setIsPromptLibraryModalOpen(false)}
        onApplyPrompt={(text) => {
          setActivePrompt(text);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Bé Trợ Lý AI Cute Đồng Hành (Chỉ hiển thị trong khu vực học bài) */}
      {currentView === 'lesson' && (
        <AiCoach
          currentMode="hybrid"
          activeLab={activeLab}
          currentPrompt={activePrompt}
          runCount={activeRunCount}
          onOpenTutorial={() => setIsTutorialOpen(true)}
        />
      )}

      {/* Guided Visual Walkthrough */}
      <GuidedWalkthrough
        isOpen={isTutorialOpen}
        onClose={handleTutorialClose}
        currentMode="hybrid"
        activeLab={activeLab}
      />
    </div>
  );
};

export default App;
