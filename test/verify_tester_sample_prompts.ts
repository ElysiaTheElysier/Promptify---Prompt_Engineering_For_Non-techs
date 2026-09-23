import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mapCurriculumToLabs } from '../src/services/curriculumAdapter';

const migration = await readFile('supabase/migrations/013_align_tester_solution_prompts.sql', 'utf8');
const lessonKeys = [
  'TESTER-ZERO-SHOT',
  'TESTER-ONE-SHOT',
  'TESTER-FEW-SHOT',
  'TESTER-STRUCTURED-REASONING',
  'TESTER-CONSTRAINTS-OUTPUT',
  'TESTER-GROUNDED-PROMPTING',
];

for (const lessonKey of lessonKeys) {
  assert.ok(migration.includes(`'${lessonKey}'`), `Missing corrected sample prompt for ${lessonKey}`);
}
assert.ok(migration.includes("module.course_id = '92000000-0000-4000-8000-000000000001'"));
assert.ok(!migration.includes('AGRI-'), 'Tester migration must not modify Agribank lessons');

const promptBlocks = [...migration.matchAll(/\(\s*'(TESTER-[A-Z-]+)',\s*\$prompt\$([\s\S]*?)\$prompt\$\s*\)/g)];
assert.equal(promptBlocks.length, lessonKeys.length, 'Every Tester lesson must have exactly one corrected prompt');
const promptByKey = new Map(promptBlocks.map((match) => [match[1], match[2].trim()]));
assert.equal(new Set(promptByKey.values()).size, lessonKeys.length, 'Tester solution prompts must be unique');

assert.match(promptByKey.get('TESTER-ZERO-SHOT') || '', /dự án Orion/);
assert.match(promptByKey.get('TESTER-ZERO-SHOT') || '', /09:00 thứ Sáu/);
assert.doesNotMatch(promptByKey.get('TESTER-ZERO-SHOT') || '', /đào tạo AI ngày mai/);

assert.match(promptByKey.get('TESTER-ONE-SHOT') || '', /API xong, chờ QA thứ Ba/);
assert.match(promptByKey.get('TESTER-ONE-SHOT') || '', /UI dashboard 80%, review sáng mai/);
assert.doesNotMatch(promptByKey.get('TESTER-ONE-SHOT') || '', /sentiment/);

assert.match(promptByKey.get('TESTER-FEW-SHOT') || '', /Rất dễ dùng/);
assert.match(promptByKey.get('TESTER-FEW-SHOT') || '', /Chức năng tốt nhưng tải hơi chậm/);
assert.match(promptByKey.get('TESTER-FEW-SHOT') || '', /Không tạo nhãn mới/);

assert.match(promptByKey.get('TESTER-STRUCTURED-REASONING') || '', /Phương án A: 2 tuần, 4 người, chi phí 80 triệu/);
assert.match(promptByKey.get('TESTER-STRUCTURED-REASONING') || '', /Phương án B: 3 tuần, 2 người, chi phí 55 triệu/);

assert.match(promptByKey.get('TESTER-CONSTRAINTS-OUTPUT') || '', /Release 2\.4/);
assert.match(promptByKey.get('TESTER-CONSTRAINTS-OUTPUT') || '', /đúng 3 bullet Markdown/);
assert.match(promptByKey.get('TESTER-CONSTRAINTS-OUTPUT') || '', /Không suy diễn.*mobile/);

assert.match(promptByKey.get('TESTER-GROUNDED-PROMPTING') || '', /làm việc từ xa tối đa 2 ngày/);
assert.match(promptByKey.get('TESTER-GROUNDED-PROMPTING') || '', /làm từ nước ngoài 10 ngày/);
assert.match(promptByKey.get('TESTER-GROUNDED-PROMPTING') || '', /Không đủ thông tin trong nguồn/);

const mapped = mapCurriculumToLabs([{
  id: 'module',
  course_id: 'course',
  title: 'Module',
  description: null,
  position: 1,
  status: 'published',
  lessons: [{
    id: 'lesson',
    module_id: 'module',
    lesson_key: 'TESTER-MISSING-SAMPLE',
    title: 'Missing sample',
    badge: null,
    focus_skill: null,
    scenario: null,
    task_goal: null,
    concept_title: null,
    concept_content: null,
    system_instruction: null,
    starter_prompt: 'This scaffold must not become the sample.',
    baseline_prompt: null,
    improved_prompt: null,
    sample_input_context: null,
    prompt_placeholder: null,
    expected_output_format: null,
    hints: [],
    focus_components: [],
    position: 1,
    status: 'published',
    rubric_criteria: [],
    resources: [],
  }],
}] as never);
assert.equal(mapped[0].improvedPrompt, '', 'Missing improved_prompt must not fall back to starter_prompt');

const composer = await readFile('src/components/prompt/PromptComposer.tsx', 'utf8');
assert.ok(composer.includes('Prompt mẫu tham khảo'));
assert.ok(composer.includes('Đây là một cách làm tốt, không phải đáp án duy nhất.'));
assert.ok(composer.includes('Lesson này chưa có prompt mẫu.'));
assert.ok(!composer.includes('onChange(samplePrompt)'), 'Viewing a sample must not overwrite the learner draft');

console.log('Tester sample prompt mapping and UI verification passed.');
