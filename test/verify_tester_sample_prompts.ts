import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mapCurriculumToLabs } from '../src/services/curriculumAdapter';

const migration = await readFile('supabase/migrations/009_fill_tester_sample_prompts.sql', 'utf8');
const lessonKeys = [
  'TESTER-ZERO-SHOT',
  'TESTER-ONE-SHOT',
  'TESTER-FEW-SHOT',
  'TESTER-STRUCTURED-REASONING',
  'TESTER-CONSTRAINTS-OUTPUT',
  'TESTER-GROUNDED-PROMPTING',
];

for (const lessonKey of lessonKeys) {
  assert.ok(migration.includes(`WHEN '${lessonKey}'`), `Missing sample prompt for ${lessonKey}`);
}
assert.ok(migration.includes("module.course_id = '92000000-0000-4000-8000-000000000001'"));
assert.ok(!migration.includes('AGRI-'), 'Tester migration must not modify Agribank lessons');
assert.match(migration, /Bạn là trợ lý truyền thông nội bộ/);
assert.match(migration, /"sentiment": "mixed"/);
assert.match(migration, /Output: account_access/);
assert.match(migration, /1\. Dữ kiện/);
assert.match(migration, /Bullet 3: Deadline/);
assert.match(migration, /Không đủ thông tin trong tài liệu được cung cấp/);

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
