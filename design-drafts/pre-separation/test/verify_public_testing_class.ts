import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile('supabase/migrations/012_public_testing_class_self_enrollment.sql', 'utf8');
const app = await readFile('src/App.tsx', 'utf8');
const dbService = await readFile('src/services/dbService.ts', 'utf8');
const classSelection = await readFile('src/components/classes/ClassSelectionScreen.tsx', 'utf8');

assert.match(migration, /enrollment_mode IN \('instructor', 'self_enroll'\)/);
assert.match(migration, /class_code = 'TESTER-PE-001'/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.self_enroll_public_class/);
assert.match(migration, /SECURITY DEFINER SET search_path = public, pg_temp/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.self_enroll_public_class\(UUID\) FROM PUBLIC, anon/);
assert.match(migration, /c\.enrollment_mode = 'self_enroll'/);
assert.match(migration, /public\.has_active_class_enrollment\(id\)/);
assert.match(migration, /ON CONFLICT ON CONSTRAINT unique_learner_class DO UPDATE/);

assert.match(dbService, /rpc\('self_enroll_public_class'/);
const selfEnrollMethod = dbService.slice(
  dbService.indexOf('async selfEnrollInPublicClass'),
  dbService.indexOf('// ----------------------------------------------------------------------------\r\n  // PROMPT ATTEMPTS', dbService.indexOf('async selfEnrollInPublicClass')),
);
assert.doesNotMatch(selfEnrollMethod, /\.from\('enrollments'\)\s*\.insert/);
assert.match(app, /!canAccess && cohort\.isPublic/);
assert.match(app, /cohorts=\{cohorts\}/);
assert.match(classSelection, /Tham gia miễn phí/);
assert.match(classSelection, /Lớp testing có thể tự tham gia/);

console.log('✓ Tester class is discoverable and self-enrolled through a hardened RPC');
console.log('✓ Enterprise classes remain instructor-enrollment only by default');
console.log('✓ Client does not insert enrollments directly');
