import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const outputDir=fileURLToPath(new URL('../../outputs/progress-tracker', import.meta.url));
const wb=Workbook.create();
const summary=wb.worksheets.add('Tong quan');
const tasks=wb.worksheets.add('Cong viec');
const date=d=>new Date(Date.UTC(2026,9,d));
const serial=d=>Math.round((Date.UTC(2026,9,d)-Date.UTC(1899,11,30))/86400000);
const milestones=[
 ['M1','Identity và quyền dịch vụ',6,8,'Login thật; ngoài Intrepid bị chặn; Sheet/AI access sẵn sàng.'],
 ['M2','Sheet roster và routing',9,12,'Sheet import; confirm profile; đúng zone; không truy cập chéo.'],
 ['M3','Learning flow thật',13,16,'Hai lượt AI; feedback/compare; refresh vẫn giữ progress.'],
 ['M4','Trainer và Head tối thiểu',17,20,'Trainer sửa/publish bài; Head xem progress đúng phòng ban.'],
 ['M5','Rehearsal và nghiệm thu',21,23,'Demo ba vai trò; lỗi được sửa; Đức nghiệm thu ngày 23.']
];
// Dates for detail tasks and role suggestions are proposed, not actual ownership.
const raw=[
 ['T01','M1','Chốt pilot, owner và capacity',6,6,'Đức / PM','Có owner cụ thể, scope pilot và capacity; không tự giả định làm cuối tuần.','',true],
 ['T02','M1','Mở quyền private Google Sheet',6,8,'IT Intrepid','Đọc được Sheet/tab hoặc export được phép; đủ Email/Full Name/Department/Country.','T01',true],
 ['T03','M1','Chốt SSO/domain và login foundation',6,8,'Engineering + IT','Login/logout/session thật; account ngoài phạm vi bị chặn; role không lấy từ browser.','T01',true],
 ['T04','M1','Xác minh GCP AI access sớm',6,8,'IT + Engineering','Gọi provider thật được phép; backend credential; không lộ secret.','T01',true],
 ['T05','M1','Tách môi trường pilot và kiểm DB/RPC',6,8,'Engineering','Bản cũ độc lập; pilot config và RPC/migration compatibility được kiểm.','T01',true],
 ['T06','M1','Chọn Sync now hoặc Sheet-export CSV',8,8,'Trainer + Engineering','Chọn một đường; private access hoặc authorized export; không xây worker/Redis.','T02',true],
 ['T07','M2','Validate/preview/import roster từ Sheet',9,10,'Engineering','Bốn trường được validate; duplicate/error có dòng/lý do; không apply nửa batch.','T06, T05',true],
 ['T08','M2','Idempotent sync và giữ last good snapshot',9,12,'Engineering','Sync lại không trùng; API lỗi giữ snapshot; batch ID/timestamp/counts rõ.','T07',true],
 ['T09','M2','Match roster và confirm/correct profile',9,12,'Engineering','User match đúng; user ngoài roster bị chặn; correction không tự tăng quyền.','T03, T07',true],
 ['T10','M2','Department zone và isolation DB/API',9,12,'Engineering','Route đúng; learner/Head không đọc dữ liệu department khác bằng direct request.','T09, T05',true],
 ['T11','M2','Duyệt một lesson, SOP và sample data',9,12,'Đức / Trainer','Có scenario, SOP/link, sample data được phép, rubric feedback; không ingest 550 nguồn.','T01',true],
 ['T12','M3','Assigned course/lesson đúng context',13,14,'Engineering + Trainer','User nhận đúng published lesson/context; không fallback course khác.','T10, T11',true],
 ['T13','M3','Run AI và output thật',13,14,'Engineering','Canonical lesson/context; GCP provider thật; timeout/error rõ; không simulation.','T04, T12',true],
 ['T14','M3','Evaluation/feedback và provenance',14,16,'Engineering','Feedback thật; client không tự tạo score được tin; xử lý validator NULL gap.','T13',true],
 ['T15','M3','Persist attempts/progress và retry',14,16,'Engineering','Refresh/relogin giữ attempt/progress; retry không trùng; save lỗi không báo success.','T14, T05',true],
 ['T16','M3','Rerun và compare hai attempts thật',15,16,'Engineering','Hai lần run đúng output/feedback; compare từ attempts thật; async gắn đúng run.','T15',true],
 ['T17','M4','Trainer quản lý course/lesson/context',17,19,'Engineering + Trainer','Đức sửa/gắn SOP/sample/publish bài; learner nhận đúng phiên bản.','T12, T15',true],
 ['T18','M4','Trainer xem learner/cohort/progress',17,20,'Engineering','Xem DB progress cơ bản; completed run không ghi là mastery.','T15',true],
 ['T19','M4','Head login và own-department progress',17,20,'Engineering','Head read-only đúng team; ngoài quyền bị chặn ở data/API; không role instructor global.','T10, T15',true],
 ['T20','M4','EN/VI thiết yếu và lỗi UI rõ',17,20,'Engineering + Trainer','Pilot path EN/VI đọc được; thông báo sync/evaluate/save không gây hiểu sai.','T16',false],
 ['T21','M4','Demo ba vai trò và freeze feature',20,20,'Trainer + Engineering','Learner/Trainer/Head nối thành công; sau gate chỉ sửa blocker, không thêm feature defer.','T16, T17, T18, T19, T20',true],
 ['T22','M5','Rehearsal bằng roster và user thật',21,21,'Đức + QA','Chạy Sheet tới progress và ba vai trò; ghi blocker/owner/action cụ thể.','T21',true],
 ['T23','M5','Negative tests và lỗi/retry/relogin',21,22,'QA + Engineering','Cross-department bị chặn; invalid Sheet/API/evaluate/save lỗi không làm mất dữ liệu.','T22',true],
 ['T24','M5','Sửa blocker và rehearsal lại',22,22,'Engineering + QA','Không blocker roster/login/routing/AI/feedback/compare/progress/isolation; demo lặp được.','T23',true],
 ['T25','M5','Đức nghiệm thu usable pilot',23,23,'Đức / Trainer','Đức xác nhận toàn flow thật; có evidence demo, progress bền vững, Head đúng quyền.','T24',true]
];
const first=8,last=first+raw.length-1;
for(const sh of [summary,tasks]){sh.showGridLines=false;sh.getRange(sh===summary?'A1:J35':`A1:S${last}`).format.font={name:'Arial',size:10,color:'#243247'};sh.getRange(sh===summary?'A1:J35':`A1:S${last}`).format.verticalAlignment='center';}
summary.tabColor='#243247'; tasks.tabColor='#4E6B8B';
function title(sh,cell,text){sh.getRange(cell).values=[[text]];sh.getRange(cell).format.font={name:'Arial',size:16,bold:true,color:'#243247'};}
function header(sh,range){sh.getRange(range).format={fill:'#243247',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',rowHeight:32};}
function label(sh,range,text){sh.getRange(range).values=[[text]];sh.getRange(range).format.font={name:'Arial',size:10,bold:true,color:'#243247'};}
title(summary,'A2','Promptify Intrepid — theo dõi pilot 23/10/2026');
summary.getRange('A3').values=[['Lịch dự kiến theo plan; actual chưa cập nhật. Ngày theo Asia/Saigon.']];
summary.getRange('A3').format.font={name:'Arial',size:10,italic:true,color:'#64748B'};
summary.getRange('A4:B5').values=[['Ngày báo cáo (sửa mỗi ngày)',date(6)],['Deadline confirmed',date(23)]];
summary.getRange('B4:B5').setNumberFormat('dd/mm/yyyy');summary.getRange('B4').format.fill='#FFF1CF';
summary.getRange('D4:E5').values=[['Còn ngày lịch',null],['Đã nghiệm thu',null]];
summary.getRange('E4').formulas=[['=MAX(0,B5-B4)']];
summary.getRange('E5').formulas=[[`=SUM('Cong viec'!R${first}:R${last})&" / ${raw.length}"`]];
summary.getRange('G4:H5').values=[['Việc bị chặn',null],['Việc quá hạn',null]];
summary.getRange('H4').formulas=[[`=COUNTIFS('Cong viec'!S${first}:S${last},"Bị chặn")`]];
summary.getRange('H5').formulas=[[`=COUNTIFS('Cong viec'!S${first}:S${last},"Quá hạn")`]];
summary.getRange('A7').values=[['Nghiệm thu = hoàn thành + 100% + owner + evidence + ngày hoàn tất hợp lệ + không blocker.']];
summary.getRange('A7').format.font={name:'Arial',size:10,italic:true,color:'#64748B'};
summary.getRange('A9:J9').values=[['Mốc','Kết quả cuối mốc','Bắt đầu','Hạn demo','Số việc','Đã nghiệm thu','% nghiệm thu','Chưa cập nhật','Bị chặn / trễ','Cảnh báo']];header(summary,'A9:J9');
const b=`'Cong viec'!$B$${first}:$B$${last}`,r=`'Cong viec'!$R$${first}:$R$${last}`,i=`'Cong viec'!$I$${first}:$I$${last}`,s=`'Cong viec'!$S$${first}:$S$${last}`;
for(let x=0;x<5;x++){const y=10+x,m=milestones[x];summary.getRange(`A${y}:D${y}`).values=[[m[0],m[1],date(m[2]),date(m[3])]];
 summary.getRange(`E${y}:J${y}`).formulas=[[
 `=COUNTIFS(${b},A${y})`,`=SUMIFS(${r},${b},A${y})`,`=IF(H${y}=E${y},"Chưa cập nhật",F${y}/E${y})`,
 `=COUNTIFS(${b},A${y},${i},"Chưa cập nhật")`,`=COUNTIFS(${b},A${y},${s},"Bị chặn")+COUNTIFS(${b},A${y},${s},"Quá hạn")`,
 `=IF(F${y}=E${y},"Đã nghiệm thu",IF(I${y}>0,"Cần xử lý",IF(D${y}<$B$4,"Mốc đã quá hạn",IF(H${y}>0,"Thiếu cập nhật","Đang theo dõi"))))`
 ]];}
summary.getRange('C10:D14').setNumberFormat('dd/mm');summary.getRange('G10:G14').setNumberFormat('0%');
summary.getRange('A10:J14').format.rowHeight=32;summary.getRange('B10:B14').format.wrapText=true;summary.getRange('G10:G14').format.horizontalAlignment='center';
label(summary,'A16','Đường găng');
summary.getRange('A17').values=[['Sheet access → roster → identity/profile → department quyền → lesson → AI/feedback → progress → ba vai trò → rehearsal.']];
label(summary,'A19','Demo bắt buộc cuối mỗi mốc');
for(let x=0;x<5;x++)summary.getRange(`A${20+x}:B${20+x}`).values=[[milestones[x][0],milestones[x][4]]];
summary.getRange('B20:B24').format.wrapText=false;
label(summary,'A26','Cắt / defer trước nếu trễ');
summary.getRange('A27').values=[['Library/analytics nâng cao; auto-sync/worker/Redis; ingest SOP phức tạp; SSE; Head nâng cao; i18n polish.']];
summary.getRange('A28').values=[['Giữ Sheet roster, login/profile/zone, AI/feedback/compare, progress, isolation, Trainer/Head cơ bản và rehearsal.']];
label(summary,'A30','Cách cập nhật mỗi ngày');
summary.getRange('A31').values=[['1. Đổi ngày báo cáo B4. 2. Mở Cong viec, điền owner, trạng thái, %, blocker, bước tiếp, evidence và ngày thực tế.']];
summary.getRange('A32').values=[['Ô vàng là input. Owner để trống chờ phân công; vai trò chỉ là gợi ý. % nghiệm thu tính theo số việc, không theo effort.']];
summary.getRange('A33').values=[['Ngày chi tiết là lịch đề xuất; không mặc định làm cuối tuần. Không tick hoàn thành chỉ vì code cũ đã có chức năng.']];
for(const [col,width] of Object.entries({A:31,B:39,C:11,D:12,E:10,F:13,G:14,H:14,I:14,J:22}))summary.getRange(`${col}1:${col}35`).format.columnWidth=width;

title(tasks,'A2','Công việc pilot 06–23/10/2026');
tasks.getRange('A3').values=[['Nguồn: Implementation plan cập nhật 06/10/2026, milestones M1–M5; Decision log S3, D24/D34/D35.']];
tasks.getRange('A4').values=[['Chưa xác nhận hiện trạng. Điền owner và actual; dependencies dùng Task ID. Mọi việc ở đây thuộc pilot, không có backlog defer.']];
tasks.getRange('A5').values=[['Chỉ dùng “Hoàn thành” khi DoD đạt; thêm evidence, ngày hoàn tất và 100%. Blocker khác vẫn khiến việc chưa nghiệm thu.']];
tasks.getRange('A7:S7').values=[['ID','Mốc','Hạng mục / kết quả','Owner thực tế','Vai trò gợi ý','Bắt đầu KH','Hạn KH','Đường găng','Trạng thái','% thực tế','Dependencies','Blocker hiện tại','Bước tiếp / xử lý','Definition of Done','Link / evidence','Cập nhật lúc','Hoàn tất lúc','Đủ nghiệm thu','Cảnh báo']];header(tasks,'A7:S7');
const values=raw.map(t=>[t[0],t[1],t[2],null,t[5],date(t[3]),date(t[4]),t[8]?'Có':'Không','Chưa cập nhật',null,t[7],null,null,t[6],null,null,null,null,null]);
tasks.getRange(`A${first}:S${last}`).values=values;
const taskTable=tasks.tables.add(`A7:S${last}`,true,'PilotTasks');taskTable.showFilterButton=true;
for(let row=first;row<=last;row++){
 tasks.getRange(`R${row}:S${row}`).formulas=[[
 `=IF(AND(I${row}="Hoàn thành",J${row}=1,D${row}<>"",O${row}<>"",ISNUMBER(Q${row}),Q${row}<='Tong quan'!$B$4,L${row}=""),1,0)`,
 `=IF(R${row}=1,"Đã nghiệm thu",IF(OR(I${row}="Bị chặn",L${row}<>""),"Bị chặn",IF(I${row}="Hoàn thành","Thiếu xác nhận",IF(G${row}<'Tong quan'!$B$4,"Quá hạn",IF(I${row}="Chưa cập nhật","Chưa cập nhật","Theo kế hoạch")))))`
 ]];
}
tasks.getRange(`F${first}:G${last}`).setNumberFormat('dd/mm/yyyy');tasks.getRange(`P${first}:Q${last}`).setNumberFormat('dd/mm/yyyy');tasks.getRange(`J${first}:J${last}`).setNumberFormat('0%');
tasks.getRange(`I${first}:I${last}`).dataValidation={rule:{type:'list',values:['Chưa cập nhật','Chưa bắt đầu','Đang làm','Bị chặn','Chờ review','Hoàn thành']}};
tasks.dataValidations.add({range:`J${first}:J${last}`,rule:{type:'decimal',operator:'between',formula1:0,formula2:1}});
tasks.getRange(`A${first}:S${last}`).format.rowHeight=76;tasks.getRange(`A${first}:S${last}`).format.wrapText=true;
for(const col of ['D','I','J','L','M','O','P','Q'])tasks.getRange(`${col}${first}:${col}${last}`).format.fill='#FFF5DD';
tasks.getRange(`R${first}:S${last}`).format.fill='#EDF2F7';
tasks.getRange(`S${first}:S${last}`).conditionalFormats.add('containsText',{text:'Quá hạn',format:{fill:'#FDE8E8',font:{color:'#9B1C1C',bold:true}}});
tasks.getRange(`S${first}:S${last}`).conditionalFormats.add('containsText',{text:'Bị chặn',format:{fill:'#FDE8E8',font:{color:'#9B1C1C',bold:true}}});
tasks.getRange(`S${first}:S${last}`).conditionalFormats.add('containsText',{text:'Đã nghiệm thu',format:{fill:'#E7F4EC',font:{color:'#1D6B42'}}});
tasks.getRange(`S${first}:S${last}`).conditionalFormats.add('containsText',{text:'Thiếu xác nhận',format:{fill:'#FFF1CF',font:{color:'#945F00'}}});
summary.getRange('J10:J14').conditionalFormats.add('containsText',{text:'Cần xử lý',format:{fill:'#FDE8E8',font:{color:'#9B1C1C',bold:true}}});
for(const [col,width] of Object.entries({A:8,B:7,C:34,D:19,E:24,F:13,G:13,H:12,I:18,J:12,K:24,L:32,M:32,N:65,O:34,P:14,Q:14,R:15,S:21}))tasks.getRange(`${col}1:${col}${last}`).format.columnWidth=width;
tasks.freezePanes.freezeRows(7);tasks.freezePanes.freezeColumns(3);

// Behavior tests, restored before delivery.
wb.recalculate();
assert.equal(summary.getRange('G10').values[0][0],'Chưa cập nhật');
tasks.getRange('I8:J8').values=[['Hoàn thành',1]];wb.recalculate();assert.equal(tasks.getRange('R8').values[0][0],0);assert.equal(tasks.getRange('S8').values[0][0],'Thiếu xác nhận');
tasks.getRange('D8').values=[['Người test']];tasks.getRange('O8').values=[['Evidence test']];tasks.getRange('Q8').values=[[date(6)]];wb.recalculate();assert.equal(tasks.getRange('R8').values[0][0],1);assert.equal(summary.getRange('F10').values[0][0],1);
tasks.getRange('L8').values=[['Blocker test']];wb.recalculate();assert.equal(tasks.getRange('R8').values[0][0],0);assert.equal(tasks.getRange('S8').values[0][0],'Bị chặn');assert.equal(summary.getRange('H4').values[0][0],1);
tasks.getRange('I8:J8').values=[['Chưa cập nhật',null]];for(const col of ['D','O','Q','L'])tasks.getRange(`${col}8`).values=[[null]];
summary.getRange('B4').values=[[date(9)]];wb.recalculate();assert.equal(tasks.getRange('S8').values[0][0],'Quá hạn');assert.equal(summary.getRange('H5').values[0][0],6);
summary.getRange('B4').values=[[date(6)]];wb.recalculate();assert.equal(summary.getRange('H5').values[0][0],0);
assert.equal(new Set(raw.map(x=>x[0])).size,raw.length);for(const t of raw)for(const id of t[7].split(',').map(x=>x.trim()).filter(Boolean))assert(raw.some(x=>x[0]===id));
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:2000});console.log(errors.ndjson);
console.log((await wb.inspect({kind:'region',sheetId:'Tong quan',range:'A9:J14',maxChars:2400,tableMaxRows:6,tableMaxCols:10})).ndjson);
await fs.mkdir(outputDir,{recursive:true});
for(const [sheet,range,name] of [['Tong quan','A1:J34','summary'],['Cong viec','A7:J13','tasks'],['Cong viec','K7:S12','details']]){const img=await wb.render({sheetName:sheet,range,scale:1,format:'png'});await fs.writeFile(`${outputDir}/${name}.png`,new Uint8Array(await img.arrayBuffer()));}
const file=await SpreadsheetFile.exportXlsx(wb);await file.save(`${outputDir}/Promptify_Intrepid_Progress_06-23_Oct_2026.xlsx`);
console.log(JSON.stringify({output:`${outputDir}/Promptify_Intrepid_Progress_06-23_Oct_2026.xlsx`,tasks:raw.length,milestones:5,checks:'behavior/formula/source-dependency tests passed'}));
