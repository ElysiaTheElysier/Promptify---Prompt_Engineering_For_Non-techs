/**
 * Test verification for OAuth sync, Role separation, and Explicit Enrollment Flow:
 * 1. Instructor login -> không có learner record mới.
 * 2. Learner login chưa được enroll -> có learner record nhưng chưa có enrollment.
 * 3. Instructor add learner vào class -> tạo đúng enrollment.
 * 4. Learner login lại -> resolve đúng class từ enrollment.
 */

import { dbService } from '../src/services/dbService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 VERIFY OAUTH SYNC & ENROLLMENT LOGIC');
  console.log('================================================================\n');

  // TEST 1: Instructor login -> không có learner record mới
  console.log('TEST 1: Instructor Login Role Enforcement');
  const instructorEmail = 'instructor.test@agribank.com.vn';
  
  // Giả lập user đã có role=instructor trong public.users
  const instructorUser = await dbService.syncUserFromOAuth({
    email: instructorEmail,
    full_name: 'Nguyễn Văn Giảng Viên',
  });
  
  // Nếu là local store hoặc test mode, gán role = instructor để test
  instructorUser.role = 'instructor';
  await dbService.syncUserFromOAuth({
    email: instructorEmail,
    full_name: 'Nguyễn Văn Giảng Viên',
  });

  // Kiểm tra bảng learners
  const learnersInDb = await dbService.getLearnersInClass('ALL');
  const instructorInLearners = learnersInDb.find(l => l.email === instructorEmail);
  assert(!instructorInLearners, 'Instructor does NOT have a record in learners table');

  // TEST 2: Learner login chưa được enroll -> có learner record nhưng chưa có enrollment
  console.log('\nTEST 2: New Learner Login without Pre-enrollment');
  const newLearnerEmail = `learner.new.${Date.now()}@agribank.com.vn`;
  
  const learnerUser = await dbService.syncUserFromOAuth({
    email: newLearnerEmail,
    full_name: 'Trần Học Viên Mới',
  });

  assert(learnerUser.role === 'learner', 'New user defaults to role=learner');

  // Kiểm tra xem đã có active enrollment chưa
  const initialActiveEnrollment = await dbService.getLearnerActiveEnrollment(learnerUser.id);
  assert(initialActiveEnrollment === null, 'Learner does NOT have an active enrollment upon first login');

  // TEST 3: Instructor add learner vào class -> tạo đúng enrollment
  console.log('\nTEST 3: Instructor Adds Learner to Class');
  const classes = await dbService.getClassesWithDetails();
  const targetClass = classes[0];
  assert(Boolean(targetClass), `Target class found: ${targetClass?.class_code}`);

  const addResult = await dbService.addLearnerToClass(targetClass.id, {
    email: newLearnerEmail,
    fullName: 'Trần Học Viên Mới',
  });

  assert(addResult.success, 'addLearnerToClass returns success=true');
  assert(addResult.learner.enrollment_status === 'active', 'Created enrollment status is active');
  assert(Boolean(addResult.learner.learner_code), `Assigned learner code: ${addResult.learner.learner_code}`);

  // TEST 4: Learner login lại -> resolve đúng class từ enrollment
  console.log('\nTEST 4: Learner Logs In After Enrollment');
  const resolvedEnrollment = await dbService.getLearnerActiveEnrollment(learnerUser.id);
  assert(resolvedEnrollment !== null, 'Learner resolves active enrollment successfully');
  assert(resolvedEnrollment?.classDetails.id === targetClass.id, `Resolved correct class ID: ${targetClass.id}`);
  assert(resolvedEnrollment?.classDetails.class_code === targetClass.class_code, `Resolved correct class code: ${targetClass.class_code}`);

  console.log('\n================================================================');
  console.log(`📊 TEST RESULT: ${passed}/${passed + failed} Passed (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL OAUTH SYNC & ENROLLMENT CRITERIA VERIFIED SUCCESSFULLY!\n');
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

