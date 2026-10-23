import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const dir=fileURLToPath(new URL('../../outputs/progress-tracker', import.meta.url));
const file=dir+'/Promptify_Intrepid_Progress_06-23_Oct_2026.xlsx';
const input=JSON.parse(await fs.readFile(new URL('./simple-input.json', import.meta.url),'utf8'));
const names={M1:'M1 — Identity & quyền truy cập',M2:'M2 — Sheet roster + Department routing',M3:'M3 — Learning flow thật',M4:'M4 — Trainer + Head tối thiểu',M5:'M5 — Test + sửa blocker + rehearsal','AFTER PILOT':'Sau pilot'};
const statuses={'NOT STARTED':'Chưa làm','IN PROGRESS':'Đang làm','BLOCKED':'Bị chặn','READY FOR REVIEW':'Chờ nghiệm thu','ACCEPTED':'Hoàn thành','DEFERRED':'Defer'};
const data=input.map(r=>[r[1]?new Date(r[1].slice(0,10)+'T00:00:00Z'):null,names[r[3]],r[7],r[10]==='P3'?'P2':r[10],r[8],r[11],r[19],statuses[r[17]],[
 r[22]?`Blocker: ${r[22]}`:'',r[21]?`Evidence: ${r[21]}`:'',r[13]?`Phụ thuộc: ${r[13]}`:'',r[12]&&r[12]!==r[11]?`Input/duyệt: ${r[12]}`:'',r[16]?`${r[16]} giờ dự kiến`:'',r[3]==='AFTER PILOT'?r[27]:'',r[3]==='AFTER PILOT'?'Sau pilot; không nằm trong deadline 23/10.':''
].filter(Boolean).join('\n')]);
// Replace dependency IDs with readable task names because the compact table has no ID column.
for(let i=0;i<input.length;i++){const deps=(input[i][13]||'').split(',').filter(Boolean);if(deps.length)data[i][8]=data[i][8].replace(`Phụ thuộc: ${input[i][13]}`,`Phụ thuộc: ${deps.map(id=>{const x=input.find(r=>r[6]===id);return x?`${x[1].slice(8,10)}/10 ${x[7]}`:id;}).join('; ')}`);}
for(const title of ['Multi-tenant','Payment','Agribank clone','Partner / revenue sharing'])data.push([null,'Sau pilot',title,'P2','Ngoài scope pilot; không đánh giá thêm trong lần thu gọn này.','TBD','Chỉ mở lại sau pilot khi có scope được duyệt.','Defer','Không triển khai trước 23/10.']);
const wb=Workbook.create(),s=wb.worksheets.add('Kế hoạch triển khai');
const cell=(a,v)=>s.getRange(a).values=[[v]],f=(a,v)=>s.getRange(a).formulas=[[v]];
const last=10+data.length;
s.showGridLines=false;s.getRange(`A1:I${last}`).format={font:{name:'Arial',size:11,color:'#243247'},verticalAlignment:'center'};
cell('A1','PROMPTIFY INTREPID — KẾ HOẠCH TRIỂN KHAI');s.getRange('A1:I1').merge();s.getRange('A1').format.font={name:'Arial',size:16,bold:true,color:'#243247'};s.getRange('A1:I1').format.rowHeight=32;
cell('A3','Ngày hiện tại');f('B3','=TODAY()');cell('D3','Deadline');cell('E3',new Date(Date.UTC(2026,9,23)));cell('G3','Số ngày còn lại');f('H3','=MAX(0,E3-B3)');
cell('A4','Tổng task');f('B4','=COUNTA(C11:C80)');cell('D4','Task hoàn thành');f('E4','=COUNTIF(H11:H80,"Hoàn thành")');cell('G4','% hoàn thành');f('H4','=IF(COUNTA(C11:C80)-COUNTIF(B11:B80,"Sau pilot")=0,0,COUNTIFS(H11:H80,"Hoàn thành",B11:B80,"<>Sau pilot")/(COUNTA(C11:C80)-COUNTIF(B11:B80,"Sau pilot")))');
cell('A5','Blocker hiện tại');f('B5','=COUNTIF(H11:H80,"Bị chặn")&" task bị chặn — lọc Trạng thái để xem"');s.getRange('B5:I5').merge();
cell('A7','Feature freeze 20/10 · 21–22/10: test, sửa lỗi, rehearsal · 23/10: smoke test + pilot, không build feature lớn.');s.getRange('A7:I7').merge();
cell('A8','Lọc Ngày = hôm nay để xem việc cần làm; lọc “Bị chặn” để xem blocker. % hoàn thành loại trừ Sau pilot. Owner/effort là đề xuất; chỉ đánh Hoàn thành khi đạt DoD và ghi evidence ở Ghi chú.');s.getRange('A8:I8').merge();s.getRange('A8:I8').format.wrapText=true;s.getRange('A8:I8').format.rowHeight=35;
const headers=['Ngày','Mốc','Việc cần làm','Ưu tiên','Hiện trạng codebase','Người phụ trách','Kết quả phải có / Definition of Done','Trạng thái','Blocker / Ghi chú'];
s.getRange('A10:I10').values=[headers];s.getRange(`A11:I${last}`).values=data;
const table=s.tables.add(`A10:I${last}`,true,'SprintTasks');table.style='TableStyleLight9';table.showFilterButton=true;
s.getRange('A10:I10').format={fill:'#243247',font:{bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:40};
s.getRange(`A11:I${last}`).format.wrapText=true;s.getRange(`A11:I${last}`).format.rowHeight=105;
s.getRange(`A11:A${last}`).setNumberFormat('dd/mm');s.getRange('B3').setNumberFormat('dd/mm');s.getRange('E3').setNumberFormat('dd/mm');s.getRange('H4').setNumberFormat('0%');
for(const [c,width] of Object.entries({A:12,B:27,C:48,D:10,E:48,F:24,G:65,H:21,I:65}))s.getRange(`${c}1:${c}${last}`).format.columnWidth=width;
s.getRange(`D11:D${last}`).dataValidation={rule:{type:'list',values:['P0','P1','P2']}};
s.getRange(`H11:H${last}`).dataValidation={rule:{type:'list',values:['Chưa làm','Đang làm','Bị chặn','Chờ nghiệm thu','Hoàn thành','Defer']}};
s.getRange(`F11:F${last}`).format.fill='#FFF5DD';s.getRange(`I11:I${last}`).format.fill='#FFF5DD';
for(const [status,fill,color] of [['Chưa làm','#F1F5F9','#475569'],['Đang làm','#DBEAFE','#1D4ED8'],['Bị chặn','#FEE2E2','#991B1B'],['Chờ nghiệm thu','#FEF3C7','#92400E'],['Hoàn thành','#DCFCE7','#166534'],['Defer','#E5E7EB','#6B7280']])s.getRange(`H11:H${last}`).conditionalFormats.add('cellIs',{operator:'equal',formula:`"${status}"`,format:{fill,font:{bold:true,color}}});
s.getRange(`D11:D${last}`).conditionalFormats.add('cellIs',{operator:'equal',formula:'"P0"',format:{fill:'#FEE2E2',font:{bold:true,color:'#991B1B'}}});
s.getRange(`A11:C${last}`).conditionalFormats.addCustom('AND(ISNUMBER($A11),$A11=$B$3,$H11<>"Hoàn thành",$H11<>"Defer")',{fill:'#DBEAFE',font:{bold:true,color:'#174E73'}});
cell('A5','Blocker');s.getRange('A3:I5').format.wrapText=true;s.getRange('A3:I5').format.rowHeight=30;
s.freezePanes.freezeRows(10);s.freezePanes.freezeColumns(2);
wb.recalculate();const v=a=>s.getRange(a).values[0][0];assert.equal(v('B4'),70);assert.equal(v('E4'),0);assert.equal(v('H4'),0);
cell('H11','Hoàn thành');wb.recalculate();assert.equal(v('E4'),1);assert.equal(v('H4'),1/59);cell('H11','Bị chặn');wb.recalculate();assert(v('B5').startsWith('1 task'));cell('H11',data[0][7]);wb.recalculate();assert.equal(v('H4'),0);
assert.equal(data.filter(r=>r[3]==='P0').length,56);for(let day=6;day<=23;day++)assert(data.some(r=>r[0]?.getUTCDate()===day));
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!',options:{useRegex:true,maxResults:20},maxChars:2000})).ndjson);
const img=await wb.render({sheetName:s.name,range:'A1:I13',scale:1,format:'png'});await fs.writeFile(dir+'/simple-preview.png',new Uint8Array(await img.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(wb)).save(file);console.log(JSON.stringify({file,total:data.length,p0:data.filter(r=>r[3]==='P0').length}));
