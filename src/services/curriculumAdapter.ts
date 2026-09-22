import { LabStep, PromptComponentType } from '../types';
import { CourseCurriculumModule, CourseCurriculumLesson } from '../types/database';

const ALLOWED_COMPONENTS = new Set<PromptComponentType>([
  'role',
  'context',
  'task',
  'constraint',
  'output_format',
  'example',
  'grounding',
]);

const rubricText = (lesson: CourseCurriculumLesson, index: number, fallback: string) => {
  const criterion = lesson.rubric_criteria[index];
  return criterion ? `${criterion.label}: ${criterion.description}` : fallback;
};

/**
 * Adapter tạm thời giữa curriculum chuẩn hóa trong database và LabStep mà UI học
 * hiện tại đang sử dụng. Dữ liệu DB luôn được ưu tiên; LABS_DATA chỉ là fallback
 * khi khóa học chưa có curriculum hoặc migration chưa được triển khai.
 */
export function mapCurriculumToLabs(modules: CourseCurriculumModule[]): LabStep[] {
  const lessons = modules
    .filter((module) => module.status === 'published')
    .sort((a, b) => a.position - b.position)
    .flatMap((module) => module.lessons
      .filter((lesson) => lesson.status === 'published')
      .sort((a, b) => a.position - b.position));

  return lessons.map((lesson, index) => ({
    id: lesson.id,
    order: index + 1,
    title: lesson.title,
    badge: lesson.badge || `Bài ${index + 1}`,
    focusSkill: lesson.focus_skill || 'Kỹ nghệ prompt thực hành',
    scenario: lesson.scenario || '',
    taskGoal: lesson.task_goal || '',
    conceptTag: lesson.lesson_key,
    conceptTitle: lesson.concept_title || lesson.title,
    conceptExplanation: lesson.concept_content || '',
    systemInstruction: lesson.system_instruction || undefined,
    baselinePrompt: lesson.baseline_prompt || '',
    improvedPrompt: lesson.improved_prompt || '',
    starterPrompt: lesson.starter_prompt || undefined,
    promptPlaceholder: lesson.prompt_placeholder || undefined,
    sampleInputContext: lesson.sample_input_context || undefined,
    hints: lesson.hints,
    expectedOutputFormat: lesson.expected_output_format || '',
    rubricCriteria: {
      persona: rubricText(lesson, 0, 'Đúng vai trò và bối cảnh nghiệp vụ.'),
      task: rubricText(lesson, 1, 'Hoàn thành đúng nhiệm vụ.'),
      guardrails: rubricText(lesson, 2, 'Tuân thủ các chốt chặn và dữ liệu nguồn.'),
      format: rubricText(lesson, 3, 'Đúng định dạng đầu ra.'),
    },
    focusComponents: lesson.focus_components.filter(
      (component): component is PromptComponentType => ALLOWED_COMPONENTS.has(component as PromptComponentType),
    ),
    simulatedBaselineOutput: 'Đặc tả nguồn chưa cung cấp đầu ra mẫu hoàn chỉnh. Hãy chạy prompt baseline để tạo kết quả thực tế.',
    simulatedImprovedOutput: 'Đặc tả nguồn chưa cung cấp đầu ra mẫu hoàn chỉnh. Hãy chạy prompt cải thiện để tạo kết quả thực tế.',
  }));
}
