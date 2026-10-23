import { dbService } from '../src/services/dbService';

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 PROMPTIFY MVP VERTICAL SLICE VERIFICATION');
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
  // TEST 1: INSTRUCTOR LOGIN & ROLE ROUTING
  // ----------------------------------------------------------------------------
  console.log('TEST 1: Authentication & Role Routing');
  const instructorSync = await dbService.syncUserFromOAuth({
    email: 'nam.nh@agribank.com.vn',
    full_name: 'Nguyễn Hoàng Nam'
  });
  assert(instructorSync.role === 'instructor', 'Instructor email resolves role=instructor');

  const instructorRole = await dbService.getUserRole('nam.nh@agribank.com.vn');
  assert(instructorRole === 'instructor', 'getUserRole returns instructor from DB');

  // ----------------------------------------------------------------------------
  // TEST 2: LEARNER LOGIN -> RESOLVE USER -> LEARNER_CODE -> ENROLLMENT -> CLASS
  // ----------------------------------------------------------------------------
  console.log('\nTEST 2: Learner Resolution & Class Tracking');
  const learnerSync = await dbService.syncUserFromOAuth({
    email: 'linh.pham@agribank.com.vn',
    full_name: 'Linh Phạm'
  });
  assert(learnerSync.role === 'learner', 'Learner email resolves role=learner');

  const learnerView = await dbService.getLearnerActiveEnrollment(learnerSync.id);
  assert(Boolean(learnerView), 'Learner has active enrollment view in DB');
  assert(learnerView?.learner.learner_code === 'LRN-000001', `Learner ID is LRN-000001 (got ${learnerView?.learner.learner_code})`);
  assert(learnerView?.classDetails.class_code === 'AGRI-COMM-2026-01', `Class Code is AGRI-COMM-2026-01 (got ${learnerView?.classDetails.class_code})`);
  assert(learnerView?.classDetails.client?.name === 'Agribank Việt Nam', `Client is Agribank Việt Nam (got ${learnerView?.classDetails.client?.name})`);
  assert(learnerView?.classDetails.client?.industry === 'Ngân hàng & Tài chính', `Industry is Ngân hàng & Tài chính (got ${learnerView?.classDetails.client?.industry})`);
  assert(learnerView?.classDetails.course?.title.includes('Prompt Engineering'), `Course title linked correctly`);

  // ----------------------------------------------------------------------------
  // TEST 3: COURSE CRUD & ARCHIVE PROTECTION
  // ----------------------------------------------------------------------------
  console.log('\nTEST 3: Course CRUD & In-Use Archive Protection');
  // 3.1 Create course
  const newCourse = await dbService.createCourse({
    title: 'Khóa học AI Thẩm định Tài chính 2026',
    description: 'Thực hành phân tích báo cáo tài chính bằng AI.',
    createdBy: instructorSync.id
  });
  assert(newCourse.title === 'Khóa học AI Thẩm định Tài chính 2026', 'Create Course succeeds');

  // 3.2 Update course
  const updatedCourse = await dbService.updateCourse(newCourse.id, {
    title: 'Khóa học AI Thẩm định Tài chính 2026 (Updated)'
  });
  assert(updatedCourse.title.includes('(Updated)'), 'Update Course succeeds');

  // 3.3 Archive protection on in-use course
  const inUseCourseId = '33333333-3333-3333-3333-333333333331'; // Used by AGRI-COMM-2026-01
  const archiveResult = await dbService.archiveOrDeleteCourse(inUseCourseId);
  assert(archiveResult.action === 'archived', `In-use course is archived instead of deleted (result: ${archiveResult.action})`);
  assert(archiveResult.message.includes('lưu trữ'), `Archive message returned warning to user`);

  // ----------------------------------------------------------------------------
  // TEST 4: LEARNER CRUD IN CLASS & PRESERVATION ON REMOVAL
  // ----------------------------------------------------------------------------
  console.log('\nTEST 4: Learner CRUD & Non-destructive Removal');
  const classId = '44444444-4444-4444-4444-444444444441';
  const addResult = await dbService.addLearnerToClass(classId, {
    fullName: 'Đỗ Thảo Vy',
    email: 'vy.dt@agribank.com.vn'
  });
  assert(addResult.success, 'Add Learner to Class succeeds');
  assert(/^LRN-\d{6}$/.test(addResult.learner.learner_code), `Learner Code follows format LRN-XXXXXX (got: ${addResult.learner.learner_code})`);

  // 4.1 Update learner in class
  await dbService.updateLearnerInClass(addResult.learner.enrollment_id, {
    fullName: 'Đỗ Thảo Vy (Trưởng phòng)'
  });
  const learnersInClass = await dbService.getLearnersInClass(classId);
  const foundLearner = learnersInClass.find(l => l.enrollment_id === addResult.learner.enrollment_id);
  assert(foundLearner?.full_name === 'Đỗ Thảo Vy (Trưởng phòng)', 'Update Learner in Class succeeds');

  // 4.2 Remove learner from class
  await dbService.removeLearnerFromClass(addResult.learner.enrollment_id);
  const learnersAfterRemoval = await dbService.getLearnersInClass(classId);
  const removedLearner = learnersAfterRemoval.find(l => l.enrollment_id === addResult.learner.enrollment_id);
  assert(removedLearner?.enrollment_status === 'removed', `Enrollment status is updated to 'removed' (got: ${removedLearner?.enrollment_status})`);

  // 4.3 Verify User & Learner records are preserved in DB
  const userPreserved = await dbService.getUserByEmail('vy.dt@agribank.com.vn');
  assert(Boolean(userPreserved), 'User record is preserved in database after removal from class');

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 TEST RESULT: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL VERTICAL SLICE ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

