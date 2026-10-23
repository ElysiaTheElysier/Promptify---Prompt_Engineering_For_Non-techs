import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  Zap, 
  HelpCircle,
  UserPlus,
  Trash2,
  Edit3,
  RefreshCw,
  X
} from 'lucide-react';
import { InstructorLearner } from '../../types/instructor';
import { LearnerInClassDetail, EnrollmentStatus } from '../../types/database';
import { dbService } from '../../services/dbService';
import { AddLearnerModal } from './AddLearnerModal';

interface Props {
  initialClassId?: string;
  showClassFilter?: boolean;
  onOpenTutorial?: () => void;
  onLearnerCountChanged?: () => void;
}

export const LearnerTableView: React.FC<Props> = ({ 
  initialClassId,
  showClassFilter = true,
  onOpenTutorial,
  onLearnerCountChanged
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (initialClassId) return initialClassId;
    return sessionStorage.getItem('promptify_learner_table_class_id') || 'ALL';
  });
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'completed' | 'removed'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persist selectedClassId if table is viewed generally (e.g. from Learners tab)
  useEffect(() => {
    if (!initialClassId) {
      sessionStorage.setItem('promptify_learner_table_class_id', selectedClassId);
    }
  }, [selectedClassId, initialClassId]);
  
  // Data State từ DB
  const [dbLearners, setDbLearners] = useState<LearnerInClassDetail[]>([]);
  const [classesList, setClassesList] = useState<{ id: string; name: string; code: string; department: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingLearner, setEditingLearner] = useState<LearnerInClassDetail | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editStatus, setEditStatus] = useState<EnrollmentStatus>('active');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Load Classes list from DB
  const loadClasses = async () => {
    try {
      const cls = await dbService.getInstructorClassesWithDetails();
      setClassesList(cls.map(c => ({
        id: c.id,
        name: c.course?.title || c.class_code,
        code: c.class_code,
        department: c.department
      })));
    } catch (err: any) {
      setClassesList([]);
      setFeedback({ type: 'error', message: err.message || 'Không thể tải lớp học từ Supabase.' });
    }
  };

  // Load Learners from DB
  const loadLearners = async () => {
    setLoading(true);
    try {
      const list = await dbService.getInstructorLearnersInClass(selectedClassId);
      setDbLearners(list);
    } catch (err: any) {
      console.error('Lỗi nạp danh sách học viên:', err);
      setFeedback({ type: 'error', message: err.message || 'Lỗi tải danh sách học viên' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchCls = async () => {
      try {
        const cls = await dbService.getInstructorClassesWithDetails();
        if (isMounted) {
          setClassesList(cls.map(c => ({
            id: c.id,
            name: c.course?.title || c.class_code,
            code: c.class_code,
            department: c.department
          })));
        }
      } catch (err: any) {
        if (isMounted) {
          setClassesList([]);
          setFeedback({ type: 'error', message: err.message || 'Không thể tải lớp học từ Supabase.' });
        }
      }
    };
    fetchCls();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchLearners = async () => {
      setLoading(true);
      try {
        const list = await dbService.getInstructorLearnersInClass(selectedClassId);
        if (isMounted) setDbLearners(list);
      } catch (err: any) {
        if (isMounted) {
          console.error('Lỗi nạp danh sách học viên:', err);
          setFeedback({ type: 'error', message: err.message || 'Lỗi tải danh sách học viên' });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLearners();
    return () => { isMounted = false; };
  }, [selectedClassId]);

  // Lọc danh sách học viên
  const filteredLearners = useMemo(() => {
    return dbLearners.filter((l) => {
      // Filter status
      if (statusFilter !== 'ALL' && l.enrollment_status !== statusFilter) {
        return false;
      }
      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = l.full_name ? l.full_name.toLowerCase().includes(q) : false;
        const mEmail = l.email ? l.email.toLowerCase().includes(q) : false;
        const mCode = l.learner_code ? l.learner_code.toLowerCase().includes(q) : false;
        const mDept = l.department ? l.department.toLowerCase().includes(q) : false;
        if (!mName && !mEmail && !mCode && !mDept) return false;
      }
      return true;
    });
  }, [dbLearners, statusFilter, searchQuery]);

  // Counts cho status tabs
  const counts = useMemo(() => {
    return {
      all: dbLearners.length,
      active: dbLearners.filter(l => l.enrollment_status === 'active').length,
      completed: dbLearners.filter(l => l.enrollment_status === 'completed').length,
      removed: dbLearners.filter(l => l.enrollment_status === 'removed').length,
    };
  }, [dbLearners]);

  // Xóa khỏi lớp (P0.6: KHÔNG xóa user, KHÔNG xóa learner, chỉ set enrollment.status = 'removed')
  const handleRemoveLearner = async (learner: LearnerInClassDetail) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa học viên "${learner.full_name}" (${learner.learner_code}) khỏi lớp này?\n\nLưu ý: Tài khoản người dùng và hồ sơ học viên vẫn được giữ nguyên trong hệ thống.`
    );
    if (!confirmed) return;

    try {
      await dbService.removeLearnerFromClass(learner.enrollment_id);
      setFeedback({
        type: 'success',
        message: `Đã xóa học viên ${learner.full_name} khỏi lớp học. Tài khoản người dùng vẫn được bảo lưu an toàn.`
      });
      await loadLearners();
      onLearnerCountChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi xóa học viên khỏi lớp' });
    }
  };

  // Mở modal sửa thông tin
  const handleStartEdit = (learner: LearnerInClassDetail) => {
    setEditingLearner(learner);
    setEditName(learner.full_name);
    setEditStatus(learner.enrollment_status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLearner) return;

    setIsSavingEdit(true);
    try {
      await dbService.updateLearnerInClass(editingLearner.enrollment_id, {
        fullName: editName.trim(),
        status: editStatus,
      });
      setFeedback({ type: 'success', message: 'Đã cập nhật thông tin học viên thành công!' });
      setEditingLearner(null);
      await loadLearners();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi cập nhật học viên' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getStatusBadge = (status: EnrollmentStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã hoàn thành
          </span>
        );
      case 'removed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3 h-3 text-rose-600" />
            Đã rời lớp
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" />
            Hết hạn
          </span>
        );
      case 'active':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Đang học
          </span>
        );
    }
  };

  const currentSelectedClassObj = classesList.find(c => c.id === selectedClassId) || classesList[0] || {
    id: selectedClassId,
    name: 'Lớp đào tạo',
    code: selectedClassId,
    department: 'Ban Nghiệp vụ'
  };

  return (
    <div className="space-y-4">
      {/* Toast / Feedback Banner */}
      {feedback && (
        <div className={`p-3 rounded-xl text-xs flex items-center justify-between transition animate-in fade-in ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Controls Bar: Search & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div data-tour="learners-search-filter" className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã LRN, họ tên, email, phòng ban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Action buttons & Filters */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Nút Thêm học viên vào lớp (P0.6) */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Thêm học viên</span>
            </button>

            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition cursor-pointer"
                title="Xem lại hướng dẫn quản lý học viên"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hướng dẫn</span>
              </button>
            )}

            {showClassFilter && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[220px]"
                >
                  <option value="ALL">Tất cả lớp học</option>
                  {classesList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.code}: {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Status filter tabs */}
        <div data-tour="learners-status-tabs" className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả ({counts.all})
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            Đang học ({counts.active})
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Đã hoàn thành ({counts.completed})
          </button>

          <button
            onClick={() => setStatusFilter('removed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'removed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-rose-50 hover:text-rose-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Đã xóa khỏi lớp ({counts.removed})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div data-tour="learners-table-rows" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã Học Viên</th>
                <th className="py-3.5 px-4">Họ và Tên</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Phòng Ban</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4">Ngày Ghi Danh</th>
                <th className="py-3.5 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Đang tải danh sách học viên từ cơ sở dữ liệu...</span>
                  </td>
                </tr>
              ) : filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Chưa có học viên nào phù hợp bộ lọc</p>
                    <p className="text-xs text-slate-400 mt-1">Bấm "+ Thêm học viên" ở trên để ghi danh học viên mới vào lớp.</p>
                  </td>
                </tr>
              ) : (
                filteredLearners.map((learner) => {
                  const avatarLetter = learner.full_name ? learner.full_name.charAt(0).toUpperCase() : 'H';
                  const dateStr = learner.joined_at ? new Date(learner.joined_at).toLocaleDateString('vi-VN') : 'Mới';

                  return (
                    <tr
                      key={learner.enrollment_id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Learner Code (LRN-000001) */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {learner.learner_code}
                        </span>
                      </td>

                      {/* Full Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                            {avatarLetter}
                          </div>
                          <span className="font-semibold text-slate-900">
                            {learner.full_name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {learner.email}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {learner.department}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(learner.enrollment_status)}
                      </td>

                      {/* Joined At */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {dateStr}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(learner)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                            title="Sửa thông tin học viên"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {learner.enrollment_status !== 'removed' && (
                            <button
                              onClick={() => handleRemoveLearner(learner)}
                              className="px-2 py-1 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 transition text-[11px] font-semibold flex items-center gap-1"
                              title="Xóa học viên khỏi lớp này (không xóa tài khoản người dùng)"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa khỏi lớp</span>
                            </button>
                          )}
                        </div>
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
          <span>Tổng số <strong>{filteredLearners.length}</strong> học viên hiển thị</span>
          <span className="text-[11px]">Mã định danh LRN được cấp phát tự động và đồng bộ với Google OAuth</span>
        </div>
      </div>

      {/* Modal Thêm Học Viên */}
      <AddLearnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        classId={selectedClassId === 'ALL' ? (classesList[0]?.id || '44444444-4444-4444-4444-444444444441') : selectedClassId}
        classCode={currentSelectedClassObj.code}
        department={currentSelectedClassObj.department}
        onLearnerAdded={() => {
          loadLearners();
          onLearnerCountChanged?.();
        }}
      />

      {/* Modal Sửa Học Viên Inline */}
      {editingLearner && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                Sửa Học Viên {editingLearner.learner_code}
              </h4>
              <button onClick={() => setEditingLearner(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Họ và Tên</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Trạng thái Ghi danh</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as EnrollmentStatus)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="active">Đang học (Active)</option>
                  <option value="completed">Đã hoàn thành (Completed)</option>
                  <option value="removed">Đã rời lớp (Removed)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLearner(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                >
                  {isSavingEdit ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
