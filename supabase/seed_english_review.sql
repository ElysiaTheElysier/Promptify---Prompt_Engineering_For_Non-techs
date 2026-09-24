-- ==============================================================================
-- PROMPTIFY ENGLISH REVIEW SEED SCRIPT (IDEMPOTENT & NON-DESTRUCTIVE)
-- Course: Prompt Engineering Fundamentals — English Review
-- Class:  PROMPTIFY-EN-REVIEW (self_enroll enabled)
-- ==============================================================================

BEGIN;

-- 1. CLIENT (1 row)
INSERT INTO public.clients (id, name, industry)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'Promptify Internal / Reviewer',
  'Technology / Executive Review'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry;

-- 2. COURSE (1 row)
INSERT INTO public.courses (
  id, title, description, status, created_by, slug, publication_status, version, published_at
) VALUES (
  'a2000000-0000-4000-8000-000000000001',
  'Prompt Engineering Fundamentals — English Review',
  'Hands-on prompting curriculum for business and non-technical professionals: zero-shot clarity, few-shot patterns, verifiable reasoning, constraints, and grounded outputs.',
  'active',
  NULL,
  'prompt-engineering-fundamentals-en-review',
  'published',
  1,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = 'active',
  slug = EXCLUDED.slug,
  publication_status = 'published',
  published_at = COALESCE(public.courses.published_at, now());

-- 3. CLASS (1 row, self_enroll mode enabled)
INSERT INTO public.classes (
  id, class_code, course_id, client_id, department, start_date, end_date, status, enrollment_mode
) VALUES (
  'a3000000-0000-4000-8000-000000000001',
  'PROMPTIFY-EN-REVIEW',
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Executive Review & Evaluation',
  now() - interval '1 day',
  now() + interval '365 days',
  'active',
  'self_enroll'
)
ON CONFLICT (id) DO UPDATE SET
  class_code = EXCLUDED.class_code,
  course_id = EXCLUDED.course_id,
  client_id = EXCLUDED.client_id,
  department = EXCLUDED.department,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  status = 'active',
  enrollment_mode = 'self_enroll';

-- 4. COURSE MODULES (2 rows)
INSERT INTO public.course_modules (id, course_id, title, description, position, status)
VALUES
  ('a4000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Prompting Foundations', 'Master zero-shot clarity, one-shot patterns, and few-shot consistency.', 1, 'published'),
  ('a4000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 'Reasoning & Reliable Outputs', 'Verifiable reasoning, strict constraints, and source-grounded outputs.', 2, 'published')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  position = EXCLUDED.position,
  status = 'published';

-- 5. LESSONS (6 rows)
INSERT INTO public.lessons (
  id, module_id, lesson_key, title, badge, focus_skill, scenario, task_goal,
  concept_title, concept_content, system_instruction, starter_prompt, baseline_prompt,
  improved_prompt, sample_input_context, prompt_placeholder, expected_output_format,
  hints, focus_components, position, status
) VALUES
(
  'a5000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'TESTER-EN-ZERO-SHOT',
  'Lesson 1: Zero-shot Prompting', 'Lab 1 · Zero-shot', 'Task · Context · Output Format',
  'You need to draft a professional meeting confirmation email for the Orion Project implementation team based on project logistics.',
  'Write an effective zero-shot prompt specifying the recipient, purpose, meeting details, and a concise email structure without relying on sample examples.',
  'Goal-Oriented Zero-Shot Prompting', 'Zero-shot prompting works effectively when your task, context, and expected output format are clearly defined. You do not need to provide few-shot examples when the requirements, tone, and constraints are explicit.',
  'You are an executive business assistant. Only use facts provided in the prompt; do not invent meeting rooms, dates, or unauthorized commitments. Respond in English.',
  'Draft a project meeting confirmation email based on the following details:\n\n[Insert context details here]',
  'Write an email for me.',
  'Role: Project Coordinator.\nContext: Orion Project meeting details provided below.\nTask: Draft a concise confirmation email requesting attendance RSVP by Thursday 5:00 PM.\nConstraints: Professional tone, under 120 words.\nFormat: Subject line followed by body.',
  'Orion Project kick-off meeting: Friday at 09:00 AM, Conference Room A3. Recipient: Implementation Core Team. RSVP deadline: Thursday by 5:00 PM.',
  'Write your zero-shot prompt here... Specify role, context, task, and formatting rules.',
  'Subject line and email body under 120 words with clear RSVP deadline.',
  '["Include all key logistics from the source", "Specify word count limits and structural format"]'::jsonb,
  '["task","context","output_format"]'::jsonb, 1, 'published'
),
(
  'a5000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000001', 'TESTER-EN-ONE-SHOT',
  'Lesson 2: One-shot Prompting', 'Lab 2 · One-shot', 'Example · Task · Output Format',
  'You have an established pattern for converting messy engineering notes into concise executive progress updates. You need to process a new note using the exact same pattern.',
  'Write a prompt containing exactly one concise input/output demonstration example, then instruct the model to transform new notes into the identical pipe-separated format.',
  'Pattern Transfer Through a Single Demonstration', 'When natural language descriptions fail to capture subtle formatting nuances, providing a single high-quality example (One-shot) allows the model to mirror your exact structure and field names.',
  'Transform input notes into structured updates following the demonstrated pattern. Preserve all facts and dates without hallucinating work status. Respond in English.',
  'Example Input: "API completed, awaiting QA on Tuesday"\nExample Output: Item: API | Status: Development Complete | Next Step: QA on Tuesday\n\nNew Input: [Insert notes here]\nOutput:',
  'Rewrite this note.',
  'Transform raw developer notes into structured status updates following this demonstration:\n\nExample:\nInput: "API completed, awaiting QA on Tuesday"\nOutput: Item: API | Status: Development Complete | Next Step: QA on Tuesday\n\nTask: Process this new input using the exact same pipe-delimited format.\nNew Input: "UI dashboard 80%, review tomorrow morning."\nOutput:',
  'Raw Note: "UI dashboard 80%, review scheduled for tomorrow morning."',
  'Write your one-shot prompt here with an example...',
  'A single line formatted as: Item | Status | Next Step.',
  '["Clearly demarcate example inputs and outputs", "Separate the demonstration from the live input to process"]'::jsonb,
  '["example","task","output_format"]'::jsonb, 2, 'published'
),
(
  'a5000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000001', 'TESTER-EN-FEW-SHOT',
  'Lesson 3: Few-shot Prompting', 'Lab 3 · Few-shot', 'Examples · Pattern · Constraint',
  'Customer support receives diverse feedback messages. You must classify incoming comments into standardized sentiment categories based on three representative examples.',
  'Write a few-shot prompt using 2–3 brief examples to consistently classify new feedback into Positive, Neutral, or Negative with a short rationale.',
  'Few-shot Pattern Reinforcement and Classification', 'Few-shot prompting clarifies subtle classification boundaries. By demonstrating edge cases across multiple examples, you prevent ambiguous label hallucinations.',
  'Classify customer feedback strictly into Positive, Neutral, or Negative. Adhere strictly to the demonstrated pattern. Respond in English.',
  'Classify customer feedback into Positive, Neutral, or Negative based on these examples:\n\nExample 1: "Smooth onboarding experience" -> Positive\nExample 2: "Service is adequate" -> Neutral\nExample 3: "Repeated timeout errors" -> Negative\n\nNew input: [Add customer feedback here]\nOutput:',
  'Classify this feedback.',
  'Review the following customer feedback categorization examples:\n\nInput: "Very intuitive UI" -> Positive | Clear workflow navigation\nInput: "Standard functionality" -> Neutral | Meets baseline expectations\nInput: "Encountered login failure" -> Negative | Service interruption\n\nTask: Classify this new input into Positive, Neutral, or Negative.\nConstraint: Do not create new categories.\nInput: "Feature is useful, but page load times are somewhat sluggish."\nOutput:',
  'Customer comment: "The feature is useful, but page load times are somewhat sluggish."',
  'Write your few-shot prompt with 2-3 examples and strict categories...',
  'A category label followed by a single explanatory sentence under 15 words.',
  '["Provide examples covering all valid labels", "Explicitly forbid inventing new category labels"]'::jsonb,
  '["example","task","constraint"]'::jsonb, 3, 'published'
),
(
  'a5000000-0000-4000-8000-000000000004', 'a4000000-0000-4000-8000-000000000002', 'TESTER-EN-STRUCTURED-REASONING',
  'Lesson 4: Structured Reasoning', 'Lab 4 · Reasoning', 'Task · Evidence · Output Format',
  'You must evaluate and compare two project rollout proposals given conflicting budget and deadline constraints, producing an auditable decision.',
  'Instruct the AI to present the explicit facts, stated assumptions, validation checks, and final recommendation. Do not request hidden internal chain-of-thought.',
  'Auditable Business Reasoning', 'Business reasoning requires visible, step-by-step auditability. Request explicit sections for Facts, Assumptions, Checks, and Conclusion rather than unconstrained inner thoughts.',
  'Analyze the provided proposals systematically. Provide verifiable arguments based only on given data. Respond in English.',
  'Compare the two project proposals based on budget and timeline constraints:\n\n[Insert options here]\n\nStructure:\n1. Key Facts\n2. Assumptions\n3. Trade-off Analysis\n4. Recommendation',
  'Think carefully and choose the best option.',
  'Analyze the project deployment proposals using a structured four-stage evaluation:\n1. Facts: Extract timeline, staffing, and costs for Option A and B.\n2. Assumptions: Clarify team availability and budget weighting.\n3. Checks: Verify against the 4-week maximum hard deadline.\n4. Recommendation: Provide final selection in 3 sentences maximum.',
  'Option A: 2 weeks duration, 4 engineers, $8,000 cost. Option B: 3 weeks duration, 2 engineers, $5,500 cost. Priority: Budget-conscious, but delivery deadline is strictly 4 weeks maximum.',
  'Write a prompt requiring structured evaluation (Facts, Assumptions, Checks, Recommendation)...',
  'Four numbered sections; recommendation under 3 sentences.',
  '["Request visible assumptions and factual evidence", "Do not ask for hidden internal thoughts"]'::jsonb,
  '["task","grounding","output_format"]'::jsonb, 1, 'published'
),
(
  'a5000000-0000-4000-8000-000000000005', 'a4000000-0000-4000-8000-000000000002', 'TESTER-EN-CONSTRAINTS-OUTPUT',
  'Lesson 5: Constraints & Structured Output', 'Lab 5 · Constraints', 'Constraints · Output Format · Task',
  'You need to generate an executive release bulletin from engineering change logs, adhering to strict length caps and negative constraints.',
  'Write a prompt enforcing exactly three bullet points, a maximum of 60 words total, and a negative constraint forbidding speculation on unmentioned platforms.',
  'Measurable Constraints and Negative Boundaries', 'Effective enterprise prompts define measurable boundaries: word counts, bullet counts, and explicit negative constraints (do not include X) to guarantee deterministic outputs.',
  'Summarize the changelog strictly within the requested bullet count and word limits. Do not extrapolate beyond provided text. Respond in English.',
  'Summarize the release log according to these strict rules:\n- Exactly 3 bullet points\n- Maximum 60 words total\n- Do not mention mobile or unverified platforms\n\nChangelog:\n[Insert changelog]',
  'Summarize this release note.',
  'Summarize the software release changelog for leadership:\nConstraints:\n1. Exactly 3 Markdown bullet points.\n2. Maximum 60 words total across all bullets.\n3. Negative constraint: Do not speculate or make claims regarding mobile support.\nFormat: Plain Markdown bullet list only.',
  'Release 2.4: Added CSV export feature, resolved report generation timeout error, scheduled deployment for September 30th. No updates provided for mobile client.',
  'Write your prompt specifying exact bullet counts, word limit, and negative constraints...',
  'Exactly 3 Markdown bullets, 60 words maximum total.',
  '["Make every constraint objectively verifiable", "Include an explicit negative constraint forbidding extrapolation"]'::jsonb,
  '["constraint","output_format","task"]'::jsonb, 2, 'published'
),
(
  'a5000000-0000-4000-8000-000000000006', 'a4000000-0000-4000-8000-000000000002', 'TESTER-EN-GROUNDED-PROMPTING',
  'Lesson 6: Grounded Prompting', 'Lab 6 · Grounding', 'Context · Evidence · Task',
  'An employee asks a policy question regarding remote work. You must answer strictly from the employee handbook excerpt and declare insufficient information if the policy is silent.',
  'Write a grounded prompt requiring direct source citation and a strict refusal branch (Insufficient information in source) when evidence is missing.',
  'Source Grounding and Hallucination Prevention', 'Grounding ties AI responses directly to reference text. Providing an explicit fallback directive for missing facts prevents the model from making dangerous, fabricated assumptions.',
  'Answer only using facts in the provided source text. If the source does not contain sufficient evidence, state Insufficient information in source. Respond in English.',
  'Answer the employee inquiry strictly based on the provided policy snippet:\n\nSOURCE:\n[Insert policy excerpt]\n\nQUESTION:\n[Insert inquiry]\n\nRules: If the source does not answer the question, reply: "Insufficient information in source".',
  'Please answer this employee question.',
  'You are a corporate HR compliance assistant.\nInstructions:\n1. Answer the question using ONLY the provided SOURCE text.\n2. Include a direct evidence citation from the text.\n3. If the evidence is missing or ambiguous, output: "Insufficient information in source." Do not extrapolate.\n\nSOURCE: Full-time employees may work remotely up to 2 days per week upon direct manager approval. The policy does not specify provisions for international travel.\nQUESTION: May I work remotely from overseas for 10 consecutive days?',
  'SOURCE: Full-time employees may work remotely up to 2 days per week upon direct manager approval. The policy does not specify provisions for international travel.\nQUESTION: May I work remotely from overseas for 10 consecutive days?',
  'Write a grounded prompt citing source facts and requiring explicit fallback if missing...',
  'Three distinct sections: Conclusion, Evidence Citation, and Missing Information.',
  '["Forbid using outside knowledge", "Provide an explicit refusal trigger for unaddressed topics"]'::jsonb,
  '["context","grounding","task"]'::jsonb, 3, 'published'
)
ON CONFLICT (id) DO UPDATE SET
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
  status = 'published';

-- 6. RUBRIC CRITERIA (30 rows, 5 per lesson)
WITH lesson_special(lesson_id, criterion_key, label, description) AS (VALUES
  ('a5000000-0000-4000-8000-000000000001'::uuid, 'zero_shot_clarity', 'Zero-shot Clarity', 'Task, context, and format are clear and executable without few-shot examples.'),
  ('a5000000-0000-4000-8000-000000000002'::uuid, 'example_usage', 'Example Quality', 'A single clear demonstration effectively transfers the desired schema to new input.'),
  ('a5000000-0000-4000-8000-000000000003'::uuid, 'pattern_consistency', 'Pattern Consistency', 'Examples and target classifications strictly adhere to the defined category labels.'),
  ('a5000000-0000-4000-8000-000000000004'::uuid, 'verifiable_reasoning', 'Verifiable Reasoning', 'Clearly articulates facts, assumptions, and checks without requesting hidden chain-of-thought.'),
  ('a5000000-0000-4000-8000-000000000005'::uuid, 'constraint_precision', 'Constraint Precision', 'Strictly enforces bullet limits, word count caps, and negative platform boundaries.'),
  ('a5000000-0000-4000-8000-000000000006'::uuid, 'groundedness', 'Source Grounding', 'Avoids unverified outside claims and properly triggers insufficient information fallback.')
), criteria AS (
  SELECT lesson_id, criterion_key, label, description, 20::numeric max_score, 1 position FROM lesson_special
  UNION ALL SELECT lesson_id, 'task_completion', 'Task Completion', 'Fully addresses the specific business task instructions.', 20, 2 FROM lesson_special
  UNION ALL SELECT lesson_id, 'context_usage', 'Context Usage', 'Accurately integrates the provided source details and constraints.', 20, 3 FROM lesson_special
  UNION ALL SELECT lesson_id, 'format_adherence', 'Format Adherence', 'Output precisely conforms to the designated structure and length limits.', 20, 4 FROM lesson_special
  UNION ALL SELECT lesson_id, 'business_usability', 'Business Usability', 'Produces clear, practical, and executive-ready communication.', 20, 5 FROM lesson_special
)
INSERT INTO public.lesson_rubric_criteria (lesson_id, criterion_key, label, description, max_score, position)
SELECT lesson_id, criterion_key, label, description, max_score, position FROM criteria
ON CONFLICT (lesson_id, criterion_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  max_score = EXCLUDED.max_score,
  position = EXCLUDED.position;

-- 7. LESSON RESOURCES (6 rows)
INSERT INTO public.lesson_resources (lesson_id, resource_type, title, content, position)
SELECT id, 'data', 'Exercise Context Data', sample_input_context, 1
FROM public.lessons WHERE id BETWEEN 'a5000000-0000-4000-8000-000000000001' AND 'a5000000-0000-4000-8000-000000000006'
ON CONFLICT (lesson_id, position) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  resource_type = EXCLUDED.resource_type;

COMMIT;
NOTIFY pgrst, 'reload schema';
