import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dbService } from '../src/services/dbService';
import { ApiAccessError, assertAiLessonAccess } from '../src/services/apiAuthorizationService';

console.log('=== TEST: Enrollment-gated Course Access ===');

const enrolledClassId = '44444444-4444-4444-4444-444444444441';
const otherClassId = '44444444-4444-4444-4444-444444444442';

const enrolledUser = await dbService.syncUserFromOAuth({
  email: `enrolled-${Date.now()}@example.com`,
  full_name: 'Test learner',
});
const enrolledUserId = enrolledUser.id;
const firstEnrollment = await dbService.addLearnerToClass(enrolledClassId, {
  email: enrolledUser.email,
  fullName: enrolledUser.full_name,
});
assert.equal(firstEnrollment.success, true);

assert.equal(await dbService.canUserAccessClass(enrolledUserId, enrolledClassId), true);
assert.equal(await dbService.canUserAccessClass(enrolledUserId, otherClassId), false);

const unassigned = await dbService.syncUserFromOAuth({
  email: `unassigned-${Date.now()}@example.com`,
  full_name: 'Learner chưa ghi danh',
});
assert.equal(await dbService.canUserAccessClass(unassigned.id, enrolledClassId), false);
assert.equal(await dbService.getLearnerActiveEnrollment(unassigned.id), null);

const secondEnrollment = await dbService.addLearnerToClass(otherClassId, {
  email: enrolledUser.email,
  fullName: enrolledUser.full_name,
});
assert.equal(secondEnrollment.success, true);
const activeEnrollments = await dbService.getLearnerActiveEnrollments(enrolledUserId);
assert.equal(activeEnrollments.length, 2);
assert.deepEqual(
  new Set(activeEnrollments.map((view) => view.classDetails.id)),
  new Set([enrolledClassId, otherClassId]),
);

await assert.rejects(
  () => assertAiLessonAccess({ classId: enrolledClassId, lessonId: 'lab-1' }),
  (error: unknown) => error instanceof ApiAccessError && error.statusCode === 401,
);

const migration = await readFile('supabase/migrations/006_enforce_course_enrollment_access.sql', 'utf8');
assert.match(migration, /has_active_class_enrollment/);
assert.match(migration, /has_active_course_enrollment/);
assert.match(migration, /lesson_belongs_to_class/);
assert.match(migration, /DROP POLICY IF EXISTS "Classes read active or enrolled or instructor"/);
assert.match(migration, /public\.has_active_class_enrollment\(class_id\)/);

const appSource = await readFile('src/App.tsx', 'utf8');
assert.doesNotMatch(appSource, /Khởi tạo enrollment nếu chưa có/);
assert.match(appSource, /canUserAccessClass/);
assert.match(appSource, /!hasActiveEnrollment/);
assert.match(appSource, /getLearnerActiveEnrollments/);
assert.match(appSource, /promptify_selected_class_id/);

const navbarSource = await readFile('src/components/navigation/ProductNavbar.tsx', 'utf8');
assert.match(navbarSource, /availableCohorts\.map/);
assert.match(navbarSource, /aria-label="(Chọn lớp đang học|Select active class)"/);

console.log('✓ Enrolled learner can access only their assigned class');
console.log('✓ Unassigned learner has no active enrollment or class access');
console.log('✓ AI endpoint authorization rejects missing authentication');
console.log('✓ Migration 006 gates courses, classes, lessons and attempts through enrollment');
console.log('✓ Learner with two active enrollments receives both classes in the class switcher');
console.log('=== ENROLLMENT ACCESS TEST PASSED ===');
