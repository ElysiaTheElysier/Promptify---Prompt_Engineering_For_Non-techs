import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { InstructorLearner } from '../../types/instructor';
import { INSTRUCTOR_LEARNERS, INSTRUCTOR_CLASSES } from '../../data/instructorData';
import { LearnerDetailModal } from './LearnerDetailModal';

interface Props {
  initialClassId?: string;
  onSelectLearner?: (learner: InstructorLearner) => void;
  showClassFilter?: boolean;
}

export const LearnerTableView: React.FC<Props> = ({ 
  initialClassId,
  showClassFilter = true 
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

  // Clean status indicator (GitHub style: dot + plain text)
  const renderStatus = (status: InstructorLearner['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Hoàn thành
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Đang học
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-800 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Chưa bắt đầu
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* GitHub-style Controls Bar: Search & Status Filter Tabs */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Lọc theo tên, email, mã nhân viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          {/* Class selector dropdown */}
          {showClassFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">Tất cả lớp ({INSTRUCTOR_LEARNERS.length} học viên)</option>
                {INSTRUCTOR_CLASSES.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.totalLearners})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* GitHub-style subnav filter tabs */}
        <div className="flex items-center gap-4 text-xs border-b border-slate-200">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`pb-2 transition cursor-pointer font-medium ${
              statusFilter === 'ALL'
                ? 'border-b-2 border-slate-900 text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả <span className="text-slate-400 text-[11px] ml-1">({counts.all})</span>
          </button>

          <button
            onClick={() => setStatusFilter('not_started')}
            className={`pb-2 transition cursor-pointer font-medium ${
              statusFilter === 'not_started'
                ? 'border-b-2 border-slate-900 text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Chưa bắt đầu <span className="text-slate-400 text-[11px] ml-1">({counts.not_started})</span>
          </button>

          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`pb-2 transition cursor-pointer font-medium ${
              statusFilter === 'in_progress'
                ? 'border-b-2 border-slate-900 text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đang học <span className="text-slate-400 text-[11px] ml-1">({counts.in_progress})</span>
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`pb-2 transition cursor-pointer font-medium ${
              statusFilter === 'completed'
                ? 'border-b-2 border-slate-900 text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Hoàn thành <span className="text-slate-400 text-[11px] ml-1">({counts.completed})</span>
          </button>
        </div>
      </div>

      {/* GitHub-style Flat Data Table (Clean, Scan Fast, No Card-Inside-Card) */}
      <div className="border border-slate-200 rounded-md overflow-hidden bg-white text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <th className="py-2.5 px-4 font-medium">Học viên</th>
                <th className="py-2.5 px-4 font-medium">Lớp / Phòng ban</th>
                <th className="py-2.5 px-4 font-medium">Tiến độ</th>
                <th className="py-2.5 px-4 font-medium text-center">Lần thử</th>
                <th className="py-2.5 px-4 font-medium">Trạng thái</th>
                <th className="py-2.5 px-4 font-medium">Hoạt động cuối</th>
                <th className="py-2.5 px-4 font-medium text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy học viên nào phù hợp
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
                      {/* Name & Email */}
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900 group-hover:text-emerald-700 transition">
                          {learner.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {learner.email} · {learner.employeeCode}
                        </div>
                      </td>

                      {/* Class & Department */}
                      <td className="py-2.5 px-4 text-slate-600">
                        <div className="line-clamp-1 max-w-[180px]">{learner.className}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{learner.department}</div>
                      </td>

                      {/* Progress: Clean Inline Ratio */}
                      <td className="py-2.5 px-4">
                        <div className="space-y-1 w-24">
                          <div className="flex justify-between text-[11px] text-slate-600">
                            <span>{learner.completedLabIds.length}/5 bài</span>
                            <span className="text-slate-400">{progressPercent}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Attempts Count */}
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                        {learner.promptAttemptsTotal > 0 ? learner.promptAttemptsTotal : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4">
                        {renderStatus(learner.status)}
                      </td>

                      {/* Last Active */}
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {learner.lastActive}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLearner(learner);
                          }}
                          className="text-slate-400 hover:text-slate-800 text-xs font-medium cursor-pointer"
                        >
                          Xem →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/60 px-4 py-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{filteredLearners.length} học viên</span>
          <span>Bấm vào học viên để kiểm tra chi tiết 5 bài lab và câu lệnh prompt</span>
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
