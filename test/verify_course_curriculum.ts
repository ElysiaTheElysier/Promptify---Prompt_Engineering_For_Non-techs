import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { dbService } from '../src/services/dbService';
import { mapCurriculumToLabs } from '../src/services/curriculumAdapter';

console.log('=== TEST: Course Curriculum Management ===');

const course = await dbService.createCourse({
  title: 'Khóa học kiểm thử curriculum',
  description: 'Chỉ tồn tại trong memory fallback của tiến trình test.',
});
assert.equal(course.publication_status, 'draft');

const module = await dbService.createCourseModule({
  course_id: course.id,
  title: 'Chương kiểm thử',
  description: 'CRUD chương',
  position: 1,
  status: 'published',
});

const lesson = await dbService.createLesson({
  module_id: module.id,
  lesson_key: 'TEST-LESSON-01',
  title: 'Bài học kiểm thử',
  badge: 'Test',
  focus_skill: 'Kiểm thử CRUD',
  scenario: 'Một tình huống kiểm thử.',
  task_goal: 'Lưu được nội dung bài học.',
  concept_title: 'Khái niệm',
  concept_content: 'Nội dung khái niệm.',
  system_instruction: 'Không bịa dữ liệu.',
  starter_prompt: 'Hãy xử lý tình huống.',
  baseline_prompt: 'Xử lý đi.',
  improved_prompt: 'Hãy xử lý theo cấu trúc.',
  sample_input_context: 'Dữ liệu mẫu.',
  prompt_placeholder: 'Viết prompt...',
  expected_output_format: 'Bảng Markdown.',
  hints: ['Hint 1', 'Hint 2'],
  focus_components: ['role', 'constraint'],
  position: 1,
  status: 'published',
});

await dbService.replaceLessonRubrics(lesson.id, [
  {
    criterion_key: 'accuracy',
    label: 'Độ chính xác',
    description: 'Không sai dữ liệu.',
    max_score: 60,
    position: 1,
  },
  {
    criterion_key: 'format',
    label: 'Định dạng',
    description: 'Đúng bảng Markdown.',
    max_score: 40,
    position: 2,
  },
]);

await dbService.replaceLessonResources(lesson.id, [
  {
    resource_type: 'reference',
    title: 'Đặc tả kiểm thử',
    content: '# Test spec',
    url: null,
    position: 1,
  },
]);

let curriculum = await dbService.getCourseCurriculum(course.id);
assert.equal(curriculum.length, 1);
assert.equal(curriculum[0].lessons.length, 1);
assert.equal(curriculum[0].lessons[0].rubric_criteria.length, 2);
assert.equal(curriculum[0].lessons[0].resources.length, 1);
assert.deepEqual(curriculum[0].lessons[0].hints, ['Hint 1', 'Hint 2']);
const mappedLabs = mapCurriculumToLabs(curriculum);
assert.equal(mappedLabs.length, 1);
assert.equal(mappedLabs[0].id, lesson.id);
assert.deepEqual(mappedLabs[0].focusComponents, ['role', 'constraint']);

await dbService.updateCourseModule(module.id, { status: 'published' });
await dbService.updateLesson(lesson.id, { title: 'Bài học đã cập nhật' });
curriculum = await dbService.getCourseCurriculum(course.id);
assert.equal(curriculum[0].status, 'published');
assert.equal(curriculum[0].lessons[0].title, 'Bài học đã cập nhật');

const specsDir = path.resolve('curriculum-specs');
const specFiles = (await readdir(specsDir)).filter((name) => /^LAB_\d+_.+\.md$/i.test(name)).sort();
assert.equal(specFiles.length, 8, 'Curriculum must contain exactly eight LAB specs');

const migration = await readFile(path.resolve('supabase/migrations/005_seed_curriculum_specs.sql'), 'utf8');
assert.equal((migration.match(/INSERT INTO public\.lessons \(/g) || []).length, 8);
assert.equal((migration.match(/INSERT INTO public\.lesson_rubric_criteria \(/g) || []).length, 32);
assert.equal((migration.match(/INSERT INTO public\.lesson_resources \(/g) || []).length, 8);

for (const specFile of specFiles) {
  const spec = await readFile(path.join(specsDir, specFile), 'utf8');
  const lessonKey = spec.match(/\*\*Mã bài lab:\*\*\s*`([^`]+)`/)?.[1];
  assert.ok(lessonKey, `${specFile} must declare a lesson key`);
  assert.ok(migration.includes(lessonKey), `${lessonKey} must be present in migration 005`);
}

await dbService.deleteLesson(lesson.id);
assert.equal((await dbService.getCourseCurriculum(course.id))[0].lessons.length, 0);
await dbService.deleteCourseModule(module.id);
assert.equal((await dbService.getCourseCurriculum(course.id)).length, 0);

console.log('✓ Course/module/lesson CRUD works in local fallback');
console.log('✓ Rubric/resource replacement and cascades work');
console.log('✓ Migration 005 contains 8 lessons, 32 rubrics and 8 source resources');
console.log('=== COURSE CURRICULUM TEST PASSED ===');
