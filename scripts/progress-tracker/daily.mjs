import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const root=fileURLToPath(new URL('../../', import.meta.url));
const out=root+'/outputs/progress-tracker';
const filename=out+'/Promptify_Intrepid_Progress_06-23_Oct_2026.xlsx';
const wb=Workbook.create();
const sh=Object.fromEntries(['Tổng quan','Công việc','Theo ngày','Rủi ro & Quyết định','Nghiệm thu Pilot'].map(n=>[n,wb.worksheets.add(n)]));
const overview=sh['Tổng quan'],tasks=sh['Công việc'],daily=sh['Theo ngày'],risk=sh['Rủi ro & Quyết định'],pilot=sh['Nghiệm thu Pilot'];
const d=n=>new Date(Date.UTC(2026,9,n));
const weekdays=['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];
const baseline={
 PLAN:['CÓ: 4 active docs; chưa xác nhận capacity/owner pilot.','docs/00_PRODUCT_SOURCE_OF_TRUTH.md; docs/03_DECISION_LOG.md'],
 ENV:['CÓ: Vite/Vercel + Supabase config; UNKNOWN deployed revision/DB runtime.','vite.config.ts; vercel.json; src/services/supabaseClient.ts'],
 SSO:['CÓ: Google OAuth Supabase; chưa có Intrepid domain/roster gate.','src/components/auth/LandingLoginScreen.tsx:31; src/App.tsx'],
 ACCESS:['CÓ MỘT PHẦN: JWT/RLS enrollment; instructor global; non-UUID API bypass sau class check.','src/services/apiAuthorizationService.ts:55; supabase/migrations/004_course_content_management.sql'],
 SHEET:['CHƯA CÓ: connector/parser roster thực thi; ExpirationBanner chỉ setTimeout mô phỏng Sync.','src/components/common/ExpirationBanner.tsx:25; src/services/dbService.ts'],
 PROFILE:['CÓ: users/learners và auth link; chưa có Sheet match/confirm department-country.','src/services/dbService.ts; src/types/database.ts; src/App.tsx'],
 CONTENT:['CÓ: Course→Module→Lesson/rubric/resources; resources text/URL, App có fallback seed.','src/components/instructor/CourseCurriculumEditor.tsx; src/services/curriculumAdapter.ts; src/App.tsx:181'],
 AI:['CÓ: server generate/evaluate OpenAI/Gemini; GCP Intrepid runtime chưa xác nhận.','src/services/apiServerService.ts; api/generate.ts; api/evaluate.ts'],
 EVAL:['CÓ MỘT PHẦN: Judge contract, client gửi context/score; SQL missing-key NULL gap.','src/services/aiEvaluationContract.ts; src/components/hybrid/HybridView.tsx:578; supabase/migrations/016_add_server_backed_lesson_progress.sql:37'],
 PROGRESS:['CÓ: RPC attempt/progress; client gửi output/score; cần live DB verification.','src/services/dbService.ts:1275; supabase/migrations/016_add_server_backed_lesson_progress.sql'],
 COMPARE:['CÓ: Hybrid versions/ABCompareModal; có demo và run-state overlap cần kiểm.','src/components/hybrid/HybridView.tsx; src/components/common/ABCompareModal.tsx'],
 TRAINER:['CÓ: curriculum/enrollment CRUD, DB snapshot; replace resources/rubric nhiều request.','src/components/instructor/InstructorViewShell.tsx:180; src/components/instructor/CourseCurriculumEditor.tsx:269'],
 HEAD:['CHƯA CÓ: Head own-department scope; shell instructor tải các class toàn quyền.','src/components/instructor/InstructorViewShell.tsx:180; src/services/dbService.ts'],
 I18N:['CÓ MỘT PHẦN: UI chủ yếu VI; chưa có i18n runtime hoàn chỉnh.','src/App.tsx; src/components/hybrid/HybridView.tsx; package.json'],
 CACHE:['CÓ: history/library/assistance localStorage chung; chưa shared library DB.','src/App.tsx:133; src/services/businessEvaluationService.ts:252; src/components/hybrid/HybridView.tsx:301'],
 QA:['CÓ: contract/source tests; build TS chỉ include src; UNKNOWN E2E/RLS/AI runtime pilot.','test/verify_server_backed_learning_progress.ts; test/verify_enrollment_access.ts; tsconfig.json'],
 PILOT:['UNKNOWN — cần runtime verification; chưa có evidence nghiệm thu pilot.','docs/02_IMPLEMENTATION_PLAN.md:97; docs/03_DECISION_LOG.md'],
 LIB:['CÓ MỘT PHẦN: library browser-local; không có department sharing/persistence.','src/services/businessEvaluationService.ts:252; src/components/library/PromptLibraryView.tsx']
};
const rows=[];
// Owner assignments and durations below are proposals for the named small team.
function add(day,items){items.forEach((a,index)=>{const [module,title,cls,pri,owner,input,hours,deps,dod,evidence,decision]=a;rows.push({id:`T${String(day).padStart(2,'0')}${index+1}`,day,module,title,cls,pri,owner,input,hours,deps,dod,evidence,decision});});}
add(6,[
 ['PLAN','Chốt scope pilot, owner và capacity 4 ngày cuối tuần','HUMAN INPUT','P0','Thầy Đức','Dương',2,'','Given lịch 06–23/10; When review capacity; Then có owner, số user/departments và xác nhận 10/11/17/18 đủ người hoặc replan.','Approval note / calendar','D35/D36'],
 ['SHEET','Cấp quyền Sheet/tab roster và mẫu 4 cột','HUMAN INPUT','P0','Intrepid IT / Admin','Thầy Đức',2,'','Given private Sheet; Then Trainer/reader truy cập được và đủ Email/Name/Department/Country, không public dữ liệu.','Sheet link + access confirmation','D24/D33'],
 ['AI','Cấp quyền GCP runtime/credential cho generate và Judge','HUMAN INPUT','P0','Intrepid IT / Admin','Human Review',2,'','Then credential do Intrepid cấp có model/quota/provider được phép; secret không vào browser; cả run và Judge được hỗ trợ.','IT confirmation không chứa secret','D15/D20'],
 ['ENV','Đối chiếu build/DB/RPC và chọn isolation pilot tối thiểu','HUMAN INPUT','P0','Dương','Human Review',2,'','Given current Vite/Supabase; Then chốt môi trường pilot độc lập, deployed revision/DB migration cần kiểm; không đổi stack lớn.','Config review + migration ledger request','D13/D28']
]);
add(7,[
 ['ENV','Thiết lập cấu hình pilot riêng và kiểm RPC compatibility','MODIFY','P0','Dương','Intrepid IT / Admin',2,'T064','Given môi trường được duyệt; Then pilot URL/DB config độc lập, RPC tồn tại; bản hiện tại không bị ghi đè.','Deployed URL + DB query result','D28'],
 ['SSO','Cấu hình callback và Intrepid identity/domain gate','MODIFY','P0','Dương','Intrepid IT / Admin',3,'T061','Given verified SSO; When email ngoài allowlist login; Then server từ chối, không chỉ ẩn UI.','API response + browser recording','D14'],
 ['ACCESS','Siết auth link và cấp Trainer/Head roles tin cậy','MODIFY','P0','Dương','Thầy Đức',3,'T071','Given user verified; Then mapping auth/profile duy nhất; client không tự set role; Head không được role instructor global.','DB query + negative test output','D23'],
 ['AI','Smoke-test generate/Judge bằng credential GCP được duyệt','REUSE','P0','Intrepid IT / Admin','Dương',2,'T063','When gọi test hợp lệ; Then provider trả output và Judge contract; ghi model/latency không log credential.','API response / sanitized log','D15']
]);
add(8,[
 ['SSO','Kiểm login/logout/refresh và chặn email ngoài Intrepid','REUSE','P0','QA / Agent','Dương',2,'T072,T073','Given learner và outside account; Then learner giữ session hợp lệ; outside bị chặn; logout không giữ quyền.','Browser recording + API tests','D14'],
 ['ACCESS','Chốt department/country mapping và correction/revoke policy','HUMAN INPUT','P0','Human Review','Thầy Đức',2,'T061','Then mã department/country nhất quán; sửa profile không tự tăng quyền; Trainer có cách disable rõ.','Approval note + mapping sample','D23'],
 ['SHEET','Chọn private Sync now hoặc Sheet-export CSV fallback','HUMAN INPUT','P0','Dương + Thầy Đức','Intrepid IT / Admin',2,'T062','Given quyền Sheet; Then chọn một đường đọc private hoặc authorized export, không worker/cron; không lấy roster từ nguồn khác.','Decision approval + Sheet sample','D33'],
 ['ACCESS','Bịt non-UUID/public lesson bypass và kiểm gate API','MODIFY','P0','Dương','Human Review',3,'T073,T082','Given lesson absent/non-UUID/outside enrollment; When gọi AI; Then bị từ chối trước provider, không dùng public metadata làm quyền.','Negative API test output','D26']
]);
add(9,[
 ['SHEET','Parse và map bốn cột bắt buộc, giữ Unicode tên','NEW','P0','Dương','Thầy Đức',2,'T083,T082','Given Sheet/export; Then map đúng Email/Full Name/Department/Country; trim/lowercase email, giữ tên Unicode.','Parser tests + mapping output','D24/D33'],
 ['SHEET','Validate missing field, duplicate email và department/country sai','NEW','P0','Dương','Department Head / PIC',3,'T091','Given 10 row hợp lệ + 2 row lỗi; Then preview chỉ rõ 10 hợp lệ/2 lỗi với row/reason; chưa ghi DB; sửa lỗi rồi mới apply whole batch.','Test output + preview screenshot','D23/D33'],
 ['CONTENT','Duyệt lesson pilot, SOP và sample data được phép','HUMAN INPUT','P0','Thầy Đức','Department Head / PIC',2,'T061','Then có một scenario/SOP reference/sample data đã duyệt privacy và rubric feedback; chưa giả định xử lý toàn bộ 550 SOP.','Lesson sample + approval note','D18/D19/D25']
]);
add(10,[
 ['SHEET','Nối đường đọc Sheet đã chọn vào explicit Import/Sync','NEW','P0','Dương','Intrepid IT / Admin',3,'T091','Given Trainer và nguồn đã chỉ định; Then đọc được private Sheet hoặc authorized export; user learner không gọi Sync được.','API response + Sheet/browser recording','D33'],
 ['SHEET','Upsert validated roster/snapshot vào DB theo email','NEW','P0','Dương','Human Review',3,'T092,T101,T071','Given batch hết lỗi; Then apply atomic/idempotent theo email, không tự cấp roles từ Sheet, chưa xóa historical progress.','DB query before/after + test output','D23/D33'],
 ['SHEET','Hiển thị batch summary, timestamp và row failures','NEW','P1','Dương','Thầy Đức',2,'T102','Then UI/log có batch ID/create/update/unchanged/errors và last success, không log secret/full PII.','Screenshot + sanitized batch log','D33']
]);
add(11,[
 ['SHEET','Test sync lặp, malformed batch và lỗi Sheet/API','NEW','P0','QA / Agent','Dương',2,'T102,T103','When sync twice/error; Then không duplicate, whole invalid batch không apply, last good snapshot còn, không success giả.','DB query + negative tests','D33'],
 ['PROFILE','Match verified login với roster đã import','NEW','P0','Dương','Human Review',3,'T102,T072,T073','Given đúng email/roster; Then map duy nhất tới learner/membership; email không có roster không được zone.','DB query + browser/API tests','D23/D24'],
 ['PROFILE','Làm profile confirmation và correction không tăng quyền','NEW','P0','Dương','Thầy Đức',3,'T112,T082','When confirm; Then giữ đúng name/email/function/country; correction department chờ duyệt, không mở quyền mới.','Screenshot + negative API test','D23']
]);
add(12,[
 ['PROFILE','Route zone và assigned cohort đúng department/country','MODIFY','P0','Dương','Thầy Đức',3,'T113,T111','When learner confirm; Then tới zone và cohort/course được gán đúng; chưa confirm không mở bài.','Browser recording + DB membership','D03/D23'],
 ['ACCESS','Enforce department trên data/API read-write và Head scope','REBUILD','P0','Dương','Human Review',3,'T121,T084','Given Department A/B; Then user/Head A không đọc hay viết lesson/data B bằng direct API/DB; Trainer đúng phạm vi được duyệt.','RLS/API negative test results','D23/D26'],
 ['ACCESS','Nghiệm thu M2 Sheet→profile→zone và isolation A/B','REUSE','P0','QA / Agent','Dương + Thầy Đức',2,'T122','Then demo Sheet update/import, profile, đúng zone; bypass direct query A→B bị chặn; malformed roster báo lỗi.','M2 browser recording + security tests','D24/D35']
]);
add(13,[
 ['CONTENT','Giữ course/module/lesson chain và tạo assigned pilot lesson','REUSE','P0','Dương','Thầy Đức',2,'T123,T093','Given approved content; Then course/module/lesson published đúng class assignment và canonical UUID.','DB query + lesson screenshot','D04'],
 ['CONTENT','Bind scenario/SOP/sample data và chặn fallback course khác','MODIFY','P0','Dương','Department Head / PIC',2,'T131','When curriculum load lỗi; Then báo lỗi, không mount generic seed khác course; bài có đúng reference/sample.','Lesson screenshot + failure test','D18/D25'],
 ['AI','Nối real generation với canonical context và auth gate','MODIFY','P0','Dương','Intrepid IT / Admin',4,'T132,T074,T084','Given authorized learner; Then prompt gọi Intrepid provider trả output thật; client không đổi context vượt lesson quyền.','Live API response + browser recording','D15/D26']
]);
add(14,[
 ['EVAL','Nối Judge feedback theo rubric pilot đã duyệt','REUSE','P0','Dương','Thầy Đức',2,'T133,T093','Then Judge trả scores/strengths/improvements/nextHint hợp lệ; empty/bad JSON báo lỗi thay score giả.','Contract test + real feedback screenshot','D19'],
 ['EVAL','Siết provenance output/evaluation ở write boundary','REBUILD','P0','Dương','Human Review',4,'T141','Given forged client output/10 score; Then API/RPC không ghi như server-verified assessment; cơ chế nhỏ đã được review.','Forgery negative test + API/DB result','D26'],
 ['EVAL','Xử lý missing-key NULL semantics của SQL validator','MODIFY','P0','Dương','Human Review',2,'T142','Given missing scores/key/total; Then không góp best_score; JSON contract đầy đủ vẫn hợp lệ trên disposable DB.','Disposable SQL test output','D26']
]);
add(15,[
 ['PROGRESS','Nối verified attempt và progress qua atomic RPC','MODIFY','P0','Dương','Human Review',3,'T143','When persist valid run; Then một attempt + progress cùng transaction; lỗi trigger rollback; lesson UUID đúng.','RPC response + DB query','D26'],
 ['PROGRESS','Sửa retry/save state và kết quả không persist thành công giả','MODIFY','P0','Dương','Human Review',3,'T151','When save/evaluate fail rồi retry; Then state lỗi rõ, retry đúng attempt, không duplicate hay UI/DB score lệch.','Failure/retry browser recording','D26'],
 ['PROGRESS','Test forged score, removed access và atomic save fail','REUSE','P0','QA / Agent','Dương',2,'T152','Then forged input/removed membership bị chặn; lỗi DB không làm completed giả; valid run lưu được.','Negative API/RPC test report','D26']
]);
add(16,[
 ['COMPARE','Compare hai persisted attempts và restore prompt','MODIFY','P0','Dương','Thầy Đức',3,'T153','Given hai run thật; Then compare đúng prompt/output/feedback từng ID, không dùng reference demo như actual.','Browser recording + attempt IDs','D35'],
 ['COMPARE','Chặn overlap run và response lạc bài khi điều hướng','MODIFY','P0','Dương','Human Review',3,'T161','When double-run/navigate lúc pending; Then output/evaluation/save gắn đúng lesson/attempt, không overwrite nhầm.','Async/race test output','D26'],
 ['PROGRESS','Test refresh/relogin và learner E2E M3','REUSE','P0','QA / Agent','Dương + Thầy Đức',2,'T162','Then Sheet learner học, run/feedback/rerun/compare; reload vẫn đọc attempts/progress đúng; other-account không thấy data.','M3 recording + DB query','D35']
]);
add(17,[
 ['TRAINER','Reuse department/cohort/learner listing cho Trainer','MODIFY','P0','Dương','Thầy Đức',2,'T123,T163','Then Trainer login xem đúng departments/cohort/learner roster; không cần dashboard analytics nâng cao.','Trainer listing screenshot','D02'],
 ['TRAINER','Reuse editor tạo/sửa module/lesson và bind nguồn','MODIFY','P0','Dương','Thầy Đức',3,'T171,T132','Then Đức tạo/sửa ít nhất course/module/lesson; SOP/sample/rubric đúng; update lỗi không mất nội dung cũ.','Editor recording + DB query','D04'],
 ['TRAINER','Publish/assign lesson và kiểm learner nhận phiên bản mới','MODIFY','P0','Dương','Thầy Đức',2,'T172','When publish; Then learner assigned thấy đúng bản; draft/outside department không truy cập được.','Publish recording + learner screenshot','D04']
]);
add(18,[
 ['HEAD','Tạo Head read-only query scope theo membership','NEW','P0','Dương','Human Review',3,'T122,T163','Then Head query chỉ learners/progress department mình; không dùng instructor global; server/RLS enforce.','API/DB query + role policy tests','D23'],
 ['HEAD','Nối Head login/view basic learners-progress','NEW','P0','Dương','Department Head / PIC',2,'T181','Given Head A; Then login mở list learner/progress A, không sửa course/role ngoài quyền.','Head browser recording','D35'],
 ['HEAD','Test Head A không đọc/sửa B bằng direct request','REUSE','P0','QA / Agent','Dương',2,'T182','When request learner/progress/course B; Then bị từ chối không trả row; own A vẫn xem được.','Negative API/RLS report','D23']
]);
add(19,[
 ['TRAINER','Hiển thị basic progress và completed-run semantics','MODIFY','P0','Dương','Thầy Đức',3,'T173,T163','Then Trainer/Head thấy count/last run/completion đúng DB; không gọi completed là mastery đạt chuẩn.','DB reconciliation + screenshot','D19/D22'],
 ['I18N','EN/VI thiết yếu cho login/roster/practice/error paths','MODIFY','P1','Dương','Thầy Đức',2,'T173,T182','Then hai ngôn ngữ đọc được pilot flow; không missing key; chưa polish toàn app/ngôn ngữ khác.','EN/VI screenshots','D08/D27'],
 ['CACHE','Scope hoặc vô hiệu cache nhạy cảm dùng chung account','MODIFY','P0','Dương','Human Review',2,'T163,T183','When logout/login account B cùng browser; Then không thấy cached prompt/output/history/assistance A.','Browser two-account recording','D25/D26']
]);
add(20,[
 ['PILOT','Demo đủ learner/Trainer/Head trên pilot environment','REUSE','P0','Dương + Thầy Đức','Department Head / PIC',2,'T191,T192,T193','Then ba vai trò chạy real flow; lỗi còn lại có owner, evidence và cách reproduce, không mock.','Full M4 demo recording','D35'],
 ['QA','Review input bounds/basic AI usage và secrets','MODIFY','P1','Dương','Human Review',2,'T133,T142','Then request quá lớn/không quyền bị chặn, keys không lộ trong bundle/log; budget/cơ chế nhỏ được duyệt không mặc định Redis/quota số.','Security review + API responses','D16/D20'],
 ['PILOT','Freeze feature và chốt rehearsal accounts/data','HUMAN INPUT','P0','Thầy Đức','Dương',2,'T201,T202','Then từ cuối 20/10 không feature mới; roster/lesson/accounts sẵn cho 21–22, chỉ sửa blockers.','Freeze approval + rehearsal roster','D34/D35']
]);
add(21,[
 ['QA','Chạy learner E2E bằng Sheet/user/AI thật','REUSE','P0','QA / Agent','Thầy Đức',3,'T203','Then PILOT-01/03/04/05/08/09/10/11/12/13 có actual result/evidence, không simulation.','Browser recording + checklist','D35'],
 ['QA','Regression isolation và forged write/credential leakage','REUSE','P0','QA / Agent','Human Review',3,'T211','Then outside/Department A→B/Head A→B/forged score bị chặn; secret không lộ; blockers được ghi rõ.','PILOT-02/06/07 security tests','D25/D26'],
 ['QA','Regression malformed Sheet và provider/save failures','REUSE','P0','QA / Agent','Dương',2,'T211','Then PILOT-16/17 + DB failure không success giả, last snapshot/progress giữ; retry không trùng.','Negative test output + recording','D33/D35'],
 ['PILOT','Triage blockers, chỉ chọn fixes chặn pilot','HUMAN INPUT','P0','Dương + Thầy Đức','QA / Agent',2,'T212,T213','Then mỗi blocker có severity/owner/repro/fix due 22; defer feature không thiết yếu.','Blocker list trong workbook','D35']
]);
add(22,[
 ['QA','Sửa blocker đã reproduce trong rehearsal','MODIFY','P0','Dương','QA / Agent',4,'T214','Given blocker list; Then fixes đạt regression, không mở scope feature; nếu không có blocker dùng để stability check.','Test report + fix diff/commit hash','D35'],
 ['PILOT','Rehearsal lại cả learner/Trainer/Head','REUSE','P0','Dương + Thầy Đức','Department Head / PIC',2,'T221','Then full flow lặp được; PILOT-14/15 đạt; những scenario fail được retest với evidence mới.','Full rehearsal recording/checklist','D35'],
 ['QA','Kiểm pilot URL/config/rollback và migration ledger final','REUSE','P0','Dương','Intrepid IT / Admin',2,'T222','Then pilot URL truy cập được, build/config/DB compatible; rollback route được biết, bản cũ độc lập.','Deployed URL + config/DB checklist','D28'],
 ['PILOT','Go/no-go review 17 scenario và P0/P1 còn mở','HUMAN INPUT','P0','Human Review','Thầy Đức',2,'T223','Then mọi mandatory scenario được review evidence; blocker còn mở không được declare READY.','Sign-off/NO-GO note trong workbook','D34/D35']
]);
add(23,[
 ['PILOT','Smoke test trước buổi pilot, không phát triển feature','REUSE','P0','QA / Agent','Intrepid IT / Admin',2,'T224','Then Sheet import/login/AI/progress/isolation chạy trên pilot URL; evidence ngày 23 hoặc retest hợp lệ.','Smoke test report','D34'],
 ['PILOT','Thực hiện pilot và Thầy Đức nghiệm thu end-to-end','HUMAN INPUT','P0','Dương + Thầy Đức','Department Head / PIC',2,'T231','Then learner/Trainer/Head thao tác thật; đủ 17 scenarios PASS với evidence, không blocker P0 còn mở.','Pilot recording + acceptance approval','D34/D35'],
 ['QA','Final blocker fix nếu xuất hiện trong pilot','MODIFY','P0','Dương','Human Review',2,'T231','If final blocker có repro; Then fix tối thiểu và retest; nếu không có blocker ghi PASS/no blocker, không phát triển feature mới.','Final regression / no-blocker confirmation','D35']
]);

const defer=[
 ['LIB','Thư viện prompt phòng ban đầy đủ','P2','Library browser-local cần persistence/curation; không chặn minimum pilot.','D21'],
 ['HEAD','Form Head upload/review SOP/sample data nâng cao','P2','Pilot dùng Trainer bind link/text; full Head submission sau pilot.','D18/D25'],
 ['TRAINER','Advanced analytics/mastery/impact dashboard','P2','Basic progress bắt buộc; metrics warehouse/impact không thuộc critical path.','D19/D22'],
 ['I18N','Polish i18n toàn app và thêm ngôn ngữ','P2','Giữ EN/VI thiết yếu; defer copy/layout polish ngoài pilot.','D27'],
 ['SHEET','Auto-sync 5 phút, worker/cron/Redis','P3','Nguồn Sheet vẫn must-have; Sync now/import đủ pilot, interval chưa confirmed.','D33'],
 ['AI','Provider streaming/SSE','P3','Output hoàn chỉnh thật đủ pilot; SSE chưa confirmed.','D17'],
 ['CONTENT','Complex SOP/video ingestion/RAG/vector DB','P3','Curated SOP/reference/sample data đủ pilot; không ingest toàn bộ 550 nguồn.','D18']
];
for(let x=0;x<defer.length;x++){const a=defer[x];rows.push({id:`DEF${x+1}`,day:null,module:a[0],title:a[1],cls:'DEFER',pri:a[2],owner:'TBD',input:'Human Review',hours:null,deps:'',dod:'Không triển khai trước pilot; chỉ mở lại sau khi P0/P1 ổn và scope được duyệt.',evidence:'Post-pilot scope approval',decision:a[4],note:a[3]});}

const milestones=[['M1','Identity & Authorization',6,8],['M2','Sheet roster & department routing',9,12],['M3','Real learning flow',13,16],['M4','Trainer & Head minimum',17,20],['M5','Hardening / rehearsal / pilot',21,23]];
function milestone(day){return day==null?'AFTER PILOT':day<=8?'M1':day<=12?'M2':day<=16?'M3':day<=20?'M4':'M5';}
const goals={PLAN:'Chốt scope/capacity để đội thực thi đúng hạn',ENV:'Giữ pilot độc lập và DB compatibility',SSO:'Nhân viên Intrepid login an toàn',ACCESS:'Không truy cập chéo phòng ban',SHEET:'Trainer cập nhật Sheet và pre-onboard đáng tin',PROFILE:'Learner xác nhận đúng profile rồi vào zone',CONTENT:'Học từ scenario/SOP/sample thật',AI:'Learner nhận output AI thật',EVAL:'Feedback đáng tin để cải thiện prompt',PROGRESS:'Lưu bền vững attempts/progress',COMPARE:'So sánh hai lần thực hành thật',TRAINER:'Trainer vận hành course/cohort',HEAD:'Head xem đúng team',I18N:'EN/VI thiết yếu dùng được',CACHE:'Không lộ cache account khác',QA:'Phát hiện/sửa lỗi chặn pilot',PILOT:'Usable ngày 23, không chỉ code xong',LIB:'Tích lũy prompt sau pilot'};
const first=8,last=first+rows.length-1;
const byId=new Map(rows.map((t,i)=>[t.id,{...t,row:first+i}]));
for(const t of rows){for(const id of t.deps.split(',').filter(Boolean)){assert(byId.has(id),`Unknown dependency ${id}`);assert(byId.get(id).row<byId.get(t.id).row,`Cyclic/order ${t.id}→${id}`);}if(t.day){assert(t.hours>=2&&t.hours<=8);assert(t.owner!=='TBD');assert(t.dod&&t.evidence);}}
const capacities={};for(const t of rows.filter(t=>t.day&&t.owner.includes('Dương'))){capacities[t.day]=(capacities[t.day]||0)+t.hours;}for(const [day,h] of Object.entries(capacities))assert(h<=8,`Dương ${day}: ${h} hours`);

const protectedFiles=['docs/00_PRODUCT_SOURCE_OF_TRUTH.md','docs/01_CURRENT_STATE.md','docs/02_IMPLEMENTATION_PLAN.md','docs/03_DECISION_LOG.md'];
async function listCode(dir){for(const f of await fs.readdir(root+'/'+dir,{withFileTypes:true})){const path=dir+'/'+f.name;if(f.isDirectory())await listCode(path);else if(f.isFile())protectedFiles.push(path);}}
for(const dir of ['src','api','supabase'])await listCode(dir);
const hashes=new Map();for(const path of protectedFiles)hashes.set(path,crypto.createHash('sha256').update(await fs.readFile(root+'/'+path)).digest('hex'));
function cell(sheet,address,value){sheet.getRange(address).values=[[value]];}
function formula(sheet,address,value){sheet.getRange(address).formulas=[[value]];}
function setup(sheet,range,title){sheet.showGridLines=false;sheet.getRange(range).format={font:{name:'Arial',size:10,color:'#243247'},verticalAlignment:'center'};cell(sheet,'A2',title);sheet.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#243247'};}
function header(sheet,range){sheet.getRange(range).format={fill:'#243247',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:40};}
function table(sheet,range,name){const t=sheet.tables.add(range,true,name);t.showFilterButton=true;t.style='TableStyleLight9';return t;}
function columns(sheet,widths,end){for(const [col,w] of Object.entries(widths))sheet.getRange(`${col}1:${col}${end}`).format.columnWidth=w;}
function dropdown(sheet,range,values){sheet.getRange(range).dataValidation={rule:{type:'list',values}};}
function statuses(sheet,range){for(const [text,fill,color] of [['BLOCKED','#FDE8E8','#9B1C1C'],['FAIL','#FDE8E8','#9B1C1C'],['OVERDUE','#FDE8E8','#9B1C1C'],['ACCEPTED','#E7F4EC','#1D6B42'],['PASS','#E7F4EC','#1D6B42'],['READY','#E7F4EC','#1D6B42'],['IN PROGRESS','#EAF1FF','#245C9D'],['AT RISK','#FFF1CF','#945F00']])sheet.getRange(range).conditionalFormats.add('cellIs',{operator:'equal',formula:`"${text}"`,format:{fill,font:{color,bold:true}}});}
setup(tasks,`A1:AH${last}`,'Công việc chi tiết 06–23/10/2026');
cell(tasks,'A3','Owner và effort là phân công đề xuất; thực tế chưa cập nhật. 21–22 chỉ test/fix/rehearsal; 23 chỉ pilot/final blocker.');
cell(tasks,'A4','Ô vàng: owner, trạng thái, %, actual evidence, blocker, ngày actual, review. ACCEPTED chỉ tính khi đủ evidence, PASS, 100%, ngày và dependencies.');
cell(tasks,'A5','Nguồn: 00_PRODUCT_SOURCE_OF_TRUTH > 03_DECISION_LOG > 01_CURRENT_STATE > 02_IMPLEMENTATION_PLAN; code static không chứng nhận runtime.');
const headers=['STT','Ngày','Thứ','Milestone','Module / Workstream','User Story / Goal','Task ID','Hạng mục công việc chi tiết','Current codebase status','Classification','Priority','Implementation Owner','Input / Approval Owner','Dependency','Planned Start','Planned Finish','Estimated Effort','Status','% Complete','Definition of Done','Expected Evidence','Actual Evidence / Link','Blocker','Risk','Decision dependency','Actual Finish Date','Acceptance Status','Notes','Cập nhật lúc','Đủ nghiệm thu','Cảnh báo','Critical path / lý do P0','Phạm vi','File / module thực tế'];
tasks.getRange('A7:AH7').values=[headers];
const values=rows.map((t,index)=>{const isPilot=t.day!=null;const base=baseline[t.module];return [index+1,isPilot?d(t.day):null,isPilot?weekdays[d(t.day).getUTCDay()]:'Sau pilot',milestone(t.day),t.module,goals[t.module],t.id,t.title,base[0],t.cls,t.pri,t.owner,t.input,t.deps,isPilot?d(t.day):null,isPilot?d(t.day):null,t.hours,isPilot?'NOT STARTED':'DEFERRED',null,t.dod,t.evidence,null,null,t.module==='ACCESS'||t.module==='HEAD'?'Rò dữ liệu nếu chỉ lọc UI':t.module==='AI'?'Chờ credential/provider':t.module==='SHEET'?'Access/mapping/batch không nhất quán':'Cần review/runtime; không dùng mock làm evidence',t.decision,null,isPilot?'NOT REVIEWED':'N/A',t.note||(weekdays[d(t.day).getUTCDay()]==='Thứ bảy'||weekdays[d(t.day).getUTCDay()]==='Chủ nhật'?'Cuối tuần: capacity cần xác nhận 06/10. Phân công/effort đề xuất.':'Phân công/effort đề xuất; chưa implement trong task planning.'),null,null,null,t.pri==='P0'?`Gate pilot ${milestone(t.day)}: ${goals[t.module]}`:'Có workaround hoặc after pilot; không thay P0',isPilot?'PILOT':'AFTER PILOT',base[1]];});
tasks.getRange(`A${first}:AH${last}`).values=values;table(tasks,`A7:AH${last}`,'DailyTasks');header(tasks,'A7:AH7');
for(let x=0;x<rows.length;x++){const row=first+x,t=rows[x];const deps=t.deps.split(',').filter(Boolean).map(id=>`AD${byId.get(id).row}=1`);const depAnd=deps.length?`,${deps.join(',')}`:'';
 formula(tasks,`AD${row}`,`=IF(AND(AG${row}="PILOT",R${row}="ACCEPTED",AA${row}="PASS",S${row}=1,V${row}<>"",L${row}<>"TBD",L${row}<>"",W${row}="",ISNUMBER(Z${row}),Z${row}<='Tổng quan'!$B$4${depAnd}),1,0)`);
 formula(tasks,`AE${row}`,`=IF(AG${row}="AFTER PILOT","DEFERRED",IF(AD${row}=1,"ACCEPTED",IF(OR(R${row}="BLOCKED",W${row}<>""),"BLOCKED",IF(AA${row}="FAIL","FAIL",IF(R${row}="ACCEPTED","MISSING ACCEPTANCE",IF(P${row}<'Tổng quan'!$B$4,"OVERDUE",IF(AC${row}="","NO UPDATE",R${row})))))))`);
}
for(const col of ['B','O','P','Z','AC'])tasks.getRange(`${col}${first}:${col}${last}`).setNumberFormat('dd/mm/yyyy');
tasks.getRange(`Q${first}:Q${last}`).setNumberFormat('0" giờ"');tasks.getRange(`S${first}:S${last}`).setNumberFormat('0%');
dropdown(tasks,`R${first}:R${last}`,['NOT STARTED','IN PROGRESS','BLOCKED','READY FOR REVIEW','ACCEPTED','DEFERRED']);dropdown(tasks,`AA${first}:AA${last}`,['NOT REVIEWED','PASS','FAIL','N/A']);dropdown(tasks,`K${first}:K${last}`,['P0','P1','P2','P3']);dropdown(tasks,`J${first}:J${last}`,['KEEP','REUSE','MODIFY','REBUILD','NEW','DEFER','HUMAN INPUT']);
tasks.dataValidations.add({range:`S${first}:S${last}`,rule:{type:'decimal',operator:'between',formula1:0,formula2:1}});
tasks.getRange(`A${first}:AH${last}`).format.wrapText=true;tasks.getRange(`A${first}:AH${last}`).format.rowHeight=96;
for(const col of ['L','M','R','S','V','W','Z','AA','AC'])tasks.getRange(`${col}${first}:${col}${last}`).format.fill='#FFF5DD';
tasks.getRange(`AD${first}:AE${last}`).format.fill='#EDF2F7';statuses(tasks,`R${first}:R${last}`);statuses(tasks,`AA${first}:AA${last}`);statuses(tasks,`AE${first}:AE${last}`);
columns(tasks,{A:7,B:13,C:12,D:14,E:22,F:36,G:10,H:46,I:48,J:16,K:9,L:22,M:24,N:25,O:13,P:13,Q:13,R:20,S:12,T:74,U:33,V:38,W:32,X:35,Y:24,Z:16,AA:20,AB:42,AC:15,AD:15,AE:24,AF:46,AG:16,AH:65},last);
tasks.freezePanes.freezeRows(7);tasks.freezePanes.freezeColumns(8);

const riskRows=[
 ['DEC-14','DECISION','Chốt SSO provider/callback và allowlist domain','Không login/gate đúng','Chưa đánh giá','Intrepid IT / Admin','OPEN',7,'Chốt domain/provider sớm; chỉ reuse OAuth sau approval.','03 D14','T072,T081'],
 ['DEC-15','DECISION','Chốt GCP model/runtime/credential cho run và Judge','Không gọi AI thật','Chưa đánh giá','Intrepid IT / Admin','OPEN',7,'Cấp quyền M1, smoke-test cả generate/evaluate; không đổi provider chưa duyệt.','03 D15','T063,T074,T133'],
 ['DEC-23','DECISION','Membership/country/correction/revoke policy','Rò hoặc route sai phòng ban','Chưa đánh giá','Human Review','OPEN',8,'One pilot membership policy rõ; profile correction không tự tăng quyền.','03 D23','T082,T112,T122,T181'],
 ['DEC-25','DECISION','SOP/sample privacy và dữ liệu được phép gửi provider','Không có lesson thật được duyệt','Chưa đánh giá','Thầy Đức','OPEN',9,'PIC duyệt một SOP/sample; dùng link/text, không ingestion phức tạp.','03 D25','T093,T132,T193'],
 ['DEC-26','DECISION','Canonical context/provenance boundary','Điểm/attempt không đáng tin','Chưa đánh giá','Human Review','PROPOSED',14,'Review cơ chế server-controlled result nhỏ, kiểm forged write và validator NULL.','03 D26','T142,T143,T151'],
 ['DEC-28','DECISION','Cách isolation pilot và DB/deployment compatibility','Ảnh hưởng bản cũ hoặc RPC fail','Chưa đánh giá','Human Review','OPEN',6,'Chốt môi trường độc lập; kiểm migration ledger trước coding dependency.','03 D28','T064,T071,T223'],
 ['DEC-33','DECISION','Chọn Sync now/private reader hay Sheet-export import','Connector chưa usable','Chưa đánh giá','Dương + Thầy Đức','PROPOSED',8,'Chọn một đường, quyền least privilege; không cần auto-sync/Redis.','03 D33','T083,T091,T101'],
 ['DEC-19','DECISION','Rubric feedback và completed-run semantics','Feedback sai hoặc gọi run là mastery','Chưa đánh giá','Thầy Đức','OPEN',9,'Duyệt rubric cho một bài; không KPI/mastery % tự đặt.','03 D19','T093,T141,T191'],
 ['DEC-20','DECISION','Usage control/quota đủ pilot','Chi phí hoặc abuse','Chưa đánh giá','Human Review','OPEN',20,'Cơ chế nhỏ phù hợp runtime, không mặc định 20 req/min/50k/Redis.','03 D20','T202'],
 ['RISK-01','RISK','Access Sheet/SSO/GCP đến muộn','Trễ M1 và critical path','Chưa đánh giá','Intrepid IT / Admin','MONITORING',8,'Escalate 07/10; Sheet-export fallback 08/10 nếu private API chưa sẵn.','02 M1; 03 D14/D15/D33','T062,T063,T072,T083'],
 ['RISK-02','RISK','Nợ global instructor/non-UUID/identity bridge','Cross-department leak','Chưa đánh giá','Dương','MONITORING',12,'M2 negative direct API/RLS; không cắt isolation.','01 Access debt; code API authorization','T073,T084,T122,T183'],
 ['RISK-03','RISK','Client-supplied score + SQL NULL + RPC drift','Feedback/progress không nghiệm thu','Chưa đánh giá','Dương','MONITORING',16,'Validator/provenance và disposable RPC runtime tests trước E2E.','01 debts 2/4; code migration 016','T142,T143,T151,T153'],
 ['RISK-04','RISK','Thiếu SOP/sample/lesson được PIC duyệt','Không có real learning flow','Chưa đánh giá','Thầy Đức','MONITORING',12,'Duyệt một bài nhỏ trước M3; không dùng generic seed làm Intrepid.','00 Scope; 02 M2/M3','T093,T131,T132'],
 ['RISK-05','RISK','Scope creep và capacity cuối tuần chưa xác nhận','Mất buffer 21–22/10','Chưa đánh giá','Dương + Thầy Đức','MONITORING',6,'Chốt capacity 06/10; freeze 20; cắt library/auto-sync/SSE trước rehearsal.','02 Cut List; 03 D36','T061,T203,T214']
];
setup(risk,'A1:K22','Rủi ro và quyết định ảnh hưởng 23/10');cell(risk,'A3','OPEN/PROPOSED là trạng thái nguồn; MONITORING là rủi ro kế hoạch, không khẳng định đang có blocker thực tế.');
risk.getRange('A5:K5').values=[['ID','Type','Description','Impact','Likelihood','Owner','Status','Needed By','Mitigation / Decision','Source','Affected Tasks']];risk.getRange(`A6:K${5+riskRows.length}`).values=riskRows.map(x=>x.map((v,i)=>i===7?d(v):v));table(risk,`A5:K${5+riskRows.length}`,'DeadlineRisks');header(risk,'A5:K5');risk.getRange(`A6:K${5+riskRows.length}`).format.wrapText=true;risk.getRange(`A6:K${5+riskRows.length}`).format.rowHeight=92;risk.getRange(`H6:H${5+riskRows.length}`).setNumberFormat('dd/mm/yyyy');
dropdown(risk,`B6:B${5+riskRows.length}`,['RISK','DECISION','BLOCKER']);dropdown(risk,`G6:G${5+riskRows.length}`,['OPEN','PROPOSED','CONFIRMED','MONITORING','MITIGATED','RESOLVED','CLOSED']);dropdown(risk,`E6:E${5+riskRows.length}`,['Chưa đánh giá','LOW','MEDIUM','HIGH']);risk.getRange(`E6:I${5+riskRows.length}`).format.fill='#FFF5DD';
cell(risk,'A4','Ngày báo cáo');formula(risk,'B4',"='Tổng quan'!B4");risk.getRange('B4').setNumberFormat('dd/mm/yyyy');
risk.getRange(`A6:K${5+riskRows.length}`).conditionalFormats.addCustom('AND($B6="DECISION",OR($G6="OPEN",$G6="PROPOSED"),$H6<$B$4)',{fill:'#FDE8E8',font:{color:'#9B1C1C'}});
columns(risk,{A:15,B:14,C:50,D:32,E:18,F:23,G:18,H:14,I:60,J:37,K:36},22);risk.freezePanes.freezeRows(5);risk.freezePanes.freezeColumns(3);

const scenarios=[
 ['Intrepid learner hợp lệ login thành công','User Intrepid đã có roster','Login SSO, kiểm session','Login đúng identity, không cần key cá nhân.','T081,T112'],
 ['Email ngoài Intrepid bị chặn','Outside-domain account','Login và gọi API trực tiếp','Server từ chối, không có zone/data/provider quyền.','T081,T084'],
 ['Sheet roster sync/import thành công','Sheet bốn cột hợp lệ','Trainer Sync/import, kiểm batch và DB','Profiles đúng, batch counts đúng; sync lại không trùng.','T111,T123'],
 ['Learner match đúng profile','Roster verified email/name/function/country','Login, mở confirmation','Bốn trường đúng; correction không tự cấp quyền.','T113'],
 ['Learner route đúng Department Zone','Profile đã confirm và assignment','Confirm, mở zone/course','Đúng function/department/country/cohort.','T121'],
 ['Learner A không đọc được Department B','Accounts A/B và protected data','Gọi URL/API/DB cho data B bằng session A','Bị từ chối hoặc không row, không leak context/output.','T122,T123'],
 ['Head A không đọc được learner Department B','Head A, learner B','Gọi learner/progress B trực tiếp','Bị từ chối; Head A vẫn đọc được own A.','T183'],
 ['Learner mở được lesson Intrepid thật','Published assigned course/module/lesson','Mở lesson sau login/zone','Bài UUID đúng course, không generic seed fallback.','T131'],
 ['Lesson có SOP/sample data đúng','PIC/Trainer duyệt context','Đối chiếu reference/sample trong UI','Scenario/SOP/sample đúng version và được phép dùng.','T132'],
 ['Prompt sinh AI output thật','Credential GCP và user authorized','Viết prompt, Run','Provider thật trả output; không simulation.','T133'],
 ['Evaluation/feedback hoạt động','Rubric và output thật','Evaluate, đọc feedback và thử malformed response','Feedback actionable, contract hợp lệ; lỗi không score giả.','T141,T142'],
 ['Rerun và compare hoạt động','Hai prompts/runs thật','Sửa prompt, rerun, compare','Đúng attempt IDs và output/feedback tương ứng.','T161,T162'],
 ['Attempt/progress persist qua refresh','Run đã ghi thành công','Refresh/logout-login, query DB','Attempts/progress đúng scope vẫn tồn tại, không browser-only.','T151,T163'],
 ['Trainer chỉnh/publish lesson tối thiểu','Trainer quyền được duyệt','Sửa module/lesson, bind context, publish','Learner assigned nhận đúng bản mới; draft không lộ.','T173'],
 ['Head xem progress đúng department','Head membership và learner run','Login Head, list learners/progress','Chỉ own department; completed-run không ghi mastery.','T182,T191'],
 ['Provider fail không báo success giả','Khả năng simulate upstream error trong test','Gây timeout/denied/invalid Judge, retry','UI lỗi rõ, không fake output/score/completion; recovery an toàn.','T213'],
 ['Malformed roster báo lỗi an toàn','Missing/duplicate/unknown department row','Preview/import batch lỗi, sửa rồi chạy lại','Row/reason rõ; no partial apply; last good snapshot giữ.','T111,T213']
];
setup(pilot,'A1:M26','Nghiệm thu pilot end-to-end');cell(pilot,'A3','17 scenario bắt buộc. PASS chỉ tính khi có actual result, evidence, tester, ngày test hợp lệ và không blocker.');
pilot.getRange('A5:M5').values=[['ID','Scenario','Priority','Precondition','Steps','Expected Result','Actual Result','Status','Evidence','Tester','Test Date','Blocker','Đủ xác nhận PASS']];
pilot.getRange('A6:M22').values=scenarios.map((x,i)=>[`PILOT-${String(i+1).padStart(2,'0')}`,x[0],'P0',x[1],x[2],x[3],null,'NOT TESTED',null,null,null,null,null]);table(pilot,'A5:M22','PilotAcceptance');header(pilot,'A5:M5');
for(let r=6;r<=22;r++)formula(pilot,`M${r}`,`=IF(AND(H${r}="PASS",G${r}<>"",I${r}<>"",J${r}<>"",ISNUMBER(K${r}),K${r}<='Tổng quan'!$B$4,L${r}=""),1,0)`);
dropdown(pilot,'H6:H22',['NOT TESTED','IN PROGRESS','PASS','FAIL','BLOCKED']);dropdown(pilot,'C6:C22',['P0','P1','P2','P3']);pilot.getRange('K6:K22').setNumberFormat('dd/mm/yyyy');pilot.getRange('A6:M22').format.wrapText=true;pilot.getRange('A6:M22').format.rowHeight=90;pilot.getRange('G6:L22').format.fill='#FFF5DD';statuses(pilot,'H6:H22');
columns(pilot,{A:14,B:47,C:10,D:44,E:49,F:68,G:40,H:18,I:34,J:22,K:15,L:34,M:20},26);pilot.freezePanes.freezeRows(5);pilot.freezePanes.freezeColumns(2);

const objectives={
 6:['Scope/capacity và quyền Sheet/GCP được yêu cầu, isolation được chốt','Sheet/tab có owner; decision deployment/capacity được duyệt.'],
 7:['Pilot identity foundation và AI access smoke-test','Login gate + roles mapping; provider test có output/Judge.'],
 8:['Identity gate đã kiểm, connector và membership policy được chọn','Outside bị chặn; chốt nguồn Sheet path và profile correction.'],
 9:['Parser/validation roster và lesson data được duyệt','Preview 10 good/2 bad rõ row/reason, chưa apply lỗi.'],
10:['Trainer explicit Sync/import vào DB có summary','Batch hợp lệ upsert; timestamps/counts; không public Sheet.'],
11:['Idempotent/error-safe sync và profile confirmation','Sync lại không trùng; learner match/confirm đúng; sửa không tăng quyền.'],
12:['Sheet→zone đúng và department isolation được nghiệm thu','Demo learner A không đọc B; Google Sheet roster usable.'],
13:['Một assigned lesson với context và real AI output','Không fallback; prompt gọi provider thật từ lesson canonical.'],
14:['Feedback thật và provenance/validator được siết','Judge contract và malformed/forged score bị từ chối.'],
15:['Attempt/progress atomic, retry/error không success giả','DB save/retry đúng ID; failed write không completed giả.'],
16:['Learner E2E và compare persisted attempts','Hai run thật, feedback/rerun/compare, reload giữ progress.'],
17:['Trainer quản lý/publish module/lesson/context','Đức chỉnh nguồn, publish và learner nhận đúng bản mới.'],
18:['Head own-department view và direct access isolation','Head A đọc A, không đọc/sửa learner/progress B.'],
19:['Basic reporting, EN/VI và cache account an toàn','Trainer/Head progress đúng DB; account B không thấy cache A.'],
20:['Đủ ba vai trò và feature freeze','Demo thật; roster/accounts/content sẵn cho rehearsal.'],
21:['Rehearsal E2E/security/error và blocker triage','Checklist có actual evidence; blocker có owner/repro/due.'],
22:['Sửa blockers, rehearsal lại và go/no-go','17 scenario được review; pilot URL/config compatible.'],
23:['Pilot-ready, final smoke/pilot và final blocker fixes','Đức nghiệm thu toàn flow; không feature development lớn.']};
setup(daily,'A1:L26','Thực thi theo ngày 06–23/10/2026');cell(daily,'A3','Bao gồm 10/11/17/18 cuối tuần: capacity cần chốt ngày 06. Status/counters lấy từ Công việc; owner là phân công đề xuất.');
daily.getRange('A5:L5').values=[['Ngày','Daily Objective','Must Finish Today','Task IDs','Owner','Dependency','End-of-Day Demo','Blocker','Status','Số task','Đã nghiệm thu','Giờ Dương dự kiến']];
for(let day=6;day<=23;day++){const r=day,items=rows.filter(t=>t.day===day);daily.getRange(`A${r}:L${r}`).values=[[d(day),objectives[day][0],items.map(t=>t.title).join('\n'),items.map(t=>t.id).join(', '),[...new Set(items.map(t=>t.owner))].join(', '),[...new Set(items.flatMap(t=>t.deps.split(',').filter(Boolean)))].join(', '),objectives[day][1],null,null,null,null,capacities[day]||0]];
 formula(daily,`H${r}`,`=IF(COUNTIFS(DailyTasks[Ngày],A${r},DailyTasks[Cảnh báo],"BLOCKED")=0,"",COUNTIFS(DailyTasks[Ngày],A${r},DailyTasks[Cảnh báo],"BLOCKED")&" task bị chặn; lọc Công việc")`);
 formula(daily,`J${r}`,`=COUNTIFS(DailyTasks[Ngày],A${r})`);formula(daily,`K${r}`,`=SUMIFS(DailyTasks[Đủ nghiệm thu],DailyTasks[Ngày],A${r})`);
 formula(daily,`I${r}`,`=IF(K${r}=J${r},"ACCEPTED",IF(H${r}<>"","BLOCKED",IF(A${r}<'Tổng quan'!$B$4,"OVERDUE",IF(COUNTIFS(DailyTasks[Ngày],A${r},DailyTasks[Status],"IN PROGRESS")>0,"IN PROGRESS","NOT STARTED"))))`);
}
table(daily,'A5:L23','DailyExecution');header(daily,'A5:L5');daily.getRange('A6:A23').setNumberFormat('dd/mm/yyyy');daily.getRange('A6:L23').format.wrapText=true;daily.getRange('A6:L23').format.rowHeight=132;statuses(daily,'I6:I23');columns(daily,{A:14,B:48,C:65,D:32,E:36,F:39,G:64,H:35,I:20,J:12,K:16,L:19},26);daily.freezePanes.freezeRows(5);daily.freezePanes.freezeColumns(2);

setup(overview,'A1:K38','Promptify Intrepid — Pilot progress tracker');
cell(overview,'A3','Kế hoạch 06–23/10/2026 · Phân công/effort đề xuất · Chưa có evidence actual; không suy diễn code có sẵn = đã hoàn thành.');
cell(overview,'A4','Ngày báo cáo');cell(overview,'B4',d(6));cell(overview,'D4','Deadline');cell(overview,'E4',d(23));cell(overview,'H4','Ngày còn lại');formula(overview,'J4','=MAX(0,E4-B4)');overview.getRange('B4').setNumberFormat('dd/mm/yyyy');overview.getRange('E4').setNumberFormat('dd/mm/yyyy');overview.getRange('B4').format.fill='#FFF2CC';
const metrics=[['A6','% tiến độ pilot','B6','=IF(E8=0,0,J8/E8)'],['D6','% mục tiêu cuối','E6','=SUM(PilotAcceptance[Đủ xác nhận PASS])/COUNTA(PilotAcceptance[ID])'],['H6','Pilot readiness','J6',null],['A8','Tổng task','B8','=COUNTA(DailyTasks[Task ID])'],['D8','Task pilot','E8','=COUNTIFS(DailyTasks[Phạm vi],"PILOT")'],['H8','Đã nghiệm thu','J8','=SUM(DailyTasks[Đủ nghiệm thu])'],['A9','Đang làm','B9','=COUNTIFS(DailyTasks[Phạm vi],"PILOT",DailyTasks[Status],"IN PROGRESS")'],['D9','Bị block','E9','=COUNTIFS(DailyTasks[Phạm vi],"PILOT",DailyTasks[Cảnh báo],"BLOCKED")'],['H9','Quá hạn','J9','=COUNTIFS(DailyTasks[Phạm vi],"PILOT",DailyTasks[Cảnh báo],"OVERDUE")'],['A10','P0 chưa hoàn thành','B10','=COUNTIFS(DailyTasks[Priority],"P0",DailyTasks[Đủ nghiệm thu],0)'],['D10','Chưa cập nhật','E10','=E8-COUNTIFS(DailyTasks[Phạm vi],"PILOT",DailyTasks[Cập nhật lúc],">0")'],['H10','Cập nhật gần nhất','J10','=IF(COUNT(DailyTasks[Cập nhật lúc])=0,"Chưa cập nhật",MAX(DailyTasks[Cập nhật lúc]))'],['A11','Decision còn mở','B11','=COUNTIFS(DeadlineRisks[Type],"DECISION",DeadlineRisks[Status],"OPEN")+COUNTIFS(DeadlineRisks[Type],"DECISION",DeadlineRisks[Status],"PROPOSED")'],['D11','Decision trễ gate','E11','=COUNTIFS(DeadlineRisks[Type],"DECISION",DeadlineRisks[Status],"OPEN",DeadlineRisks[Needed by],"<"&B4)+COUNTIFS(DeadlineRisks[Type],"DECISION",DeadlineRisks[Status],"PROPOSED",DeadlineRisks[Needed by],"<"&B4)']];
for(const [label,text,address,f] of metrics){cell(overview,label,text);if(f)formula(overview,address,f);overview.getRange(address).format.font={bold:true,size:14,color:'#174E73'};}
formula(overview,'J6','=IF(AND(J8=E8,E6=1,B11=0),"READY",IF(OR(E9>0,J9>0,E11>0,AND(B4>=DATE(2026,10,21),B10>0),B4>E4),"AT RISK",IF(E10=E8,"NOT READY","ON TRACK")))');
overview.getRange('B6').setNumberFormat('0%');overview.getRange('E6').setNumberFormat('0%');overview.getRange('J10').setNumberFormat('dd/mm/yyyy');statuses(overview,'J6');
cell(overview,'A13','Accepted chỉ tính khi PASS + 100% + evidence + actual finish + không blocker + dependency được nghiệm thu. READY cần đủ task, 17 scenario và decision được chốt.');
overview.getRange('A15:K15').values=[['Milestone','Demo outcome','Start','Finish','Tasks','Accepted','% complete','In progress','No update','Blocked / Late','Alert']];
for(let i=0;i<milestones.length;i++){const [id,name,start,end]=milestones[i],r=16+i;overview.getRange(`A${r}:K${r}`).values=[[id,name,d(start),d(end),null,null,null,null,null,null,null]];
formula(overview,`E${r}`,`=COUNTIFS(DailyTasks[Milestone],A${r})`);formula(overview,`F${r}`,`=SUMIFS(DailyTasks[Đủ nghiệm thu],DailyTasks[Milestone],A${r})`);formula(overview,`G${r}`,`=IF(E${r}=0,0,F${r}/E${r})`);formula(overview,`H${r}`,`=COUNTIFS(DailyTasks[Milestone],A${r},DailyTasks[Status],"IN PROGRESS")`);formula(overview,`I${r}`,`=E${r}-COUNTIFS(DailyTasks[Milestone],A${r},DailyTasks[Cập nhật lúc],">0")`);formula(overview,`J${r}`,`=COUNTIFS(DailyTasks[Milestone],A${r},DailyTasks[Cảnh báo],"BLOCKED")+COUNTIFS(DailyTasks[Milestone],A${r},DailyTasks[Cảnh báo],"OVERDUE")`);formula(overview,`K${r}`,`=IF(F${r}=E${r},"ACCEPTED",IF(J${r}>0,"AT RISK",IF(I${r}=E${r},"NOT READY","ON TRACK")))`);}
table(overview,'A15:K20','MilestoneSummary');header(overview,'A15:K15');overview.getRange('C16:D20').setNumberFormat('dd/mm/yyyy');overview.getRange('G16:G20').setNumberFormat('0%');overview.getRange('A16:K20').format.wrapText=true;overview.getRange('A16:K20').format.rowHeight=55;statuses(overview,'K16:K20');
cell(overview,'A22','CRITICAL PATH TO 23/10');cell(overview,'A23','06 capacity/access → 07–08 identity & department authorization → 09–12 Sheet import / roster / profile routing → 13 context + course → 14 AI → 15 progress → 16 rerun/compare → 17–20 Trainer/Head & freeze → 21–22 rehearsal → 23 pilot.');
cell(overview,'A25','CUT LIST / AFTER PILOT');cell(overview,'A26','Cắt P3 trước: background sync/Redis/worker, SSE/streaming, complex SOP ingestion/RAG. Sau đó P2: full prompt library, advanced Head/Admin/analytics, i18n polish.');cell(overview,'A27','Nếu cần cắt P1: batch sync summary, EN/VI coverage nâng cao, detailed usage view; giữ error/success feedback tối thiểu để import debug được.');cell(overview,'A28','Không cắt: Google Sheet roster, login/profile, department isolation/routing, one real learning flow, AI run, evaluation/rerun/compare, progress, Trainer/Head minimum.');
cell(overview,'A30','CÁCH CẬP NHẬT');cell(overview,'A31','1. Sửa ngày báo cáo B4. Trong Công việc, cập nhật Status, % Complete, Evidence, Blocker, Actual Finish, Acceptance và Cập nhật lúc.');cell(overview,'A32','2. Trong Nghiệm thu Pilot, ghi actual result + PASS/FAIL + evidence + tester + ngày test. Trong Rủi ro & Quyết định, cập nhật status và owner/gate.');cell(overview,'A33','3. % task = số task pilot đủ nghiệm thu / 59 task pilot. % mục tiêu cuối = scenario đủ bằng chứng PASS / 17. Chưa có actual nên 0% nghĩa chưa nghiệm thu.');cell(overview,'A34','Nguồn: 00_PRODUCT_SOURCE_OF_TRUTH > 03_DECISION_LOG > 01_CURRENT_STATE > 02_IMPLEMENTATION_PLAN; code chỉ dùng để đánh giá reuse/gap, không xác nhận stakeholder decision.');cell(overview,'A35','Capacity dự kiến có cuối tuần, cần Đức/Dương chốt ngày 06. 21–22 chủ yếu test/fix; ngày 23 chỉ smoke, pilot và xử lý blocker.');
for(const r of [3,13,23,26,27,28,31,32,33,34,35]){overview.getRange(`A${r}:K${r}`).merge();overview.getRange(`A${r}:K${r}`).format.wrapText=true;overview.getRange(`A${r}:K${r}`).format.rowHeight=42;}
columns(overview,{A:24,B:36,C:14,D:24,E:14,F:14,G:15,H:24,I:16,J:22,K:19},38);overview.freezePanes.freezeRows(4);

wb.recalculate();
const val=(s,a)=>s.getRange(a).values[0][0];
assert.equal(val(overview,'B8'),rows.length);assert.equal(val(overview,'E8'),59);assert.equal(val(overview,'J8'),0);assert.equal(val(overview,'B10'),56);assert.equal(val(overview,'E10'),59);assert.equal(val(overview,'J6'),'NOT READY');
assert.equal(milestones.reduce((sum,_,i)=>sum+val(overview,`E${16+i}`),0),59);
for(let day=6;day<=23;day++)assert.equal(val(daily,`J${day}`),rows.filter(t=>t.day===day).length);
const mutations=[];function probe(s,a,v){mutations.push([s,a,val(s,a)]);cell(s,a,v);}
probe(tasks,'R8','ACCEPTED');probe(tasks,'S8',1);probe(tasks,'AA8','PASS');wb.recalculate();assert.equal(val(tasks,'AD8'),0,'Status alone must not count as accepted');
probe(tasks,'V8','QA probe — restored before export');probe(tasks,'Z8',d(6));probe(tasks,'AC8',d(6));wb.recalculate();assert.equal(val(tasks,'AD8'),1);assert.equal(val(overview,'J8'),1);assert.equal(val(overview,'E10'),58);
probe(tasks,'W8','QA blocker');wb.recalculate();assert.equal(val(tasks,'AD8'),0);assert.equal(val(overview,'J6'),'AT RISK');
const depRow=byId.get('T071').row;for(const [col,value] of [['R','ACCEPTED'],['S',1],['AA','PASS'],['V','QA evidence'],['Z',d(6)]])probe(tasks,col+depRow,value);wb.recalculate();assert.equal(val(tasks,'AD'+depRow),0,'Unaccepted prerequisite must block acceptance');
probe(pilot,'H6','PASS');wb.recalculate();assert.equal(val(pilot,'M6'),0,'PASS alone must not count');
probe(pilot,'G6','QA probe');probe(pilot,'I6','QA evidence');probe(pilot,'J6','QA/Agent');probe(pilot,'K6',d(6));wb.recalculate();assert.equal(val(pilot,'M6'),1);assert.equal(val(overview,'E6'),1/17);
while(mutations.length){const [s,a,v]=mutations.pop();cell(s,a,v);}
cell(overview,'B4',d(9));wb.recalculate();assert.equal(val(overview,'J9'),12);assert.equal(val(overview,'J6'),'AT RISK');cell(overview,'B4',d(6));wb.recalculate();assert.equal(val(overview,'J8'),0);assert.equal(val(overview,'E6'),0);
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!',options:{useRegex:true,maxResults:30},maxChars:6000});
await fs.writeFile(out+'/daily-formula-inspection.json',JSON.stringify(errors,null,2));
await fs.mkdir(out,{recursive:true});
for(const [name,range,label] of [['Tổng quan','A1:K20','overview'],['Công việc','G7:U10','tasks'],['Theo ngày','A5:G8','daily'],['Rủi ro & Quyết định','A5:H9','risks'],['Nghiệm thu Pilot','A5:F9','pilot']]){const img=await wb.render({sheetName:name,range,scale:1,format:'png'});await fs.writeFile(out+`/daily-${label}.png`,new Uint8Array(await img.arrayBuffer()));}
for(const [path,hash] of hashes)assert.equal(crypto.createHash('sha256').update(await fs.readFile(root+'/'+path)).digest('hex'),hash,'Protected source changed: '+path);
await (await SpreadsheetFile.exportXlsx(wb)).save(filename);
console.log(JSON.stringify({filename,total:rows.length,priorities:Object.fromEntries(['P0','P1','P2','P3'].map(p=>[p,rows.filter(t=>t.pri===p).length])),milestones:milestones.map(([id])=>({id,tasks:rows.filter(t=>milestone(t.day)===id).length})),inspection:errors},null,2));
