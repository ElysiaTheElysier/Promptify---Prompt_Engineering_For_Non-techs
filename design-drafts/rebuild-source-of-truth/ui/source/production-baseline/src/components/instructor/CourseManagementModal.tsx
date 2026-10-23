import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Plus, 
  Archive, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2,
  RefreshCw,
  Info,
  Layers3,
  Send
} from 'lucide-react';
import { DbCourse } from '../../types/database';
import { dbService } from '../../services/dbService';
import { CourseCurriculumEditor } from './CourseCurriculumEditor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCoursesChanged?: () => void;
}

export const CourseManagementModal: React.FC<Props> = ({ isOpen, onClose, onCoursesChanged }) => {
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'curriculum'>('list');
  const [selectedCourse, setSelectedCourse] = useState<DbCourse | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Notification Banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const list = await dbService.getCourses();
      setCourses(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi tải danh sách khóa học' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      setFeedback(null);
      setActiveTab('list');
      setEditingCourseId(null);
      setSelectedCourse(null);
      setTitle('');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCourseId) {
        await dbService.updateCourse(editingCourseId, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
        setFeedback({ type: 'success', message: 'Đã cập nhật khóa học thành công!' });
      } else {
        await dbService.createCourse({
          title: title.trim(),
          description: description.trim() || undefined,
        });
        setFeedback({ type: 'success', message: 'Đã tạo khóa học mới thành công!' });
      }
      setTitle('');
      setDescription('');
      setEditingCourseId(null);
      setActiveTab('list');
      await fetchCourses();
      onCoursesChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi lưu khóa học' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (course: DbCourse) => {
    setEditingCourseId(course.id);
    setTitle(course.title);
    setDescription(course.description || '');
    setActiveTab('create');
    setFeedback(null);
  };

  const handleOpenCurriculum = (course: DbCourse) => {
    setSelectedCourse(course);
    setActiveTab('curriculum');
    setFeedback(null);
  };

  const handleTogglePublication = async (course: DbCourse) => {
    const next = course.publication_status === 'published' ? 'draft' : 'published';
    try {
      const updated = await dbService.updateCourse(course.id, {
        publication_status: next,
        published_at: next === 'published' ? new Date().toISOString() : null,
        version: Math.max(1, course.version || 1) + 1,
      });
      setSelectedCourse((current) => current?.id === updated.id ? updated : current);
      setFeedback({ type: 'success', message: next === 'published' ? 'Đã xuất bản khóa học.' : 'Đã chuyển khóa học về bản nháp.' });
      await fetchCourses();
      onCoursesChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi đổi trạng thái xuất bản' });
    }
  };

  const handleArchiveOrDelete = async (course: DbCourse) => {
    try {
      const result = await dbService.archiveOrDeleteCourse(course.id);
      if (result.isArchived) {
        setFeedback({
          type: 'warning',
          message: result.message, // "Khóa học này đang được sử dụng bởi lớp học. Bạn có thể lưu trữ thay vì xóa."
        });
      } else {
        setFeedback({
          type: 'success',
          message: result.message,
        });
      }
      await fetchCourses();
      onCoursesChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi xử lý khóa học' });
    }
  };

  const handleToggleStatus = async (course: DbCourse) => {
    const nextStatus = course.status === 'active' ? 'archived' : 'active';
    try {
      await dbService.updateCourse(course.id, { status: nextStatus });
      setFeedback({ 
        type: 'success', 
        message: nextStatus === 'active' ? 'Đã kích hoạt lại khóa học!' : 'Đã chuyển khóa học vào mục Lưu trữ.' 
      });
      await fetchCourses();
      onCoursesChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi đổi trạng thái' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-6xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Quản lý Khóa học (Courses)
              </h3>
              <p className="text-xs text-slate-500">
                Khóa học là nội dung chuẩn hóa có thể tái sử dụng để triển khai cho nhiều lớp
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 border-b border-slate-100 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('list'); setEditingCourseId(null); setTitle(''); setDescription(''); }}
            className={`pb-2.5 transition border-b-2 ${
              activeTab === 'list' 
                ? 'border-emerald-600 text-emerald-800' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Danh sách khóa học ({courses.length})
          </button>
          {selectedCourse && (
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`pb-2.5 transition border-b-2 flex items-center gap-1 ${
                activeTab === 'curriculum'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers3 className="w-3.5 h-3.5" />
              <span>Nội dung: {selectedCourse.title}</span>
            </button>
          )}
          <button
            onClick={() => { setActiveTab('create'); }}
            className={`pb-2.5 transition border-b-2 flex items-center gap-1 ${
              activeTab === 'create' 
                ? 'border-emerald-600 text-emerald-800' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingCourseId ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : feedback.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium leading-relaxed">
              {feedback.message}
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'list' ? (
            loading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Đang tải danh sách khóa học...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-3">
                <p>Chưa có khóa học nào trong cơ sở dữ liệu.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo khóa học đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {courses.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {c.title}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          c.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {c.status === 'active' ? 'Hoạt động' : 'Lưu trữ'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          c.publication_status === 'published'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {c.publication_status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {c.description || 'Chưa có mô tả chi tiết.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenCurriculum(c)}
                        className="px-2.5 py-1 text-xs text-emerald-700 hover:text-emerald-900 rounded-lg hover:bg-emerald-50 border border-emerald-200 transition flex items-center gap-1"
                        title="Quản lý chương, bài học, rubric và tài nguyên"
                      >
                        <Layers3 className="w-3 h-3" />
                        <span>Nội dung</span>
                      </button>

                      <button
                        onClick={() => handleTogglePublication(c)}
                        className="px-2.5 py-1 text-xs text-sky-700 hover:text-sky-900 rounded-lg hover:bg-sky-50 border border-sky-200 transition flex items-center gap-1"
                        title="Đổi trạng thái xuất bản"
                      >
                        <Send className="w-3 h-3" />
                        <span>{c.publication_status === 'published' ? 'Về nháp' : 'Xuất bản'}</span>
                      </button>

                      <button
                        onClick={() => handleStartEdit(c)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 border border-slate-200 transition flex items-center gap-1"
                        title="Chỉnh sửa thông tin khóa học"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(c)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 border border-slate-200 transition flex items-center gap-1"
                        title={c.status === 'active' ? 'Chuyển vào lưu trữ' : 'Kích hoạt lại'}
                      >
                        <Archive className="w-3 h-3" />
                        <span>{c.status === 'active' ? 'Lưu trữ' : 'Mở lại'}</span>
                      </button>

                      <button
                        onClick={() => handleArchiveOrDelete(c)}
                        className="px-2.5 py-1 text-xs text-rose-700 hover:text-rose-900 rounded-lg hover:bg-rose-50 border border-rose-200 transition flex items-center gap-1"
                        title="Xóa hoặc lưu trữ nếu đang có lớp học dùng"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'curriculum' && selectedCourse ? (
            <CourseCurriculumEditor
              course={selectedCourse}
              onCourseChanged={async () => {
                await fetchCourses();
                onCoursesChanged?.();
              }}
            />
          ) : (
            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Tên Khóa Học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Prompt Engineering for Financial Analysts"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Mô Tả Khóa Học
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu đầu ra, các chủ đề cốt lõi và bài toán nghiệp vụ giải quyết..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setActiveTab('list'); setEditingCourseId(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : editingCourseId ? 'Lưu thay đổi' : 'Tạo khóa học'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>Khóa học đã gắn với lớp học sẽ được tự động bảo vệ: Lưu trữ (Archived) thay vì xóa vĩnh viễn.</span>
        </div>
      </div>
    </div>
  );
};
