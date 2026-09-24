import { LabStep, PromptComponentType } from '../types';
import { CourseCurriculumModule, CourseCurriculumLesson } from '../types/database';
import { SEED_LABS_DATA } from '../data/curriculumSeed';

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

const reviewClassCode = typeof window !== 'undefined' && import.meta.env.VITE_REVIEW_CLASS_CODE?.trim();

function formatLessonTitle(title: string, index: number, isEnglish: boolean): string {
  const trimmed = title.trim();
  if (/^(Lesson|Bài|Lab)\s*\d+[:.]/i.test(trimmed)) {
    return trimmed;
  }
  if (isEnglish) {
    return `Lesson ${index + 1}: ${trimmed}`;
  }
  return `Bài ${index + 1}: ${trimmed}`;
}

export function mapCurriculumToLabs(modules: CourseCurriculumModule[]): LabStep[] {
  const lessons = modules
    .filter((module) => module.status === 'published')
    .sort((a, b) => a.position - b.position)
    .flatMap((module) => module.lessons
      .filter((lesson) => lesson.status === 'published')
      .sort((a, b) => a.position - b.position));

  return lessons.map((lesson, index) => {
    const seedLab = SEED_LABS_DATA.find(
      (l) => l.id === lesson.id || l.conceptTag.toLowerCase() === lesson.lesson_key.toLowerCase()
    );

    const isEnglishLesson = Boolean(
      reviewClassCode ||
      lesson.lesson_key?.toUpperCase().includes('EN') ||
      !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(lesson.title)
    );

    return {
      id: lesson.id,
      order: index + 1,
      title: formatLessonTitle(lesson.title, index, isEnglishLesson),
      badge: lesson.badge || (isEnglishLesson ? `Lab ${String(index + 1).padStart(2, '0')}` : `Lab ${String(index + 1).padStart(2, '0')}`),
      focusSkill: lesson.focus_skill || (isEnglishLesson ? 'Hands-on Prompt Engineering' : 'Kỹ nghệ prompt thực hành'),
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
        persona: rubricText(lesson, 0, isEnglishLesson ? 'Persona and context compliance.' : 'Đúng vai trò và bối cảnh nghiệp vụ.'),
        task: rubricText(lesson, 1, isEnglishLesson ? 'Task execution and goal achievement.' : 'Hoàn thành đúng nhiệm vụ.'),
        guardrails: rubricText(lesson, 2, isEnglishLesson ? 'Guardrails and source truth adherence.' : 'Tuân thủ các chốt chặn và dữ liệu nguồn.'),
        format: rubricText(lesson, 3, isEnglishLesson ? 'Output format correctness.' : 'Đúng định dạng đầu ra.'),
      },
      focusComponents: lesson.focus_components.filter(
        (component): component is PromptComponentType => ALLOWED_COMPONENTS.has(component as PromptComponentType),
      ),
      comparisonHighlights: seedLab?.comparisonHighlights,
      miniChallenge: seedLab?.miniChallenge,
      simulatedBaselineOutput: seedLab?.simulatedBaselineOutput || (isEnglishLesson ? 'Run the baseline prompt to generate live AI output.' : 'Đặc tả nguồn chưa cung cấp đầu ra mẫu hoàn chỉnh. Hãy chạy prompt baseline để tạo kết quả thực tế.'),
      simulatedImprovedOutput: seedLab?.simulatedImprovedOutput || (isEnglishLesson ? 'Run the improved prompt to generate live AI output.' : 'Đặc tả nguồn chưa cung cấp đầu ra mẫu hoàn chỉnh. Hãy chạy prompt cải thiện để tạo kết quả thực tế.'),
    };
  });
}
