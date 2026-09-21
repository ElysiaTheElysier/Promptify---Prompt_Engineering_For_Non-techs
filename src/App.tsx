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
import { CLASS_COHORTS, DEMO_LEARNERS, DEFAULT_ENROLLMENTS } from './data/classesData';
import { LABS_DATA } from './data/labsData';
import { LandingLoginScreen } from './components/auth/LandingLoginScreen';
import { ClassSelectionScreen } from './components/classes/ClassSelectionScreen';
import { ProductNavbar } from './components/navigation/ProductNavbar';
import { LearnerDashboard } from './components/dashboard/LearnerDashboard';
import { LessonHeaderBar } from './components/lesson/LessonHeaderBar';
import { PromptLibraryView } from './components/library/PromptLibraryView';
import { PromptHistoryView } from './components/history/PromptHistoryView';
import { ExpirationBanner } from './components/common/ExpirationBanner';
import { ApiKeyModal } from './components/common/ApiKeyModal';
import { DiffCompareModal } from './components/common/DiffCompareModal';
import { NotebookView } from './components/notebook/NotebookView';
import { PlaygroundView } from './components/playground/PlaygroundView';
import { HybridView } from './components/hybrid/HybridView';
import { AiCoach } from './components/common/AiCoach';
import { GuidedWalkthrough } from './components/common/GuidedWalkthrough';
import { PromptLibraryModal } from './components/common/PromptLibraryModal';

export const App: React.FC = () => {
  // 1. Quản lý Đăng nhập & Học viên
  const [currentLearner, setCurrentLearner] = useState<Learner | null>(() => {
    const saved = localStorage.getItem('promptify_learner');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return null; // Chưa đăng nhập mặc định để hiển thị Landing Screen
  });

  // 2. Quản lý Màn hình ứng dụng (App View)
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = localStorage.getItem('promptify_view') as AppView;
    if (saved && saved !== 'landing') return saved;
    return 'landing';
  });

  // 3. Quản lý Lớp học được chọn
  const [selectedCohort, setSelectedCohort] = useState<ClassCohort>(() => {
    const saved = localStorage.getItem('promptify_cohort');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const found = CLASS_COHORTS.find((c) => c.id === parsed.id);
        if (found) return found;
      } catch {
        // fallback
      }
    }
    return CLASS_COHORTS[0];
  });

  // 4. Danh sách các lớp học hiện có
  const [cohorts, setCohorts] = useState<ClassCohort[]>(CLASS_COHORTS);

  // 5. Quản lý Tiến độ ghi danh (Enrollments)
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>(() => {
    const saved = localStorage.getItem('promptify_enrollments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_ENROLLMENTS;
  });

  // 6. Chế độ giao diện trong bài học (Hybrid song song hoặc Notebook tuần tự)
  const [preferredLessonMode, setPreferredLessonMode] = useState<UIMode>('hybrid');

  // 7. Bài lab hiện tại đang học
  const [activeLabId, setActiveLabId] = useState<string>('lab-1');

  // 8. Prompt đang được nạp vào Playground (khi chuyển từ Prompt Library sang)
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>('');

  // 9. Cấu hình AI API
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('promptify_api_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      mode: 'simulated',
      geminiApiKey: '',
      model: 'gemini-1.5-flash',
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
  const [activeLab, setActiveLab] = useState<LabStep>(LABS_DATA[0]);
  const [activePrompt, setActivePrompt] = useState<string>(LABS_DATA[0].baselinePrompt);
  const [activeRunCount, setActiveRunCount] = useState<number>(0);

  // Sync activeLab when activeLabId changes
  useEffect(() => {
    const found = LABS_DATA.find((l) => l.id === activeLabId);
    if (found) {
      setActiveLab(found);
      setActivePrompt(found.baselinePrompt);
    }
  }, [activeLabId]);

  // Persist storage
  useEffect(() => {
    if (currentLearner) {
      localStorage.setItem('promptify_learner', JSON.stringify(currentLearner));
    } else {
      localStorage.removeItem('promptify_learner');
    }
  }, [currentLearner]);

  useEffect(() => {
    localStorage.setItem('promptify_view', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('promptify_cohort', JSON.stringify(selectedCohort));
  }, [selectedCohort]);

  useEffect(() => {
    localStorage.setItem('promptify_enrollments', JSON.stringify(enrollments));
  }, [enrollments]);

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

  // Record Run & Update Enrollment Progress
  const handleRecordRun = (run: PromptRun) => {
    setHistory((prev) => [run, ...prev]);
    const lab = LABS_DATA.find((l) => l.id === run.labId);
    if (lab) setActiveLab(lab);
    setActivePrompt(run.promptText);
    setActiveRunCount((prev) => prev + 1);

    // Cập nhật tiến độ học của learner cho lab này
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

  // Xử lý Đăng nhập
  const handleLogin = (learner: Learner) => {
    setCurrentLearner(learner);
    // Sau login, đưa user tới màn chọn lớp để xác nhận lớp học
    setCurrentView('class_select');
  };

  // Xử lý Đăng xuất
  const handleLogout = () => {
    setCurrentLearner(null);
    setCurrentView('landing');
  };

  // Xử lý Reset toàn bộ luồng về Landing Page ban đầu (Xóa toàn bộ session & cờ đã xem tutorial)
  const handleResetAll = () => {
    // 1. Xóa toàn bộ dữ liệu localStorage
    localStorage.removeItem('promptify_learner');
    localStorage.removeItem('promptify_view');
    localStorage.removeItem('promptify_tutorial_completed');
    localStorage.removeItem('promptify_cohort');
    localStorage.removeItem('promptify_enrollments');
    localStorage.removeItem('promptify_history');

    // 2. Reset toàn bộ React state
    setCurrentLearner(null);
    setCurrentView('landing');
    setSelectedCohort(CLASS_COHORTS[0]);
    setEnrollments(DEFAULT_ENROLLMENTS);
    setActiveLabId('lab-1');
    setActiveLab(LABS_DATA[0]);
    setActivePrompt(LABS_DATA[0].baselinePrompt);
    setActiveRunCount(0);
    setHistory([]);
    setIsTutorialOpen(false);
  };

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

  // Tự động kích hoạt tutorial khi vào bài học lần đầu tiên (hoặc sau khi reset)
  useEffect(() => {
    if (currentView === 'lesson') {
      const isCompleted = localStorage.getItem('promptify_tutorial_completed') === 'true';
      if (!isCompleted) {
        const timer = setTimeout(() => {
          setIsTutorialOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentView]);

  // Xử lý Chọn lớp
  const handleSelectClass = (cohort: ClassCohort) => {
    setSelectedCohort(cohort);
    // Khởi tạo enrollment nếu chưa có
    if (currentLearner) {
      const enrollmentKey = `${currentLearner.id}_${cohort.id}`;
      if (!enrollments[enrollmentKey]) {
        setEnrollments((prev) => ({
          ...prev,
          [enrollmentKey]: {
            learnerId: currentLearner.id,
            classId: cohort.id,
            completedLabIds: [],
            currentLabId: 'lab-1',
            enrolledAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + cohort.expiryDurationHours * 3600 * 1000).toISOString()
          }
        }));
      }
    }
    setCurrentView('dashboard');
  };

  // Xử lý Tham gia lớp mới bằng Mã
  const handleJoinClassByCode = (code: string): boolean => {
    const upperCode = code.toUpperCase().trim();
    const found = cohorts.find(
      (c) => c.id.toUpperCase() === upperCode || c.classCode.toUpperCase() === upperCode
    );

    if (found) {
      handleSelectClass(found);
      return true;
    }
    return false;
  };

  // Bắt đầu một bài học từ Dashboard hoặc Lộ trình
  const handleStartLesson = (labId: string) => {
    setActiveLabId(labId);
    const lab = LABS_DATA.find((l) => l.id === labId);
    if (lab) {
      setActiveLab(lab);
      setActivePrompt(lab.baselinePrompt);
    }
    setCurrentView('lesson');
    // Nếu chưa hoàn thành tutorial, bật sau 500ms
    const isCompleted = localStorage.getItem('promptify_tutorial_completed') === 'true';
    if (!isCompleted) {
      setTimeout(() => {
        setIsTutorialOpen(true);
      }, 500);
    }
  };

  // Mở Prompt trong Playground từ Thư viện
  const handleOpenInPlayground = (promptText: string) => {
    setPlaygroundPrompt(promptText);
    setCurrentView('playground');
  };

  // Lấy enrollment hiện tại của learner
  const currentEnrollmentKey = currentLearner ? `${currentLearner.id}_${selectedCohort.id}` : '';
  const currentEnrollment: Enrollment = (currentEnrollmentKey && enrollments[currentEnrollmentKey]) || {
    learnerId: currentLearner?.id || 'demo',
    classId: selectedCohort.id,
    completedLabIds: ['lab-1', 'lab-2'],
    currentLabId: 'lab-3',
    enrolledAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString()
  };

  // 1. Màn hình Landing & Login (khi chưa đăng nhập hoặc view === 'landing')
  if (!currentLearner || currentView === 'landing') {
    return <LandingLoginScreen onLogin={handleLogin} />;
  }

  // 2. Màn hình Chọn lớp / Tham gia lớp (sau khi đăng nhập)
  if (currentView === 'class_select') {
    return (
      <ClassSelectionScreen
        learner={currentLearner}
        cohorts={cohorts}
        enrollments={enrollments}
        onSelectClass={handleSelectClass}
        onJoinClassByCode={handleJoinClassByCode}
        onLogout={handleLogout}
        onResetAll={handleResetAll}
      />
    );
  }

  // 3. Không gian chính của học viên (Product Shell)
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Product Top Navbar */}
      <ProductNavbar
        currentView={currentView}
        onNavigate={setCurrentView}
        selectedCohort={selectedCohort}
        onChangeClass={() => setCurrentView('class_select')}
        learner={currentLearner}
        onLogout={handleLogout}
        onOpenTutorial={handleOpenTutorial}
        onResetAll={handleResetAll}
      />

      {/* Main Content Area based on currentView */}
      <main className="flex-1">
        {/* VIEW 1: LEARNER DASHBOARD (Trang chủ chính) */}
        {(currentView === 'dashboard' || currentView === 'learning_path') && (
          <>
            <ExpirationBanner cohort={selectedCohort} />
            <LearnerDashboard
              learner={currentLearner}
              cohort={selectedCohort}
              enrollment={currentEnrollment}
              labs={LABS_DATA}
              onStartLesson={handleStartLesson}
              onNavigate={setCurrentView}
              onOpenTutorial={handleOpenTutorial}
            />
          </>
        )}

        {/* VIEW 2: LESSON WORKSPACE (Không gian học tương tác Notebook / Hybrid) */}
        {currentView === 'lesson' && (
          <div className="flex flex-col">
            <ExpirationBanner cohort={selectedCohort} />
            
            {/* Breadcrumb & Workspace Header Bar */}
            <LessonHeaderBar
              cohort={selectedCohort}
              activeLab={activeLab}
              currentMode={preferredLessonMode}
              onSelectMode={setPreferredLessonMode}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onOpenTutorial={() => setIsTutorialOpen(true)}
              onOpenPromptLibrary={() => setIsPromptLibraryModalOpen(true)}
              onOpenHistory={() => setCurrentView('history')}
              apiConfig={apiConfig}
              onOpenApiModal={() => setIsApiModalOpen(true)}
            />

            {/* Render selected UI mode for lesson */}
            {preferredLessonMode === 'hybrid' ? (
              <HybridView
                labs={LABS_DATA}
                apiConfig={apiConfig}
                onRecordRun={handleRecordRun}
                onOpenCompare={(lab) => setActiveCompareLab(lab)}
                onActiveContextChange={handleActiveContextChange}
                onOpenTutorial={() => setIsTutorialOpen(true)}
                initialLabId={activeLabId}
              />
            ) : (
              <NotebookView
                labs={LABS_DATA}
                apiConfig={apiConfig}
                onRecordRun={handleRecordRun}
                onOpenCompare={(lab) => setActiveCompareLab(lab)}
                onActiveContextChange={handleActiveContextChange}
                onOpenTutorial={() => setIsTutorialOpen(true)}
                initialLabId={activeLabId}
              />
            )}
          </div>
        )}

        {/* VIEW 3: FREE PLAYGROUND */}
        {currentView === 'playground' && (
          <div className="flex flex-col">
            <ExpirationBanner cohort={selectedCohort} />
            <PlaygroundView
              labs={LABS_DATA}
              apiConfig={apiConfig}
              onRecordRun={handleRecordRun}
              onOpenCompare={(lab) => setActiveCompareLab(lab)}
              onActiveContextChange={handleActiveContextChange}
              onOpenTutorial={() => setIsTutorialOpen(true)}
              initialPrompt={playgroundPrompt}
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
              Promptify • Hệ thống Đào tạo & Thực hành Prompt Engineering Chuẩn Doanh nghiệp
            </p>
            <p className="text-slate-600">
              {selectedCohort.organization} • {selectedCohort.department} • Khóa học: {selectedCohort.name} ({selectedCohort.classCode})
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <button
              onClick={() => setIsApiModalOpen(true)}
              className="text-emerald-700 font-medium hover:underline cursor-pointer"
            >
              Cấu hình AI ({apiConfig.mode === 'simulated' ? 'Mô phỏng' : 'Gemini API'})
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentView('history')}
              className="text-indigo-600 font-medium hover:underline cursor-pointer"
            >
              Nhật ký thực hành ({history.length})
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
        lab={activeCompareLab || LABS_DATA[0]}
      />

      <PromptLibraryModal
        isOpen={isPromptLibraryModalOpen}
        onClose={() => setIsPromptLibraryModalOpen(false)}
        onApplyPrompt={(text) => {
          setActivePrompt(text);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Bé Trợ Lý AI Cute Đồng Hành (Chỉ hiển thị trong khu vực học & Playground) */}
      {(currentView === 'lesson' || currentView === 'playground') && (
        <AiCoach
          currentMode={currentView === 'playground' ? 'playground' : preferredLessonMode}
          activeLab={activeLab}
          currentPrompt={activePrompt}
          runCount={activeRunCount}
          onOpenTutorial={() => setIsTutorialOpen(true)}
        />
      )}

      {/* Guided Visual Walkthrough */}
      <GuidedWalkthrough
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        currentMode={currentView === 'playground' ? 'playground' : preferredLessonMode}
        activeLab={activeLab}
      />
    </div>
  );
};

export default App;
