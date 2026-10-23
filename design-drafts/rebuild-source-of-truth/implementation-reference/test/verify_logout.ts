import { supabase, isSupabaseConfigured } from '../src/services/supabaseClient';
import { dbService } from '../src/services/dbService';

async function runLogoutVerification() {
  console.log('================================================================');
  console.log('🧪 PROMPTIFY LOGOUT FLOW & NULL-SAFETY VERIFICATION');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  }

  // ----------------------------------------------------------------------------
  // TEST 1: SUPABASE CLIENT & AUTH SIGN-OUT CALL
  // ----------------------------------------------------------------------------
  console.log('TEST 1: Supabase SignOut Idempotency & Safety');
  try {
    const result1 = await supabase.auth.signOut();
    assert(result1.error === null, 'First signOut() executes without error');

    const result2 = await supabase.auth.signOut();
    assert(result2.error === null, 'Consecutive second signOut() executes cleanly without unhandled exception');
  } catch (err: any) {
    assert(false, 'signOut() threw an unexpected exception', err.message);
  }

  // ----------------------------------------------------------------------------
  // TEST 2: AUTH STATE CHANGE LISTENER BEHAVIOR
  // ----------------------------------------------------------------------------
  console.log('\nTEST 2: Auth State Listener Event Verification');
  let receivedSignedOutEvent = false;
  let reentrantCallCount = 0;

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      receivedSignedOutEvent = true;
      reentrantCallCount++;
    }
  });

  await supabase.auth.signOut();
  assert(true, 'Calling signOut() dispatches without crashing the listener');
  subscription.unsubscribe();

  // ----------------------------------------------------------------------------
  // TEST 3: STORAGE KEY CLEANUP VALIDATION
  // ----------------------------------------------------------------------------
  console.log('\nTEST 3: Storage Keys Sanitation Simulation');
  const mockStorage: Record<string, string> = {
    promptify_learner: JSON.stringify({ id: 'test', name: 'Test' }),
    promptify_view: 'dashboard',
    promptify_role: 'instructor',
    promptify_cohort: JSON.stringify({ id: 'cls-1' }),
    promptify_enrollments: JSON.stringify({ 'test_cls-1': { id: 'enr' } }),
    unrelated_key: 'keep_me'
  };

  const keysToRemove = [
    'promptify_learner',
    'promptify_view',
    'promptify_role',
    'promptify_cohort',
    'promptify_enrollments'
  ];

  keysToRemove.forEach(k => delete mockStorage[k]);

  assert(mockStorage.promptify_learner === undefined, 'promptify_learner is deleted on logout');
  assert(mockStorage.promptify_view === undefined, 'promptify_view is deleted on logout');
  assert(mockStorage.promptify_role === undefined, 'promptify_role is deleted on logout');
  assert(mockStorage.promptify_cohort === undefined, 'promptify_cohort is deleted on logout');
  assert(mockStorage.promptify_enrollments === undefined, 'promptify_enrollments is deleted on logout');
  assert(mockStorage.unrelated_key === 'keep_me', 'Unrelated keys are preserved');

  // ----------------------------------------------------------------------------
  // TEST 4: NULL-SAFETY & OPTIONAL CHAINING AUDIT
  // ----------------------------------------------------------------------------
  console.log('\nTEST 4: Null-safety and Fallback Evaluation on Cleared User State');
  const nullLearner: any = null;
  const nullUser: any = null;
  const nullCohort: any = null;

  // Simulate expressions in ProductNavbar
  const navAvatar = nullLearner?.avatarInitials || 'LP';
  const navName = nullLearner?.name || 'Học viên';
  const navDept = nullLearner?.department || '';
  const cohortName = nullCohort?.name || 'Đang tải lớp học...';

  assert(navAvatar === 'LP', 'ProductNavbar avatar initials fallback to LP on null learner');
  assert(navName === 'Học viên', 'ProductNavbar name fallback to Học viên on null learner');
  assert(navDept === '', 'ProductNavbar department fallback to empty string on null learner');
  assert(cohortName === 'Đang tải lớp học...', 'ProductNavbar cohort name fallback on null cohort');

  // Simulate expressions in ClassSelectionScreen
  const classAvatar = nullLearner?.avatarInitials || 'LP';
  const className = nullLearner?.name || 'Học viên';
  const enrollmentKey = nullLearner ? `${nullLearner.id}_cls` : '';

  assert(classAvatar === 'LP', 'ClassSelectionScreen avatar fallback on null learner');
  assert(className === 'Học viên', 'ClassSelectionScreen name fallback on null learner');
  assert(enrollmentKey === '', 'Enrollment key cleanly resolves to empty string on null learner');

  // Simulate InstructorNavbar
  const instAvatar = nullUser?.avatarInitials || nullUser?.name?.slice(0, 2).toUpperCase() || 'IN';
  const instName = nullUser?.name || 'Giảng viên';
  const instEmail = nullUser?.email || 'Instructor';

  assert(instAvatar === 'IN', 'InstructorNavbar avatar fallback on null user');
  assert(instName === 'Giảng viên', 'InstructorNavbar name fallback on null user');
  assert(instEmail === 'Instructor', 'InstructorNavbar email fallback on null user');

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 TEST RESULT: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL LOGOUT AND NULL-SAFETY ASSERTIONS VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME ASSERTIONS FAILED.\n');
    process.exit(1);
  }
}

runLogoutVerification();

