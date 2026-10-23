import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Edit3,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import {
  ContentStatus,
  CourseCurriculumLesson,
  CourseCurriculumModule,
  DbCourse,
  LessonResourceType,
} from '../../types/database';

interface Props {
  course: DbCourse;
  onCourseChanged: () => void;
}

interface RubricDraft {
  criterion_key: string;
  label: string;
  description: string;
  max_score: number;
}

interface ResourceDraft {
  resource_type: LessonResourceType;
  title: string;
  content: string;
  url: string;
}

interface LessonDraft {
  id?: string;
  module_id: string;
  lesson_key: string;
  title: string;
  badge: string;
  focus_skill: string;
  scenario: string;
  task_goal: string;
  concept_title: string;
  concept_content: string;
  system_instruction: string;
  starter_prompt: string;
  baseline_prompt: string;
  improved_prompt: string;
  sample_input_context: string;
  prompt_placeholder: string;
  expected_output_format: string;
  hints_text: string;
  focus_components_text: string;
  position: number;
  status: ContentStatus;
  rubrics: RubricDraft[];
  resources: ResourceDraft[];
}

const blankLesson = (moduleId: string, position: number): LessonDraft => ({
  module_id: moduleId,
  lesson_key: '',
  title: '',
  badge: '',
  focus_skill: '',
  scenario: '',
  task_goal: '',
  concept_title: '',
  concept_content: '',
  system_instruction: '',
  starter_prompt: '',
  baseline_prompt: '',
  improved_prompt: '',
  sample_input_context: '',
  prompt_placeholder: '',
  expected_output_format: '',
  hints_text: '',
  focus_components_text: '',
  position,
  status: 'draft',
  rubrics: [],
  resources: [],
});

const lessonToDraft = (lesson: CourseCurriculumLesson): LessonDraft => ({
  id: lesson.id,
  module_id: lesson.module_id,
  lesson_key: lesson.lesson_key,
  title: lesson.title,
  badge: lesson.badge || '',
  focus_skill: lesson.focus_skill || '',
  scenario: lesson.scenario || '',
  task_goal: lesson.task_goal || '',
  concept_title: lesson.concept_title || '',
  concept_content: lesson.concept_content || '',
  system_instruction: lesson.system_instruction || '',
  starter_prompt: lesson.starter_prompt || '',
  baseline_prompt: lesson.baseline_prompt || '',
  improved_prompt: lesson.improved_prompt || '',
  sample_input_context: lesson.sample_input_context || '',
  prompt_placeholder: lesson.prompt_placeholder || '',
  expected_output_format: lesson.expected_output_format || '',
  hints_text: lesson.hints.join('\n'),
  focus_components_text: lesson.focus_components.join('\n'),
  position: lesson.position,
  status: lesson.status,
  rubrics: lesson.rubric_criteria.map((criterion) => ({
    criterion_key: criterion.criterion_key,
    label: criterion.label,
    description: criterion.description,
    max_score: criterion.max_score,
  })),
  resources: lesson.resources.map((resource) => ({
    resource_type: resource.resource_type,
    title: resource.title,
    content: resource.content || '',
    url: resource.url || '',
  })),
});

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
const nullable = (value: string) => value.trim() || null;

export const CourseCurriculumEditor: React.FC<Props> = ({ course, onCourseChanged }) => {
  const [modules, setModules] = useState<CourseCurriculumModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [editingModule, setEditingModule] = useState<CourseCurriculumModule | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);

  const lessonCount = useMemo(
    () => modules.reduce((total, module) => total + module.lessons.length, 0),
    [modules],
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await dbService.getCourseCurriculum(course.id);
      setModules(data);
      setExpanded((current) => current.size > 0 ? current : new Set(data.map((module) => module.id)));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể tải nội dung khóa học.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLessonDraft(null);
    setEditingModule(null);
    load();
  }, [course.id]);

  const notifySuccess = (text: string) => {
    setMessage({ type: 'success', text });
    onCourseChanged();
  };

  const addModule = async () => {
    if (!newModuleTitle.trim()) return;
    setSaving(true);
    try {
      const module = await dbService.createCourseModule({
        course_id: course.id,
        title: newModuleTitle.trim(),
        description: null,
        position: Math.max(0, ...modules.map((item) => item.position)) + 1,
        status: 'draft',
      });
      setNewModuleTitle('');
      setExpanded((current) => new Set(current).add(module.id));
      await load();
      notifySuccess('Đã tạo chương mới ở trạng thái bản nháp.');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể tạo chương.' });
    } finally {
      setSaving(false);
    }
  };

  const saveModule = async () => {
    if (!editingModule?.title.trim()) return;
    setSaving(true);
    try {
      await dbService.updateCourseModule(editingModule.id, {
        title: editingModule.title.trim(),
        description: editingModule.description?.trim() || null,
        status: editingModule.status,
      });
      setEditingModule(null);
      await load();
      notifySuccess('Đã cập nhật chương.');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể cập nhật chương.' });
    } finally {
      setSaving(false);
    }
  };

  const removeModule = async (module: CourseCurriculumModule) => {
    if (!window.confirm(`Xóa chương “${module.title}” và toàn bộ bài học bên trong?`)) return;
    try {
      await dbService.deleteCourseModule(module.id);
      if (lessonDraft?.module_id === module.id) setLessonDraft(null);
      await load();
      notifySuccess('Đã xóa chương và nội dung liên quan.');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể xóa chương.' });
    }
  };

  const removeLesson = async (lesson: CourseCurriculumLesson) => {
    if (!window.confirm(`Xóa bài học “${lesson.title}”?`)) return;
    try {
      await dbService.deleteLesson(lesson.id);
      if (lessonDraft?.id === lesson.id) setLessonDraft(null);
      await load();
      notifySuccess('Đã xóa bài học.');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể xóa bài học.' });
    }
  };

  const saveLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lessonDraft?.lesson_key.trim() || !lessonDraft.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        module_id: lessonDraft.module_id,
        lesson_key: lessonDraft.lesson_key.trim(),
        title: lessonDraft.title.trim(),
        badge: nullable(lessonDraft.badge),
        focus_skill: nullable(lessonDraft.focus_skill),
        scenario: nullable(lessonDraft.scenario),
        task_goal: nullable(lessonDraft.task_goal),
        concept_title: nullable(lessonDraft.concept_title),
        concept_content: nullable(lessonDraft.concept_content),
        system_instruction: nullable(lessonDraft.system_instruction),
        starter_prompt: nullable(lessonDraft.starter_prompt),
        baseline_prompt: nullable(lessonDraft.baseline_prompt),
        improved_prompt: nullable(lessonDraft.improved_prompt),
        sample_input_context: nullable(lessonDraft.sample_input_context),
        prompt_placeholder: nullable(lessonDraft.prompt_placeholder),
        expected_output_format: nullable(lessonDraft.expected_output_format),
        hints: splitLines(lessonDraft.hints_text),
        focus_components: splitLines(lessonDraft.focus_components_text),
        position: lessonDraft.position,
        status: lessonDraft.status,
      };

      const lesson = lessonDraft.id
        ? await dbService.updateLesson(lessonDraft.id, payload)
        : await dbService.createLesson(payload);

      await dbService.replaceLessonRubrics(
        lesson.id,
        lessonDraft.rubrics
          .filter((criterion) => criterion.label.trim())
          .map((criterion, index) => ({
            criterion_key: criterion.criterion_key.trim() || `criterion_${index + 1}`,
            label: criterion.label.trim(),
            description: criterion.description.trim(),
            max_score: Number(criterion.max_score) || 1,
            position: index + 1,
          })),
      );
      await dbService.replaceLessonResources(
        lesson.id,
        lessonDraft.resources
          .filter((resource) => resource.title.trim())
          .map((resource, index) => ({
            resource_type: resource.resource_type,
            title: resource.title.trim(),
            content: nullable(resource.content),
            url: nullable(resource.url),
            position: index + 1,
          })),
      );

      setLessonDraft(null);
      await load();
      notifySuccess(lessonDraft.id ? 'Đã cập nhật bài học.' : 'Đã tạo bài học mới.');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể lưu bài học.' });
    } finally {
      setSaving(false);
    }
  };

  const setDraftField = <K extends keyof LessonDraft>(key: K, value: LessonDraft[K]) => {
    setLessonDraft((current) => current ? { ...current, [key]: value } : current);
  };

  if (loading) {
    return <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-500"><RefreshCw className="w-4 h-4 animate-spin" /> Đang tải chương trình học...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div>
          <h3 className="text-sm font-bold text-emerald-950">{course.title}</h3>
          <p className="mt-1 text-xs text-emerald-800">{modules.length} chương · {lessonCount} bài học · trạng thái xuất bản: {course.publication_status || 'draft'}</p>
        </div>
        <div className="flex gap-2">
          <input
            value={newModuleTitle}
            onChange={(event) => setNewModuleTitle(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addModule(); } }}
            placeholder="Tên chương mới"
            className="min-w-0 w-56 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={addModule} disabled={saving || !newModuleTitle.trim()} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" /> Thêm chương
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-xs text-slate-500">Khóa học chưa có chương. Tạo chương đầu tiên để thêm bài học.</div>
      ) : modules.map((module) => {
        const isExpanded = expanded.has(module.id);
        return (
          <section key={module.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
              <button
                onClick={() => setExpanded((current) => {
                  const next = new Set(current);
                  next.has(module.id) ? next.delete(module.id) : next.add(module.id);
                  return next;
                })}
                className="text-slate-500"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <BookOpen className="h-4 w-4 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-xs font-bold text-slate-900">{module.position}. {module.title}</h4>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">{module.status}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">{module.lessons.length} bài học</p>
              </div>
              <button onClick={() => setEditingModule(module)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200" title="Sửa chương"><Edit3 className="h-3.5 w-3.5" /></button>
              <button onClick={() => setLessonDraft(blankLesson(module.id, Math.max(0, ...module.lessons.map((item) => item.position)) + 1))} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800"><Plus className="h-3 w-3" /> Bài học</button>
              <button onClick={() => removeModule(module)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" title="Xóa chương"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>

            {isExpanded && (
              <div className="divide-y divide-slate-100">
                {module.lessons.length === 0 ? (
                  <div className="px-12 py-5 text-xs text-slate-400">Chưa có bài học trong chương này.</div>
                ) : module.lessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{lesson.position}. {lesson.title}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{lesson.lesson_key} · {lesson.rubric_criteria.length} rubric · {lesson.resources.length} tài nguyên</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${lesson.status === 'published' ? 'bg-emerald-50 text-emerald-700' : lesson.status === 'archived' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{lesson.status}</span>
                    <button onClick={() => setLessonDraft(lessonToDraft(lesson))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => removeLesson(lesson)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {editingModule && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Chỉnh sửa chương</h3><button onClick={() => setEditingModule(null)}><X className="h-4 w-4" /></button></div>
            <input value={editingModule.title} onChange={(event) => setEditingModule({ ...editingModule, title: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <textarea value={editingModule.description || ''} onChange={(event) => setEditingModule({ ...editingModule, description: event.target.value })} rows={3} placeholder="Mô tả chương" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <select value={editingModule.status} onChange={(event) => setEditingModule({ ...editingModule, status: event.target.value as ContentStatus })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option><option value="archived">Lưu trữ</option></select>
            <div className="flex justify-end gap-2"><button onClick={() => setEditingModule(null)} className="px-3 py-2 text-xs">Hủy</button><button onClick={saveModule} disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">Lưu chương</button></div>
          </div>
        </div>
      )}

      {lessonDraft && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/70 p-4">
          <form onSubmit={saveLesson} className="mx-auto my-4 w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-5 py-4">
              <div><h3 className="text-sm font-bold text-slate-900">{lessonDraft.id ? 'Chỉnh sửa bài học' : 'Tạo bài học'}</h3><p className="mt-0.5 text-[11px] text-slate-500">Nội dung, prompt mẫu, rubric và tài nguyên</p></div>
              <button type="button" onClick={() => setLessonDraft(null)}><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Thông tin & nội dung</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] font-semibold text-slate-600">Mã bài học *<input required value={lessonDraft.lesson_key} onChange={(e) => setDraftField('lesson_key', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                  <label className="text-[11px] font-semibold text-slate-600">Thứ tự<input type="number" min={1} value={lessonDraft.position} onChange={(e) => setDraftField('position', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                </div>
                <label className="block text-[11px] font-semibold text-slate-600">Tiêu đề *<input required value={lessonDraft.title} onChange={(e) => setDraftField('title', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] font-semibold text-slate-600">Badge<input value={lessonDraft.badge} onChange={(e) => setDraftField('badge', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                  <label className="text-[11px] font-semibold text-slate-600">Trạng thái<select value={lessonDraft.status} onChange={(e) => setDraftField('status', e.target.value as ContentStatus)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option><option value="archived">Lưu trữ</option></select></label>
                </div>
                <label className="block text-[11px] font-semibold text-slate-600">Kỹ năng trọng tâm<textarea rows={2} value={lessonDraft.focus_skill} onChange={(e) => setDraftField('focus_skill', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <label className="block text-[11px] font-semibold text-slate-600">Tình huống<textarea rows={5} value={lessonDraft.scenario} onChange={(e) => setDraftField('scenario', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <label className="block text-[11px] font-semibold text-slate-600">Nhiệm vụ<textarea rows={5} value={lessonDraft.task_goal} onChange={(e) => setDraftField('task_goal', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <label className="block text-[11px] font-semibold text-slate-600">Tiêu đề kiến thức<input value={lessonDraft.concept_title} onChange={(e) => setDraftField('concept_title', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <label className="block text-[11px] font-semibold text-slate-600">Kiến thức nền<textarea rows={8} value={lessonDraft.concept_content} onChange={(e) => setDraftField('concept_content', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" /></label>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Prompt & đánh giá</h4>
                {([
                  ['system_instruction', 'System instruction'],
                  ['starter_prompt', 'Prompt khởi đầu'],
                  ['baseline_prompt', 'Prompt trước cải thiện'],
                  ['improved_prompt', 'Prompt sau cải thiện'],
                  ['sample_input_context', 'Dữ liệu mẫu'],
                  ['expected_output_format', 'Định dạng đầu ra kỳ vọng'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block text-[11px] font-semibold text-slate-600">{label}<textarea rows={key === 'improved_prompt' || key === 'sample_input_context' ? 6 : 3} value={lessonDraft[key]} onChange={(e) => setDraftField(key, e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" /></label>
                ))}
                <label className="block text-[11px] font-semibold text-slate-600">Placeholder<input value={lessonDraft.prompt_placeholder} onChange={(e) => setDraftField('prompt_placeholder', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] font-semibold text-slate-600">Hints (mỗi dòng một mục)<textarea rows={4} value={lessonDraft.hints_text} onChange={(e) => setDraftField('hints_text', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                  <label className="text-[11px] font-semibold text-slate-600">Focus components (mỗi dòng)<textarea rows={4} value={lessonDraft.focus_components_text} onChange={(e) => setDraftField('focus_components_text', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center justify-between"><h5 className="text-xs font-bold">Rubric ({lessonDraft.rubrics.length})</h5><button type="button" onClick={() => setDraftField('rubrics', [...lessonDraft.rubrics, { criterion_key: '', label: '', description: '', max_score: 10 }])} className="text-[11px] font-semibold text-emerald-700">+ Tiêu chí</button></div>
                  {lessonDraft.rubrics.map((criterion, index) => (
                    <div key={index} className="grid grid-cols-[1fr_80px_28px] gap-2 rounded-lg bg-slate-50 p-2">
                      <div className="space-y-2"><input placeholder="Nhãn tiêu chí" value={criterion.label} onChange={(e) => setDraftField('rubrics', lessonDraft.rubrics.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs" /><input placeholder="criterion_key" value={criterion.criterion_key} onChange={(e) => setDraftField('rubrics', lessonDraft.rubrics.map((item, i) => i === index ? { ...item, criterion_key: e.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs" /><textarea placeholder="Mô tả điều kiện đạt" rows={2} value={criterion.description} onChange={(e) => setDraftField('rubrics', lessonDraft.rubrics.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs" /></div>
                      <input type="number" min={0.01} step="0.01" value={criterion.max_score} onChange={(e) => setDraftField('rubrics', lessonDraft.rubrics.map((item, i) => i === index ? { ...item, max_score: Number(e.target.value) } : item))} className="h-8 rounded border border-slate-300 px-2 text-xs" title="Điểm tối đa" />
                      <button type="button" onClick={() => setDraftField('rubrics', lessonDraft.rubrics.filter((_, i) => i !== index))} className="self-start p-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center justify-between"><h5 className="text-xs font-bold">Tài nguyên ({lessonDraft.resources.length})</h5><button type="button" onClick={() => setDraftField('resources', [...lessonDraft.resources, { resource_type: 'reference', title: '', content: '', url: '' }])} className="text-[11px] font-semibold text-emerald-700">+ Tài nguyên</button></div>
                  {lessonDraft.resources.map((resource, index) => (
                    <div key={index} className="space-y-2 rounded-lg bg-slate-50 p-2">
                      <div className="flex gap-2"><select value={resource.resource_type} onChange={(e) => setDraftField('resources', lessonDraft.resources.map((item, i) => i === index ? { ...item, resource_type: e.target.value as LessonResourceType } : item))} className="rounded border border-slate-300 px-2 py-1.5 text-xs"><option value="reference">Reference</option><option value="text">Text</option><option value="data">Data</option><option value="url">URL</option><option value="file">File</option></select><input placeholder="Tên tài nguyên" value={resource.title} onChange={(e) => setDraftField('resources', lessonDraft.resources.map((item, i) => i === index ? { ...item, title: e.target.value } : item))} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs" /><button type="button" onClick={() => setDraftField('resources', lessonDraft.resources.filter((_, i) => i !== index))} className="p-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
                      <input placeholder="URL (nếu có)" value={resource.url} onChange={(e) => setDraftField('resources', lessonDraft.resources.map((item, i) => i === index ? { ...item, url: e.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs" />
                      <textarea rows={4} placeholder="Nội dung tài nguyên" value={resource.content} onChange={(e) => setDraftField('resources', lessonDraft.resources.map((item, i) => i === index ? { ...item, content: e.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setLessonDraft(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">Hủy</button><button type="submit" disabled={saving || !lessonDraft.title.trim() || !lessonDraft.lesson_key.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? 'Đang lưu...' : 'Lưu bài học'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
};
