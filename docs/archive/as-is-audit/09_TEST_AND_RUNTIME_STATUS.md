# As-Is Test and Runtime Status

> Audit ngày 2026-10-05 · local `main` · commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Local chậm hơn tracking `origin/main` 4 commit tại thời điểm audit; không fetch/checkout. Đây là trạng thái code và SQL trong repo, không phải chứng nhận DB/deployment production. Không sử dụng Refined BRD hoặc tài liệu future/proposal.

## 1. Môi trường và cách chạy

Windows, bundled Node v24.19.0, dependencies local có sẵn; không npm install. TypeScript `node node_modules/typescript/bin/tsc` và Vite `node node_modules/vite/bin/vite.js build` là hai phần của npm run build. Test bằng `node node_modules/tsx/dist/cli.mjs test/<file>.ts` từng subprocess, cùng cwd repo.

Tiến trình test loại bỏ biến Supabase/provider/staging khỏi inherited env, không load .env; tests gọi dbService dùng memory fallback. Các test tự đọc .env/gọi live provider hoặc ghi staging bị bỏ qua. Test generation_prompt_isolation mock global fetch nên an toàn. Không sửa application/test code, không chạy migrations. Build tạo dist ignored; audit helpers/logs ở tmp.

Build **PASS** (tsc và vite). Lần chạy hoàn tất: **19/22 test scripts PASS, 3 FAIL; 5 SKIPPED**. Exit0 là kết quả script, không là test case count hoặc E2E certificate.

| Command/script | Status | Seconds |
| --- | --- | --- |
| build | PASS | 2.48 |
| vite-build | PASS | 2.64 |
| verify_ai_evaluation_contract.ts | PASS | 0.2 |
| verify_course_curriculum.ts | PASS | 0.22 |
| verify_enrollment_access.ts | FAIL | 0.23 |
| verify_generation_prompt_isolation.ts | PASS | 0.14 |
| verify_highlight.ts | PASS | 0.13 |
| verify_identity_cleanup.ts | PASS | 0.13 |
| verify_interactive_tutorial.ts | PASS | 0.12 |
| verify_learner_home_class_menu.ts | PASS | 0.12 |
| verify_lesson_url_navigation.ts | PASS | 0.12 |
| verify_logout.ts | PASS | 0.24 |
| verify_oauth_enrollment.ts | PASS | 0.21 |
| verify_pedagogical_flow.ts | PASS | 0.15 |
| verify_pii_and_autocompletion.ts | PASS | 0.12 |
| verify_prompt_analyzer.ts | PASS | 0.12 |
| verify_public_testing_class.ts | FAIL | 0.12 |
| verify_real_ai_flow.ts | PASS | 0.21 |
| verify_selective_integration_safety.ts | PASS | 0.13 |
| verify_server_backed_learning_progress.ts | PASS | 0.11 |
| verify_slice.ts | FAIL | 0.25 |
| verify_tab_switch.ts | PASS | 0.16 |
| verify_tester_sample_prompts.ts | PASS | 0.16 |
| verify_tutorial_tester_course.ts | PASS | 0.17 |

## 2. Failure analysis

| Test | Failure | Classification |
| --- | --- | --- |
| verify_public_testing_class.ts | assert `/cohorts={cohorts}/` không khớp App truyền selectableCohorts | Source-text assertion stale; không chứng minh public enrollment functional fail |
| verify_slice.ts | 10/18 assertions pass; role instructor demo và preseed enrollment/branding expected không còn | Fixture/test assumption stale sau bỏ mock identities; code không tự cấp instructor theo email |
| verify_enrollment_access.ts | Lần đầu PASS, lần chạy hoàn tất FAIL line29 true!==false với user chưa assigned | Flaky local identity collision có bằng chứng ID user-Date.now; cần isolated reproduction để xác nhận toàn bộ nguyên nhân, không production RLS failure |

Helper lần đầu bị console cp1252 UnicodeEncodeError khi in lỗi emoji: lỗi môi trường helper, đã đổi UTF-8 và chạy hoàn tất; không tính thành lỗi app. Không sửa test để pass. Re-run dùng cùng source/dependency; khác kết quả access được giữ trong ghi nhận, không lấy lần PASS làm tổng cuối.

## 3. Skipped scripts và lý do

| Script | Lý do |
| --- | --- |
| test_live_gemini.ts | Gọi live endpoint/provider hoặc tự load .env |
| verify_generation_grounding_and_evaluation.ts | Gọi live endpoint/provider hoặc tự load .env |
| verify_live_api_endpoint.ts | Gọi live endpoint/provider hoặc tự load .env |
| verify_live_evaluate_endpoint.ts | Gọi live endpoint/provider hoặc tự load .env |
| verify_progress_migration_staging.ts | Tạo/cập nhật auth users và ghi disposable DB; cần staging config rõ ràng, không chạy production |

## 4. Coverage hiện có

Source assertions: enrollment guards/migrations/RPC usage, OAuth/logout/tab navigation, tutorial elements, curriculum content consistency, template safety. Pure-function tests: structure spans/highlight/status, PII/autocomplete, evaluation JSON contract, URL navigation. Repository tests: curriculum/enrollment CRUD bằng local adapter, không Postgres. Mock provider request isolation: payload OpenAI qua stub fetch, không actual model behavior.

Không có coverage instrumentation/report; không báo % statement/branch. 27 scripts không tương đương suite với 27 cases. `verify_real_ai_flow` tên live nhưng run này dùng no-key validation, source contracts/mock evaluation/local persistence; không gọi model real vì keys bị remove. Một số legacy live scripts chỉ log lỗi hoặc demo token, không assert process thất bại đầy đủ.

## 5. Các vùng chưa được runtime verify

- Real Google OAuth callback/refresh across accounts, browser UI and mobile layout.
- SQL execution/replay tất cả migrations, constraint/grant/catalog hiệu lực, RLS direct probes, RPC concurrency/atomic rollback trên Postgres.
- Public class/nonUUID API access, removed re-enroll/expiration, instructor scope.
- Real generation/evaluation accuracy, timeout/fallback availability, deployment function time limit.
- Save/retry failure state, overlap runs, lesson navigation mid request, library open editor behavior qua browser.
- Production DB migration016/017 applied, deployed commit, actual active/published row counts.

Không có kết luận production PASS dựa local tests. Build strict chỉ include src, API/tests không typecheck gate. Không ghi hoặc sửa logic để làm test pass.

## 6. Exact compact output evidence

### build — exit 0

```text

```

### vite-build — exit 0

```text
vite v6.4.3 building for production...
transforming...
✓ 1992 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     1.00 kB │ gzip:   0.57 kB
dist/assets/index-B1JOdzJb.css     74.71 kB │ gzip:  12.17 kB
dist/assets/index-BvaTpMQ5.js   1,295.95 kB │ gzip: 346.60 kB
✓ built in 2.35s

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

### verify_enrollment_access.ts — exit 1

```text
=== TEST: Enrollment-gated Course Access ===
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

true !== false

    at <anonymous> (C:\Ki_OJT\PromptforNontech\test\verify_enrollment_access.ts:29:8) {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: true,
  expected: false,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v24.19.0
```

### verify_public_testing_class.ts — exit 1

```text
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: The input did not match the regular expression /cohorts=\{cohorts\}/. Input:

"import React, { useState, useEffect } from 'react';\r\n" +
  'import {\r\n' +
  '  UIMode,\r\n' +
  '  AppView,\r\n' +
  '  ClassCohort,\r\n' +
  '  Learner,\r\n' +
  
[omitted assertion dump of complete App source]
ge.setItem('promptify_lesson_mode', preferredLessonMode);\r\n" +
    '  }, [preferredLessonMode]);\r\n' +
    '\r\n' +
    '  // Persist storage\r\n' +
    '  useEffect(() => {\r\n' +
    '    if (currentLearner) {\r\n' +
    '  '... 29559 more characters,
  expected: /cohorts=\{cohorts\}/,
  operator: 'match',
  diff: 'simple'
}

Node.js v24.19.0
```

### verify_slice.ts — exit 1

```text
================================================================
🚀 PROMPTIFY MVP VERTICAL SLICE VERIFICATION
================================================================

TEST 1: Authentication & Role Routing

TEST 2: Learner Resolution & Class Tracking
  ✅ [PASS] Learner email resolves role=learner

TEST 3: Course CRUD & In-Use Archive Protection
  ✅ [PASS] Create Course succeeds
  ✅ [PASS] Update Course succeeds
  ✅ [PASS] In-use course is archived instead of deleted (result: archived)
  ✅ [PASS] Archive message returned warning to user

TEST 4: Learner CRUD & Non-destructive Removal
  ✅ [PASS] Add Learner to Class succeeds
  ✅ [PASS] Learner Code follows format LRN-XXXXXX (got: LRN-000002)
  ✅ [PASS] Update Learner in Class succeeds
  ✅ [PASS] Enrollment status is updated to 'removed' (got: removed)
  ✅ [PASS] User record is preserved in database after removal from class

================================================================
📊 TEST RESULT: 10/18 Passed (56%)
================================================================

  ❌ [FAIL] Instructor email resolves role=instructor
  ❌ [FAIL] getUserRole returns instructor from DB
  ❌ [FAIL] Learner has active enrollment view in DB
  ❌ [FAIL] Learner ID is LRN-000001 (got undefined)
  ❌ [FAIL] Class Code is AGRI-COMM-2026-01 (got undefined)
  ❌ [FAIL] Client is Agribank Việt Nam (got undefined)
  ❌ [FAIL] Industry is Ngân hàng & Tài chính (got undefined)
  ❌ [FAIL] Course title linked correctly
❌ SOME TESTS FAILED.
```
