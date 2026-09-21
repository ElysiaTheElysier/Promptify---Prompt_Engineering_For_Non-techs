import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  Users,
  Sparkles,
  Zap,
  ArrowUpDown,
  HelpCircle
} from 'lucide-react';
import { InstructorLearner } from '../../types/instructor';
import { INSTRUCTOR_LEARNERS, INSTRUCTOR_CLASSES } from '../../data/instructorData';
import { LearnerDetailModal } from './LearnerDetailModal';

interface Props {
  initialClassId?: string;
  onSelectLearner?: (learner: InstructorLearner) => void;
  showClassFilter?: boolean;
  onOpenTutorial?: () => void;
}

export const LearnerTableView: React.FC<Props> = ({ 
  initialClassId,
  showClassFilter = true,
  onOpenTutorial
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'not_started' | 'in_progress' | 'completed'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLearner, setSelectedLearner] = useState<InstructorLearner | null>(null);

  // Filter learners
  const filteredLearners = useMemo(() => {
    return INSTRUCTOR_LEARNERS.filter((learner) => {
      // Filter by class
      if (selectedClassId !== 'ALL' && learner.classId !== selectedClassId) {
        return false;
      }
      // Filter by status
      if (statusFilter !== 'ALL' && learner.status !== statusFilter) {
        return false;
      }
      // Filter by search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = learner.name.toLowerCase().includes(query);
        const matchesEmail = learner.email.toLowerCase().includes(query);
        const matchesCode = learner.employeeCode.toLowerCase().includes(query);
        const matchesDept = learner.department.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesCode && !matchesDept) {
          return false;
        }
      }
      return true;
    });
  }, [selectedClassId, statusFilter, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    const list = selectedClassId === 'ALL' 
      ? INSTRUCTOR_LEARNERS 
      : INSTRUCTOR_LEARNERS.filter(l => l.classId === selectedClassId);
    return {
      all: list.length,
      not_started: list.filter(l => l.status === 'not_started').length,
      in_progress: list.filter(l => l.status === 'in_progress').length,
      completed: list.filter(l => l.status === 'completed').length,
    };
  }, [selectedClassId]);

  const getStatusBadge = (status: InstructorLearner['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Hoàn thành
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3 h-3 text-indigo-600" />
            Đang học
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Chưa bắt đầu
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Status Filters & Class Dropdown */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div data-tour="learners-search-filter" className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo họ tên, email, mã nhân viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Class filter dropdown & Tutorial button */}
          <div className="flex items-center gap-2">
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition cursor-pointer"
                title="Xem lại hướng dẫn quản lý học viên"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xem lại hướng dẫn</span>
              </button>
            )}

            {showClassFilter && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Lớp đào tạo:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả lớp học ({INSTRUCTOR_LEARNERS.length} học viên mẫu)</option>
                  {INSTRUCTOR_CLASSES.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.totalLearners} học viên)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Status filter tabs */}
        <div data-tour="learners-status-tabs" className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả ({counts.all})
          </button>

          <button
            onClick={() => setStatusFilter('not_started')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'not_started'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Chưa bắt đầu ({counts.not_started})
          </button>

          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'in_progress'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            Đang học ({counts.in_progress})
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Hoàn thành ({counts.completed})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div data-tour="learners-table-rows" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Học viên</th>
                <th className="py-3.5 px-4">Lớp & Phòng ban</th>
                <th className="py-3.5 px-4 text-center">Tiến độ bài học</th>
                <th className="py-3.5 px-4 text-center">Số lần thử</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4">Hoạt động gần nhất</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Không tìm thấy học viên nào phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Hãy thử đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái</p>
                  </td>
                </tr>
              ) : (
                filteredLearners.map((learner) => {
                  const progressPercent = Math.round((learner.completedLabIds.length / 5) * 100);

                  return (
                    <tr
                      key={learner.id}
                      onClick={() => setSelectedLearner(learner)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      {/* Learner Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                            {learner.avatarInitials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                              {learner.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {learner.email} • <span className="font-mono text-slate-400">{learner.employeeCode}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 line-clamp-1 max-w-[200px]" title={learner.className}>
                          {learner.className}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {learner.department}
                        </div>
                      </td>

                      {/* Progress bar */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[140px] mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700">{learner.completedLabIds.length}/5 bài</span>
                            <span className="text-slate-500 font-medium">{progressPercent}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                progressPercent === 100 
                                  ? 'bg-emerald-500' 
                                  : progressPercent > 0 
                                  ? 'bg-indigo-500' 
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Prompt Attempts count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs ${
                          learner.promptAttemptsTotal > 10 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : learner.promptAttemptsTotal > 0 
                            ? 'bg-slate-100 text-slate-700' 
                            : 'bg-slate-50 text-slate-400'
                        }`}>
                          <Zap className="w-3 h-3" />
                          {learner.promptAttemptsTotal}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(learner.status)}
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {learner.lastActive}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLearner(learner);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium text-xs transition cursor-pointer"
                        >
                          <span>Chi tiết</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Hiển thị <strong>{filteredLearners.length}</strong> học viên</span>
          <span className="text-[11px]">Bấm vào từng học viên để xem chi tiết 5 bài lab và mẫu prompt</span>
        </div>
      </div>

      {/* Modal */}
      <LearnerDetailModal
        learner={selectedLearner}
        onClose={() => setSelectedLearner(null)}
      />
    </div>
  );
};

