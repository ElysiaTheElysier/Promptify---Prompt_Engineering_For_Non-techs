import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const plan={
6:[
['[Reuse] Kiểm branch/env và tách pilot deploy/DB','vercel.json / vite.config.ts / supabaseClient.ts','Dương','Pilot chạy React/Vite/Supabase riêng; xác định ledger 016/017.'],
['[Modify] Map resolveUserSession và OAuth identity','App.tsx / dbService.ts / users, learners','Dương','Xác định đường auto-create hiện tại và mapping auth UID → user.'],
['[DB] Thiết kế delta roster, membership và Head','schema.sql / types/database.ts; migration mới','Dương','Chọn membership 1 department/user cho pilot; country và Head role rõ.']],
7:[
['[DB] Thêm department/country và roster snapshot','supabase/migrations (mới) / types/database.ts','Dương','DB pilot có roster/membership; email normalized unique, role không lấy từ Sheet.'],
['[Modify] Gate Intrepid identity phía server','App.tsx / apiAuthorizationService.ts','Dương','JWT hợp lệ và email đã xác thực; domain ngoài allowlist bị từ chối.'],
['[DB] Siết auth UID link và quyền đổi role','dbService.ts / RLS users, learners','Dương','Auth UID unique; learner không sửa role/department hoặc tự link user khác.']],
8:[
['[RLS] Thêm department scope cho class/content','RLS classes/enrollments/courses; migration mới','Dương','Seed 2 department kiểm được quyền; Head không dùng is_instructor global.'],
['[Modify] Bỏ public enroll và non-UUID bypass','App.tsx / apiAuthorizationService.ts','Dương','Intrepid không self-enroll; API bắt buộc lesson UUID thuộc course được phép.'],
['[Test] Login/role isolation và credential smoke','LandingLoginScreen.tsx / apiServerService.ts','Dương','OAuth refresh/logout đúng; role không tự tăng; generate/Judge credential chạy thật.']],
9:[
['[New] Tạo Sheet demo 4 field, 2 department','Google Sheet mẫu (ngoài codebase)','Dương','10 user có Email/Full Name/Department/Country; Dương cấp backend quyền đọc.'],
['[New] Đọc private Sheet phía backend','api/roster-sync.ts + sheetRosterService.ts (mới)','Dương','Server đọc được Sheet/tab cấu hình; secret không vào frontend.'],
['[New] Parse và validate roster theo row','sheetRosterService.ts (mới)','Dương','Trim/lower email; thiếu field, duplicate và department lạ báo row lỗi.']],
10:[
['[DB] Upsert roster/learner/enrollment idempotent','RPC import_roster (mới) / users, learners, enrollments','Dương','10 row vào DB; import lại không trùng; batch lỗi không apply nửa chừng.'],
['[New] Nối manual Sync roster cho Trainer','InstructorViewShell.tsx / api/roster-sync.ts (mới)','Dương','Chỉ Trainer sync được; UI thấy success/error và row lỗi.'],
['[Test] Lỗi Sheet/import giữ snapshot thành công','sheetRosterService.ts / RPC import_roster (mới)','Dương','Timeout/duplicate/bad row không xóa roster hoặc progress cũ.']],
11:[
['[Modify] Match roster sau OAuth, bỏ auto-resolve cũ','App.tsx resolveUserSession / dbService.ts','Dương','Email đã xác thực match roster; ngoài roster không vào learning zone.'],
['[New] Thêm confirm profile và correction state','App.tsx / ProfileConfirm.tsx (mới) / membership','Dương','Learner xác nhận 4 field; yêu cầu sửa không tự tăng quyền.'],
['[Modify] Route zone từ membership/enrollment','App.tsx / dbService.ts / classes, enrollments','Dương','Learner mở đúng class/department; direct URL không đổi scope.']],
12:[
['[RLS] Siết lesson/resources/attempt/progress đọc','RLS lessons/resources/prompt_attempts/lesson_progress','Dương','Learner/Head A không query dữ liệu B; Trainer dùng assignment được cấp.'],
['[Test] Negative JWT/roster/department requests','apiAuthorizationService.ts / API + Supabase tests','Dương','No JWT, ngoài roster, lesson sai course và department khác đều bị chặn.'],
['[Test] Sheet → DB → login → confirm → zone','App.tsx / api/roster-sync.ts / membership','Dương','10 user mẫu chạy thật; sửa Sheet rồi manual sync đổi scope đúng.']],
13:[
['Chọn SOP/sample data được phép dùng cho pilot','Nội dung lesson_resources / lessons','Thầy Đức','Có 1 scenario Intrepid, SOP và sample data được duyệt gửi AI.'],
['Chốt lesson/rubric và feedback nghiệp vụ','lessons / lesson_rubric_criteria (nội dung)','Thầy Đức','Một lesson có mục tiêu/rubric rõ; không tự áp threshold mastery.'],
['[Reuse] Seed course/module/lesson thật, bỏ fallback','CourseCurriculumEditor.tsx / App.tsx / curriculumAdapter.ts','Dương','Course published gắn department; lỗi DB không dùng LABS_DATA làm bài thật.']],
14:[
['[Modify] Generate resolve SOP/context server-side','api/generate.ts / apiServerService.ts / lesson query','Dương','Server tải lesson_resources canonical; không tin inputContext client.'],
['[Modify] Judge dùng rubric/output canonical','api/evaluate.ts / aiEvaluationContract.ts','Dương','Evaluate dùng lesson rubric và output server lưu theo run ID.'],
['[Reuse] Adapt AI provider theo credential thực tế','apiServerService.ts / llmService.ts / vite.config.ts','Dương','Generate/Judge dùng credential Intrepid; dev/Vercel cùng contract, không key browser.']],
15:[
['[DB/API] Lưu run/attempt bằng kết quả server','api/generate.ts / api/evaluate.ts / RPC mới','Dương','Run ID gắn user/lesson; client không tự ghi output/score được tin cậy.'],
['[DB] Sửa validator NULL và siết RPC provenance','migrations 016/017 + migration mới / prompt_attempts','Dương','JSON thiếu key không có best_score; forged write bị chặn; trigger progress atomic.'],
['[Modify] Hybrid dùng run ID và save/error state','HybridView.tsx / llmService.ts / dbService.ts','Dương','Output/Judge/save khớp run; save fail không báo completed; retry không trùng.']],
16:[
['[Reuse] Reload attempts và compare 2 lần chạy','HybridView.tsx / PromptComposer.tsx / dbService.ts','Dương','Rerun/compare từ attempt thật; refresh/login lại giữ progress.'],
['[Test] Evaluate retry/save failure và run overlap','HybridView.tsx / RPC attempts, lesson_progress','Dương','Retry Judge không thêm attempt; run cũ không ghi đè output mới.'],
['Nghiệm thu learning slice trên dữ liệu Intrepid','App.tsx / HybridView.tsx / curriculum DB','Dương + Thầy Đức','Lesson → AI → feedback → rerun/compare → refresh chạy đúng nghiệp vụ.']],
17:[
['[Modify] Trainer query theo course assignment','InstructorViewShell.tsx / dbService.ts / course_instructors','Dương','Trainer đọc đúng learner/cohort/course được giao; bỏ client global aggregation.'],
['[Reuse] Gắn SOP/sample bằng text/URL resources','CourseCurriculumEditor.tsx / lesson_resources','Dương','Trainer sửa SOP/sample và reload còn dữ liệu; không xây ingestion mới.'],
['[Modify] Publish/assign lesson cho department','CourseCurriculumEditor.tsx / courses, classes','Dương','Draft không hiện cho learner; published assigned lesson tải đúng context.']],
18:[
['[Modify] Route Head vào view read-only','App.tsx / InstructorViewShell.tsx / role mapping','Dương','Head không mở CRUD/Sync của Trainer; login vào đúng department.'],
['[RLS] Chặn Head đọc/sửa ngoài department','RLS users/classes/enrollments/progress','Dương','Head A chỉ SELECT scope A; direct request sửa hoặc đọc B bị từ chối.'],
['[Reuse] Query progress tối thiểu cho Head','dbService.ts / InstructorViewShell.tsx / lesson_progress','Dương','Head thấy learner, attempts và last activity; completed run không gọi mastery.']],
19:[
['[Modify] Save lesson/rubric/resources nhất quán','CourseCurriculumEditor.tsx / dbService.ts / RPC mới','Dương','Save lỗi không để lesson nửa cập nhật; publish sau đủ content.'],
['[Modify] Tách cache/session theo account-class','App.tsx / HybridView.tsx / localStorage keys','Dương','Logout/login account khác không thấy prompt/output/assistance cũ.'],
['[Modify] Gọn nhãn EN/VI và ẩn key controls','PromptComposer.tsx / InstructorViewShell.tsx','Dương','Flow pilot có nhãn dễ hiểu; learner không nhập/xem secret API key.','P1']],
20:[
['[Deploy] Đồng bộ migration/API/UI lên pilot','vercel.json / vite.config.ts / migrations mới','Dương','Pilot deploy đúng revision/schema; smoke auth/import/AI/progress thành công.'],
['[Test] Regression Trainer/Head/publish trên pilot','InstructorViewShell.tsx / RLS / curriculum editor','Dương','CRUD/publish và progress 2 department đúng scope trên DB deployed.'],
['Nghiệm thu 3 vai trò và đóng băng feature','App.tsx / HybridView.tsx / InstructorViewShell.tsx','Dương + Thầy Đức','Learner/Trainer/Head dùng được; sau 20/10 chỉ sửa lỗi chặn pilot.']],
21:[
['[Test] E2E Sheet → learning → progress reload','Browser pilot / roster API / AI API / DB','Dương','Chạy toàn flow bằng user thật; ghi lỗi/repro vào Ghi chú task.'],
['[Test] JWT/RLS và cross-department/role matrix','apiAuthorizationService.ts / RLS pilot DB','Dương','Learner/Trainer/Head và direct requests không vượt scope.'],
['[Test] Roster/AI/save lỗi và login/logout','Sheet service / HybridView.tsx / RPC / App.tsx','Dương','Malformed roster, provider fail, save fail và refresh không mất/lộ dữ liệu.']],
22:[
['[Fix] Sửa lỗi chặn pilot theo repro ngày 21','Module/API/RLS có lỗi; xác định từ rehearsal','Dương','Lỗi P0 được sửa và test lại; không mở scope feature.'],
['[Test] Chạy regression và rehearsal lần 2','Browser pilot / AI API / Supabase RPC/RLS','Dương','Các case lỗi PASS lại; toàn flow chạy 2 lần không duplicate attempt.'],
['[Deploy] Chốt release và kiểm cấu hình rollback','Vercel config / Supabase migration ledger','Dương','Release/schema tương thích; biết cách quay UI/API về bản ổn không mất data.']],
23:[
['[Test] Final smoke pilot URL và credential','Pilot deploy / auth / roster / generate/evaluate','Dương','Import/login/AI/save hoạt động; không feature development lớn.'],
['Nghiệm thu pilot end-to-end ba vai trò','App.tsx / HybridView.tsx / InstructorViewShell.tsx','Dương + Thầy Đức','Đức xác nhận flow nghiệp vụ và progress đúng department.'],
['[Fix] Xử lý blocker pilot và retest scope bị ảnh hưởng','Module/API/RLS phát sinh lỗi khi pilot','Dương','Nếu có blocker: sửa/retest; nếu không: kiểm stability, không thêm feature.']]
};
const dir=fileURLToPath(new URL('../../outputs/progress-tracker', import.meta.url)),file=dir+'/Promptify_Intrepid_Progress_06-23_Oct_2026.xlsx';
const milestone=n=>n<=8?'M1 — Identity':n<=12?'M2 — Sheet + Profile':n<=16?'M3 — Learning flow':n<=20?'M4 — Trainer + Head':'M5 — Hardening';
const data=Object.entries(plan).flatMap(([n,items])=>items.map(([task,code,owner,result,priority])=>[new Date(Date.UTC(2026,9,+n)),milestone(+n),task,code,priority||'P0',owner,result,'Chưa làm',null]));
const wb=Workbook.create(),s=wb.worksheets.add('Kế hoạch triển khai'),last=8+data.length;
const cell=(a,v)=>s.getRange(a).values=[[v]],formula=(a,v)=>s.getRange(a).formulas=[[v]];
s.showGridLines=false;s.getRange(`A1:I${last}`).format={font:{name:'Arial',size:11,color:'#243247'},verticalAlignment:'top',wrapText:true};
cell('A1','PROMPTIFY → INTREPID · TECHNICAL IMPLEMENTATION PLAN');s.getRange('A1:I1').merge();s.getRange('A1').format.font={size:16,bold:true,color:'#243247'};s.getRange('A1:I1').format.rowHeight=32;
cell('A3','Deadline');cell('B3',new Date(Date.UTC(2026,9,23)));cell('C3','Tiến độ');formula('D3',`=COUNTIF(H9:H${last},"Hoàn thành")/(COUNTA(C9:C${last})-COUNTIF(H9:H${last},"Defer"))`);cell('E3','P0 chưa xong');formula('F3',`=COUNTIFS(E9:E${last},"P0",H9:H${last},"<>Hoàn thành")`);cell('G3','Blocker');formula('H3',`=COUNTIF(H9:H${last},"Bị chặn")`);
s.getRange('B3').setNumberFormat('dd/mm');s.getRange('D3').setNumberFormat('0%');s.getRange('A3:I3').format.rowHeight=32;
cell('A4','Feature Freeze: 20/10  ·  Rehearsal: 21–22/10  ·  Pilot: 23/10');s.getRange('A4:I4').merge();
cell('A5','Reuse React/Vite/Supabase/Vercel. 3 task/ngày; technical task dự kiến 2–3 giờ, owner/giải pháp là đề xuất. File mới ghi “mới”; chưa implement.');s.getRange('A5:I5').merge();s.getRange('A5:I5').format.rowHeight=28;
cell('A6','Sheet mẫu Dương tạo; manual Sync. Chỉ ghi blocker đã xác minh; credential GCP/SOP thiếu quyền cần kiểm ngày 08/13. Sau pilot: Redis/auto-sync/SSE, analytics/library nâng cao, ingestion/video, multi-tenant/white-label/payment/partner/clone.');s.getRange('A6:I6').merge();s.getRange('A6:I6').format.rowHeight=35;
s.getRange('A8:I8').values=[['Ngày','Mốc','Technical Task','Code / DB bị tác động','Ưu tiên','Owner','Kết quả cần đạt','Trạng thái','Blocker / Ghi chú']];s.getRange(`A9:I${last}`).values=data;
const table=s.tables.add(`A8:I${last}`,true,'ImplementationTasks');table.style='TableStyleLight9';table.showFilterButton=true;
s.getRange('A8:I8').format={fill:'#243247',font:{bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:34};
for(const [col,width] of Object.entries({A:11,B:22,C:52,D:55,E:14,F:23,G:55,H:19,I:26}))s.getRange(`${col}1:${col}${last}`).format.columnWidth=width;
s.getRange(`A9:A${last}`).setNumberFormat('dd/mm');s.getRange(`A9:I${last}`).format.rowHeight=58;
let r=9,idx=0;for(const items of Object.values(plan)){s.getRange(`A${r}:I${r+items.length-1}`).format.fill=idx++%2?'#F3F6FA':'#FFFFFF';r+=items.length;}
s.getRange(`E9:E${last}`).dataValidation={rule:{type:'list',values:['P0','P1','P2']}};s.getRange(`F9:F${last}`).dataValidation={rule:{type:'list',values:['Dương','Thầy Đức','Dương + Thầy Đức']}};s.getRange(`H9:H${last}`).dataValidation={rule:{type:'list',values:['Chưa làm','Đang làm','Bị chặn','Chờ nghiệm thu','Hoàn thành','Defer']}};
s.getRange(`A9:I${last}`).conditionalFormats.addCustom('AND(ISNUMBER($A9),$A9=TODAY(),$H9<>"Hoàn thành",$H9<>"Defer")',{fill:'#E7F0FB'});
for(const [status,fill,color] of [['Hoàn thành','#DCFCE7','#166534'],['Đang làm','#DBEAFE','#1D4ED8'],['Bị chặn','#FEE2E2','#991B1B'],['Chờ nghiệm thu','#FEF3C7','#92400E'],['Chưa làm','#F3F4F6','#475569'],['Defer','#E5E7EB','#6B7280']])s.getRange(`H9:H${last}`).conditionalFormats.add('cellIs',{operator:'equal',formula:`"${status}"`,format:{fill,font:{color,bold:true}}});
s.getRange(`E9:E${last}`).conditionalFormats.add('cellIs',{operator:'equal',formula:'"P0"',format:{fill:'#FEE2E2',font:{bold:true,color:'#991B1B'}}});s.freezePanes.freezeRows(8);s.freezePanes.freezeColumns(2);
wb.recalculate();const val=a=>s.getRange(a).values[0][0];assert.equal(data.length,54);assert.equal(val('F3'),53);assert.equal(val('H3'),0);assert.equal(val('D3'),0);cell('H9','Hoàn thành');wb.recalculate();assert.equal(val('D3'),1/54);assert.equal(val('F3'),52);cell('H9','Bị chặn');wb.recalculate();assert.equal(val('H3'),1);cell('H9','Chưa làm');wb.recalculate();
for(let n=6;n<=23;n++)assert.equal(data.filter(x=>x[0].getUTCDate()===n).length,3);
assert(data.every(x=>['Dương','Thầy Đức','Dương + Thầy Đức'].includes(x[5])));assert(data.every(x=>x[3]&&x[6]));
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
for(const [range,name] of [['A1:I17','top'],['A36:I44','learning'],['A54:I62','pilot']]){const img=await wb.render({sheetName:'Kế hoạch triển khai',range,scale:1,format:'png'});await fs.writeFile(dir+`/technical-${name}.png`,new Uint8Array(await img.arrayBuffer()));}
await (await SpreadsheetFile.exportXlsx(wb)).save(file);
console.log(JSON.stringify({total:data.length,owners:Object.fromEntries(['Dương','Thầy Đức','Dương + Thầy Đức'].map(o=>[o,data.filter(x=>x[5]===o).length])),p0:data.filter(x=>x[4]==='P0').length,file}));
