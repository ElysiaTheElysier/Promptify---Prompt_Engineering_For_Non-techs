import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AiServerError, handleGenerateRequest } from '../src/services/apiServerService';

const tutorialMigration = await readFile('supabase/migrations/007_user_tutorial_progress.sql', 'utf8');
assert.match(tutorialMigration, /PRIMARY KEY \(user_id, tutorial_key\)/);
assert.match(tutorialMigration, /user_id = public\.current_user_id\(\)/);
assert.match(tutorialMigration, /FOR SELECT TO authenticated/);
assert.match(tutorialMigration, /FOR INSERT TO authenticated/);
assert.match(tutorialMigration, /FOR UPDATE TO authenticated/);

const appSource = await readFile('src/App.tsx', 'utf8');
const instructorSource = await readFile('src/components/instructor/InstructorViewShell.tsx', 'utf8');
assert.ok(appSource.includes("hasCompletedTutorial(currentUser.id, 'lesson_workspace')"));
assert.ok(appSource.includes("completeTutorial(currentUser.id, 'lesson_workspace')"));
assert.ok(!appSource.includes('promptify_tutorial_completed'));
assert.ok(instructorSource.includes('hasCompletedTutorial'));
assert.ok(instructorSource.includes('completeTutorial'));

const testerMigration = await readFile('supabase/migrations/008_seed_tester_course.sql', 'utf8');
assert.ok(testerMigration.includes('TESTER-PE-001'));
assert.ok(testerMigration.includes('Prompt Engineering Fundamentals — Tester'));
assert.equal((testerMigration.match(/'TESTER-(?:ZERO-SHOT|ONE-SHOT|FEW-SHOT|STRUCTURED-REASONING|CONSTRAINTS-OUTPUT|GROUNDED-PROMPTING)'/g) || []).length, 6);
assert.ok(testerMigration.includes("publication_status = 'published'"));
assert.ok(!/INSERT INTO public\.enrollments/i.test(testerMigration), 'Tester seed must not auto-enroll users');
assert.ok(testerMigration.includes("20::numeric max_score"));
assert.ok(testerMigration.includes("UNION ALL SELECT lesson_id, 'business_usability'"));

const oldGeminiKey = process.env.GEMINI_API_KEY;
const oldGoogleKey = process.env.GOOGLE_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_API_KEY;
try {
  await assert.rejects(
    () => handleGenerateRequest({ prompt: 'hello' }),
    (error: unknown) => error instanceof AiServerError && error.statusCode === 503,
  );
  await assert.rejects(
    () => handleGenerateRequest({ prompt: '   ' }),
    (error: unknown) => error instanceof AiServerError && error.statusCode === 400,
  );
} finally {
  if (oldGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = oldGeminiKey;
  if (oldGoogleKey === undefined) delete process.env.GOOGLE_API_KEY;
  else process.env.GOOGLE_API_KEY = oldGoogleKey;
}

console.log('Tutorial persistence, Tester seed, and AI server error verification passed.');
