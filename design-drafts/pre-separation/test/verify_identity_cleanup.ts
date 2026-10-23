import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const landing = await readFile('src/components/auth/LandingLoginScreen.tsx', 'utf8');
const navbar = await readFile('src/components/navigation/ProductNavbar.tsx', 'utf8');
const classSelection = await readFile('src/components/classes/ClassSelectionScreen.tsx', 'utf8');
const learnerHome = await readFile('src/components/dashboard/LearnerHome.tsx', 'utf8');
const migration = await readFile('supabase/migrations/015_remove_seed_mock_users.sql', 'utf8');

assert.doesNotMatch(landing, /DEMO_LEARNERS|handleDemoAccountLogin|handleCustomEmailSubmit/);
assert.doesNotMatch(navbar, /learner\?\.department|onOpenTutorial/);
assert.match(navbar, /onClick=\{\(\) => onNavigate\('dashboard'\)\}/);
assert.doesNotMatch(classSelection, /cohort\.classCode|cohort\.organization|cohort\.department/);
assert.doesNotMatch(learnerHome, /cohort\.classCode|cohort\.organization|cohort\.department/);
assert.match(migration, /auth_provider_id IS NULL/);

console.log('Identity cleanup and learner navigation verification passed.');
