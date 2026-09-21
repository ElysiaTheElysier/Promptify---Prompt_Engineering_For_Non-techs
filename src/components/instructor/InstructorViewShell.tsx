import React, { useState } from 'react';
import { InstructorClass, InstructorViewMode } from '../../types/instructor';
import { INSTRUCTOR_CLASSES } from '../../data/instructorData';
import { InstructorNavbar } from './InstructorNavbar';
import { InstructorDashboard } from './InstructorDashboard';
import { ClassDetailView } from './ClassDetailView';
import { LearnerTableView } from './LearnerTableView';
import { ActivityStreamView } from './ActivityStreamView';
import { Building2, ArrowRight } from 'lucide-react';

interface Props {
  onSwitchToLearner: () => void;
  onLogout: () => void;
}

export const InstructorViewShell: React.FC<Props> = ({ onSwitchToLearner, onLogout }) => {
  const [currentView, setCurrentView] = useState<InstructorViewMode>('dashboard');
  const [selectedClass, setSelectedClass] = useState<InstructorClass | null>(INSTRUCTOR_CLASSES[0]);

  const handleSelectClass = (cls: InstructorClass) => {
    setSelectedClass(cls);
    setCurrentView('class_detail');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar for Instructor */}
      <InstructorNavbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onSwitchToLearner={onSwitchToLearner}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* VIEW 1: DASHBOARD OVERVIEW */}
        {currentView === 'dashboard' && (
          <InstructorDashboard
            onSelectClass={handleSelectClass}
            onNavigate={setCurrentView}
          />
        )}

        {/* VIEW 2: CLASSES LIST */}
        {currentView === 'classes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Danh sách Lớp học Đang phụ trách
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Chọn một lớp để theo dõi tiến độ chi tiết từng học viên và các bài lab
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {INSTRUCTOR_CLASSES.map((cls) => (
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
                        Đang diễn ra
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {cls.organization} • {cls.department}
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
        {currentView === 'class_detail' && selectedClass && (
          <ClassDetailView
            cohortClass={selectedClass}
            onBack={() => setCurrentView('classes')}
          />
        )}

        {/* VIEW 4: LEARNERS TABLE (ALL CLASSES) */}
        {currentView === 'learners' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Quản lý & Theo dõi Toàn bộ Học viên
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Tìm kiếm, lọc trạng thái và bấm vào từng học viên để xem chi tiết câu lệnh prompt đã chạy
              </p>
            </div>
            <LearnerTableView showClassFilter={true} />
          </div>
        )}

        {/* VIEW 5: ACTIVITY STREAM */}
        {currentView === 'activity' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Nhật ký Hoạt động Thời gian thực
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Dòng hoạt động trực tiếp của học viên trong toàn bộ các lớp đào tạo
              </p>
            </div>
            <ActivityStreamView />
          </div>
        )}
      </main>

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
          <button
            onClick={onSwitchToLearner}
            className="text-emerald-700 font-semibold hover:underline cursor-pointer"
          >
            Chuyển về Giao diện Học viên →
          </button>
        </div>
      </footer>
    </div>
  );
};
