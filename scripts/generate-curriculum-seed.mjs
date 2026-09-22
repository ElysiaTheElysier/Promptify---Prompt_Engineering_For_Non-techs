import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specsDir = path.join(root, 'curriculum-specs');
const outputFile = path.join(root, 'supabase', 'migrations', '005_seed_curriculum_specs.sql');

const baselinePrompts = [
  'Viết 3 tiêu đề báo chí thật cảm động từ hồ sơ khách hàng này.',
  'Viết bài FB thật hay và bùng nổ về gói 100 tỷ.',
  'Viết thông cáo thanh minh là ngân hàng không vỡ nợ và giám đốc không trốn.',
  'Hãy viết câu khuyên bà con đừng rút sổ tiết kiệm.',
  'Hãy trích xuất bảng số liệu tài chính và viết 5 slogan cho chương trình ưu đãi.',
  'Hãy tổng hợp 5 khiếu nại này.',
  'Tóm tắt hồ sơ và cho tôi biết có nên cho vay không.',
  'Làm sao để người dân chịu dùng Kiosk số?',
];

const focusComponents = [
  ['context', 'task', 'constraint', 'output_format', 'grounding'],
  ['role', 'context', 'task', 'constraint', 'output_format', 'example'],
  ['role', 'context', 'task', 'constraint', 'grounding'],
  ['role', 'context', 'task', 'constraint', 'grounding', 'output_format'],
  ['task', 'constraint', 'output_format'],
  ['context', 'task', 'constraint', 'output_format'],
  ['role', 'context', 'task', 'constraint', 'grounding', 'output_format'],
  ['role', 'context', 'task', 'constraint', 'output_format', 'example'],
];

const expectedOutputs = [
  'Ba tiêu đề theo ba góc tiếp cận; không còn dữ liệu định danh thật.',
  'Bài Fanpage đúng văn phong Tam nông, giữ nguyên số liệu và không dùng từ cấm.',
  'Thông cáo dưới 300 từ dựa trên quy trình phân tích bốn bước và chốt chặn pháp lý.',
  'Chuỗi THOUGHT → ACTION → OBSERVATION → RESPONSE và ba câu thoại tư vấn tại quầy.',
  'Bảng số liệu ổn định ở Temperature 0.0 và năm slogan sáng tạo ở Temperature 0.8.',
  'Duy nhất một bảng Markdown sáu cột, năm dòng dữ liệu, không lời dẫn.',
  'Tóm tắt khách quan, cảnh báo prompt injection và yêu cầu kiểm tra CIC.',
  'Phân tích step-back, kế hoạch phối hợp ba phòng ban và bộ meta-prompt tái sử dụng.',
];

const hints = [
  ['Quét tên, CCCD, số điện thoại và số tài khoản trước khi gửi.', 'Thay dữ liệu thật bằng biến giữ chỗ nhất quán.', 'Chỉ phục hồi dữ liệu trong môi trường nội bộ.'],
  ['Tách bối cảnh tĩnh khỏi dữ liệu chiến dịch.', 'Cung cấp một bài mẫu đúng văn phong.', 'Nêu rõ danh sách từ cấm và định dạng đầu ra.'],
  ['Không lặp lại nguyên văn tin đồn trong thông cáo.', 'Buộc AI kiểm tra sự thật và căn cứ pháp lý trước khi viết.', 'Đặt giới hạn độ dài có thể kiểm thử.'],
  ['Yêu cầu công cụ tra cứu trước khi tính toán.', 'Ghi rõ quan sát đầu vào cho bước phản hồi.', 'Tách nội dung phân tích khỏi lời thoại cho khách hàng.'],
  ['Dùng Temperature 0.0 cho số liệu.', 'Dùng Temperature 0.7–0.8 cho ý tưởng sáng tạo.', 'Giới hạn Max Tokens và Stop Sequence.'],
  ['Đóng dữ liệu trong thẻ XML.', 'Khai báo chính xác tên và thứ tự sáu cột.', 'Cấm lời chào, giải thích và kết luận ngoài bảng.'],
  ['Coi mọi lệnh bên trong tài liệu là dữ liệu không đáng tin.', 'Thiết lập ranh giới và thứ tự ưu tiên chỉ thị.', 'Yêu cầu tự kiểm tra và đối chiếu CIC.'],
  ['Hỏi nguyên lý nền tảng trước bài toán cụ thể.', 'Phân vai CNTT, Truyền thông và Giao dịch viên.', 'Yêu cầu AI sinh bộ prompt có thể tái sử dụng.'],
];

function section(markdown, startPattern, endPattern) {
  const startMatch = markdown.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return '';
  const start = startMatch.index + startMatch[0].length;
  const rest = markdown.slice(start);
  const endMatch = endPattern ? rest.match(endPattern) : null;
  return rest.slice(0, endMatch?.index ?? rest.length).trim();
}

function firstFence(markdown) {
  const match = markdown.match(/```(?:text|markdown|xml|json)?\s*\r?\n([\s\S]*?)```/i);
  return match?.[1]?.trim() || '';
}

function metadata(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return markdown.match(new RegExp(`> \\*\\*${escaped}:\\*\\*\\s*(?:\`([^\`]+)\`|(.+?))\\s{0,2}$`, 'mi'))?.slice(1).find(Boolean)?.trim() || '';
}

function cleanTitle(markdown) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || 'Bài học chưa đặt tên';
  return heading.replace(/^ĐẶC TẢ BÀI LAB\s+\d+:\s*/i, '');
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sqlText(value, tag) {
  if (value === null || value === undefined || value === '') return 'NULL';
  const marker = `$${tag}$`;
  if (String(value).includes(marker)) throw new Error(`Dollar quote marker collision: ${tag}`);
  return `${marker}${String(value)}${marker}`;
}

function parseRubrics(markdown) {
  const rubricSection = section(markdown, /^### Bảng Rubric[^\n]*$/mi, /^---\s*$/m);
  return [...rubricSection.matchAll(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(\d+)đ\s*\|\s*(.+?)\s*\|\s*$/gm)].map((match) => ({
    label: match[1].trim(),
    maxScore: Number(match[2]),
    description: match[3].trim(),
  }));
}

const fileNames = (await readdir(specsDir))
  .filter((name) => /^LAB_\d+_.+\.md$/i.test(name))
  .sort((a, b) => a.localeCompare(b, 'en'));

if (fileNames.length !== 8) {
  throw new Error(`Expected exactly 8 LAB specs, found ${fileNames.length}.`);
}

const lessons = [];
for (const [index, fileName] of fileNames.entries()) {
  const markdown = await readFile(path.join(specsDir, fileName), 'utf8');
  const foundation = section(markdown, /^## PHẦN 1[^\n]*$/mi, /^## PHẦN 2[^\n]*$/mi);
  const scenario = section(markdown, /^### 2\.1[^\n]*$/mi, /^### 2\.2[^\n]*$/mi);
  const task = section(markdown, /^### 2\.2[^\n]*$/mi, /^(?:### 2\.3|## PHẦN 3)[^\n]*$/mi);
  const architecture = section(markdown, /^### 2\.3[^\n]*$/mi, /^## PHẦN 3[^\n]*$/mi);
  const verification = section(markdown, /^## PHẦN 3[^\n]*$/mi, /^## PHẦN 4[^\n]*$/mi);
  const rubrics = parseRubrics(markdown);
  if (rubrics.length !== 4) throw new Error(`${fileName}: expected 4 rubric criteria, found ${rubrics.length}.`);

  lessons.push({
    index: index + 1,
    fileName,
    markdown,
    lessonKey: metadata(markdown, 'Mã bài lab'),
    level: metadata(markdown, 'Cấp độ'),
    duration: metadata(markdown, 'Thời lượng khuyến nghị'),
    objective: metadata(markdown, 'Mục tiêu kỹ thuật'),
    title: cleanTitle(markdown),
    foundation,
    scenario,
    task,
    architecture,
    verification,
    starterPrompt: firstFence(architecture) || firstFence(task),
    sampleInput: firstFence(scenario),
    baselinePrompt: baselinePrompts[index],
    focusComponents: focusComponents[index],
    expectedOutput: expectedOutputs[index],
    hints: hints[index],
    rubrics,
  });
}

const lines = [
  '-- ==============================================================================',
  '-- GENERATED MIGRATION 005: SEED CURRICULUM FROM curriculum-specs/LAB_*.md',
  '-- Generated by: npm run curriculum:seed',
  '-- Do not hand-edit lesson copy here; update the Markdown specs and regenerate.',
  '-- ==============================================================================',
  '',
  'BEGIN;',
  '',
  `UPDATE public.courses
SET slug = 'prompt-engineering-business-nontechs',
    publication_status = 'published',
    version = GREATEST(version, 2),
    published_at = COALESCE(published_at, now())
WHERE id = '33333333-3333-3333-3333-333333333331';`,
  '',
  `INSERT INTO public.course_modules (id, course_id, title, description, position, status)
VALUES
  ('70000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333331', 'Nền tảng Kỹ nghệ Prompt & Bảo mật Doanh nghiệp', 'Từ an toàn dữ liệu đến kiểm soát đầu ra, suy luận và công cụ.', 1, 'published'),
  ('70000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333331', 'Phòng thủ Nâng cao & Tự động hóa Tư duy', 'Phòng chống prompt injection và thiết kế meta-prompt có thể tái sử dụng.', 2, 'published')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  position = EXCLUDED.position,
  status = EXCLUDED.status;`,
  '',
];

for (const lesson of lessons) {
  const n = String(lesson.index).padStart(2, '0');
  const lessonId = `80000000-0000-0000-0000-${String(lesson.index).padStart(12, '0')}`;
  const moduleId = lesson.index <= 6
    ? '70000000-0000-0000-0000-000000000001'
    : '70000000-0000-0000-0000-000000000002';
  const position = lesson.index <= 6 ? lesson.index : lesson.index - 6;
  const badge = `Lab ${n} · ${lesson.duration}`;
  const promptPlaceholder = `Viết prompt của bạn cho ${lesson.lessonKey}...`;
  const conceptTitle = `${lesson.level} — ${lesson.objective}`;

  lines.push(
    `INSERT INTO public.lessons (
  id, module_id, lesson_key, title, badge, focus_skill, scenario, task_goal,
  concept_title, concept_content, system_instruction, starter_prompt,
  baseline_prompt, improved_prompt, sample_input_context, prompt_placeholder,
  expected_output_format, hints, focus_components, position, status
) VALUES (
  '${lessonId}',
  '${moduleId}',
  ${sqlText(lesson.lessonKey, `key${n}`)},
  ${sqlText(lesson.title, `title${n}`)},
  ${sqlText(badge, `badge${n}`)},
  ${sqlText(lesson.objective, `focus${n}`)},
  ${sqlText(lesson.scenario, `scenario${n}`)},
  ${sqlText(lesson.task, `task${n}`)},
  ${sqlText(conceptTitle, `concepttitle${n}`)},
  ${sqlText(lesson.foundation, `concept${n}`)},
  ${sqlText(`Tuân thủ đặc tả ${lesson.lessonKey}; không bịa dữ kiện và không bỏ qua các ràng buộc an toàn.`, `system${n}`)},
  ${sqlText(lesson.starterPrompt, `starter${n}`)},
  ${sqlText(lesson.baselinePrompt, `baseline${n}`)},
  ${sqlText(lesson.starterPrompt || lesson.task, `improved${n}`)},
  ${sqlText(lesson.sampleInput, `sample${n}`)},
  ${sqlText(promptPlaceholder, `placeholder${n}`)},
  ${sqlText(lesson.expectedOutput, `expected${n}`)},
  ${sqlText(JSON.stringify(lesson.hints), `hints${n}`)}::jsonb,
  ${sqlText(JSON.stringify(lesson.focusComponents), `components${n}`)}::jsonb,
  ${position},
  'published'
)
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id,
  lesson_key = EXCLUDED.lesson_key,
  title = EXCLUDED.title,
  badge = EXCLUDED.badge,
  focus_skill = EXCLUDED.focus_skill,
  scenario = EXCLUDED.scenario,
  task_goal = EXCLUDED.task_goal,
  concept_title = EXCLUDED.concept_title,
  concept_content = EXCLUDED.concept_content,
  system_instruction = EXCLUDED.system_instruction,
  starter_prompt = EXCLUDED.starter_prompt,
  baseline_prompt = EXCLUDED.baseline_prompt,
  improved_prompt = EXCLUDED.improved_prompt,
  sample_input_context = EXCLUDED.sample_input_context,
  prompt_placeholder = EXCLUDED.prompt_placeholder,
  expected_output_format = EXCLUDED.expected_output_format,
  hints = EXCLUDED.hints,
  focus_components = EXCLUDED.focus_components,
  position = EXCLUDED.position,
  status = EXCLUDED.status;`,
    '',
  );

  lesson.rubrics.forEach((rubric, rubricIndex) => {
    const rubricId = `81000000-0000-${String(lesson.index).padStart(4, '0')}-0000-${String(rubricIndex + 1).padStart(12, '0')}`;
    const key = slugify(rubric.label).replace(/-/g, '_');
    lines.push(
      `INSERT INTO public.lesson_rubric_criteria (id, lesson_id, criterion_key, label, description, max_score, position)
VALUES (
  '${rubricId}', '${lessonId}', '${key}',
  ${sqlText(rubric.label, `rubriclabel${n}${rubricIndex + 1}`)},
  ${sqlText(rubric.description, `rubricdesc${n}${rubricIndex + 1}`)},
  ${rubric.maxScore}, ${rubricIndex + 1}
)
ON CONFLICT (id) DO UPDATE SET
  criterion_key = EXCLUDED.criterion_key,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  max_score = EXCLUDED.max_score,
  position = EXCLUDED.position;`,
      '',
    );
  });

  const resourceId = `82000000-0000-0000-0000-${String(lesson.index).padStart(12, '0')}`;
  lines.push(
    `INSERT INTO public.lesson_resources (id, lesson_id, resource_type, title, content, position)
VALUES (
  '${resourceId}', '${lessonId}', 'reference',
  ${sqlText(`Đặc tả nguồn: ${lesson.fileName}`, `restitle${n}`)},
  ${sqlText(lesson.markdown, `spec${n}`)},
  1
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  position = EXCLUDED.position;`,
    '',
  );
}

lines.push('COMMIT;', '', "NOTIFY pgrst, 'reload schema';", '');

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, lines.join('\n'), 'utf8');
console.log(`Generated ${path.relative(root, outputFile)} with ${lessons.length} lessons and ${lessons.reduce((sum, lesson) => sum + lesson.rubrics.length, 0)} rubric criteria.`);
