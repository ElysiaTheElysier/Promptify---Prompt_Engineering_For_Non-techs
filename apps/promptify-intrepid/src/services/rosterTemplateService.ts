import type {Workbook,Worksheet} from 'exceljs';

/** Six-tab roster template v1. Tab names and header texts are the parser contract (rosterWorkbookService.WORKBOOK_TABS). */
export const TEMPLATE_TABS={Sync:['Sync At (ISO)'],Users:['Email','Full Name','Department','Country','Employee ID','Office Location'],Department:['Department'],SOPs:['Title','Department','URL'],'Main PIC':['Name','Email','Department'],Report:['Report URL']} as const;
/** Rows above the header (title, instructions). The parser looks for the header in the first 5 rows. */
export const TEMPLATE_BANNER_ROWS=2;
const INPUT_ROWS=500,HEADER_ROW=TEMPLATE_BANNER_ROWS+1,FIRST=HEADER_ROW+1,LAST=HEADER_ROW+INPUT_ROWS;
const C={title:'FF1F3A5F',titleText:'FFFFFFFF',help:'FFFFF4D6',helpText:'FF5C4400',head:'FF0F766E',headText:'FFFFFFFF',input:'FFFFFFFF',grid:'FFD1D5DB',optional:'FF9CA3AF'};
const fill=(argb:string)=>({type:'pattern' as const,pattern:'solid' as const,fgColor:{argb}});
const thin={style:'thin' as const,color:{argb:C.grid}};
/** Row height for wrapped text in a cell `width` characters wide (Calibri 11). */
const wrapHeight=(text:string,width:number)=>8+Math.max(1,Math.ceil(text.length/width))*17;

type Copy={title:string;help:string;notes:string[];required:boolean};
function copy(vi:boolean,department:string):Record<keyof typeof TEMPLATE_TABS,Copy>{
 const t=(v:string,e:string)=>vi?v:e;
 return {
  Department:{required:true,title:t('DEPARTMENT · Danh sách phòng ban','DEPARTMENT · Departments'),
   help:t(`Mỗi dòng một phòng ban, không trùng. Phải có phòng ban của lớp này (“${department}”, đã điền sẵn). Các tab Users, SOPs, Main PIC chỉ dùng được phòng ban có trong danh sách này.`,`One department per row, no duplicates. Must include this class's department ("${department}", prefilled). Users, SOPs and Main PIC may only use departments listed here.`),
   notes:[t('Tên phòng ban, viết giống hệt ở các tab khác. Ví dụ: Customer Care','Department name, spelled exactly as in the other tabs. Example: Customer Care')]},
  Users:{required:true,title:t('USERS · Danh sách học viên','USERS · Learners'),
   help:t('Mỗi dòng một người. Bắt buộc: Email, Full Name, Department, Country. Department chọn từ danh sách (lấy từ tab Department). Chỉ người thuộc phòng ban của lớp được đưa vào lớp. Mỗi lần đồng bộ, app đọc lại toàn bộ tab này. Tối đa 500 người, email không trùng.','One person per row. Required: Email, Full Name, Department, Country. Pick Department from the list (from the Department tab). Only people in the class department join the class. Every sync re-reads this whole tab. Up to 500 people, no duplicate emails.'),
   notes:[t('Bắt buộc. Email công ty dùng để đăng nhập. Ví dụ: an.nguyen@congty.vn','Required. Work email used to sign in. Example: an.nguyen@company.com'),t('Bắt buộc, ít nhất 2 ký tự. Ví dụ: Nguyễn Văn An','Required, at least 2 characters. Example: An Nguyen'),t('Bắt buộc. Chọn từ danh sách (tab Department).','Required. Pick from the list (Department tab).'),t('Bắt buộc. Ví dụ: VN','Required. Example: VN'),t('Tuỳ chọn. Mã nhân viên. Ví dụ: NV001','Optional. Employee ID. Example: E001'),t('Tuỳ chọn. Văn phòng. Ví dụ: HCM','Optional. Office. Example: HCM')]},
  SOPs:{required:false,title:t('SOPs · Tài liệu quy trình (tuỳ chọn)','SOPs · Procedure documents (optional)'),
   help:t('Mỗi dòng một SOP: tên, phòng ban, link bắt đầu bằng https://. Dán link dạng chữ thường: nếu Google đổi link thành “smart chip” thì bấm vào ô, chọn Gỡ chip / dán lại bằng Ctrl+Shift+V. Để trống nếu không dùng.','One SOP per row: title, department, link starting with https://. Paste links as plain text: if Google turns a link into a smart chip, remove the chip or paste again with Ctrl+Shift+V. Leave empty if unused.'),
   notes:[t('Tên SOP. Ví dụ: SOP-CC-01 Xử lý khiếu nại','SOP title. Example: SOP-CC-01 Complaint handling'),t('Chọn từ danh sách (tab Department).','Pick from the list (Department tab).'),t('Link https:// dạng chữ, không phải smart chip.','https:// link as plain text, not a smart chip.')]},
  'Main PIC':{required:false,title:t('MAIN PIC · Người phụ trách (tuỳ chọn)','MAIN PIC · Contacts (optional)'),
   help:t('Người phụ trách của phòng ban, học viên liên hệ khi cần. Mỗi dòng: tên, email, phòng ban. Để trống nếu không dùng.','Department contact learners can reach. Each row: name, email, department. Leave empty if unused.'),
   notes:[t('Họ tên. Ví dụ: Trần Thị Bình','Full name. Example: Binh Tran'),t('Email. Ví dụ: binh.tran@congty.vn','Email. Example: binh.tran@company.com'),t('Chọn từ danh sách (tab Department).','Pick from the list (Department tab).')]},
  Report:{required:false,title:t('REPORT · Link báo cáo (tuỳ chọn)','REPORT · Report links (optional)'),
   help:t('Link báo cáo hoặc dashboard của công ty, mỗi dòng một link bắt đầu bằng https://. Để trống nếu không dùng.','Company report or dashboard links, one https:// link per row. Leave empty if unused.'),
   notes:[t('Link https:// dạng chữ.','https:// link as plain text.')]},
  Sync:{required:false,title:t('SYNC · Lịch đồng bộ (tuỳ chọn)','SYNC · Sync schedule (optional)'),
   help:t('Để trống: khi bật đồng bộ theo lịch, app tự đọc lại Sheet mỗi 15 phút. Hoặc ghi các mốc giờ cố định, mỗi dòng một mốc, giờ Việt Nam, dạng 12/11/2026 08:00.','Leave empty: with scheduled sync on, the app re-reads the Sheet every 15 minutes. Or list fixed times, one per row, Vietnam time, like 12/11/2026 08:00.'),
   notes:[t('Ngày/tháng/năm giờ:phút, giờ Việt Nam. Ví dụ: 12/11/2026 08:00','Day/month/year hour:minute, Vietnam time. Example: 12/11/2026 08:00')]}
 };
}

function dataTab(book:Workbook,name:keyof typeof TEMPLATE_TABS,c:Copy,vi:boolean){
 const headers=TEMPLATE_TABS[name],sheet=book.addWorksheet(name,{properties:{tabColor:{argb:c.required?C.head:C.optional}},views:[{state:'frozen',ySplit:HEADER_ROW}]});
 const width=Math.max(6,headers.length),last=String.fromCharCode(64+width);
 sheet.columns=Array.from({length:width},(_,i)=>({width:i<headers.length?(headers.length===1?40:Math.max(24,headers[i].length+6)):14}));
 const total=sheet.columns.reduce((sum,col)=>sum+(col.width||0),0);
 sheet.mergeCells(`A1:${last}1`);sheet.mergeCells(`A2:${last}2`);
 Object.assign(sheet.getCell('A1'),{value:c.title,font:{bold:true,size:14,color:{argb:C.titleText}},fill:fill(C.title),alignment:{vertical:'middle',indent:1}});
 Object.assign(sheet.getCell('A2'),{value:c.help,font:{size:11,color:{argb:C.helpText}},fill:fill(C.help),alignment:{wrapText:true,vertical:'top',indent:1}});
 sheet.getRow(1).height=30;sheet.getRow(2).height=wrapHeight(c.help,total);
 const head=sheet.getRow(HEADER_ROW);head.height=24;
 headers.forEach((h,i)=>Object.assign(head.getCell(i+1),{value:h,note:c.notes[i],font:{bold:true,color:{argb:C.headText}},fill:fill(C.head),alignment:{vertical:'middle'},border:{top:thin,bottom:thin,left:thin,right:thin}}));
 const deptCol=(headers as readonly string[]).indexOf('Department');
 for(let r=FIRST;r<=LAST;r++)headers.forEach((_,i)=>{
  const cell=sheet.getRow(r).getCell(i+1);
  // Text format keeps dates, IDs and links exactly as typed (no locale date guessing, no leading-zero loss).
  cell.numFmt='@';cell.border={bottom:thin,left:thin,right:thin};
  if(i===deptCol&&name!=='Department')cell.dataValidation={type:'list',allowBlank:true,formulae:[`Department!$A$${FIRST}:$A$${LAST}`],showErrorMessage:true,errorTitle:vi?'Phòng ban':'Department',error:vi?'Chọn phòng ban có trong tab Department.':'Choose a department listed in the Department tab.'};
 });
 return sheet;
}

function guideTab(book:Workbook,vi:boolean,department:string,copies:Record<string,Copy>){
 const t=(v:string,e:string)=>vi?v:e,sheet=book.addWorksheet(t('Hướng dẫn','Guide'),{properties:{tabColor:{argb:'FFF59E0B'}}});
 sheet.columns=[{width:4},{width:22},{width:16},{width:90}];
 let r=1;
 const line=(values:(string|undefined)[],style:Record<string,unknown>={},height?:number)=>{const row=sheet.getRow(r++);values.forEach((v,i)=>{if(v!==undefined)Object.assign(row.getCell(i+1),{value:v,...style,alignment:{wrapText:true,vertical:'top'}});});if(height)row.height=height;return row;};
 sheet.mergeCells('A1:D1');Object.assign(sheet.getCell('A1'),{value:t('MẪU ROSTER PROMPTIFY · v1','PROMPTIFY ROSTER TEMPLATE · v1'),font:{bold:true,size:16,color:{argb:C.titleText}},fill:fill(C.title),alignment:{vertical:'middle',indent:1}});sheet.getRow(1).height=34;r=2;
 sheet.mergeCells('A2:D2');line([t(`Lớp thuộc phòng ban: ${department}. Điền các tab bên phải, tải file lên Google Drive và mở bằng Google Sheets, rồi kết nối trong Promptify.`,`Class department: ${department}. Fill in the tabs on the right, upload the file to Google Drive and open it with Google Sheets, then connect it in Promptify.`)],{font:{color:{argb:C.helpText}},fill:fill(C.help)},36);
 r++;line(['',t('Ý NGHĨA MÀU','COLOUR KEY')],{font:{bold:true,size:12}});
 const key=(argb:string,font:string,label:string)=>{sheet.mergeCells(`C${r}:D${r}`);const row=line(['','',label]);Object.assign(row.getCell(2),{fill:fill(argb),border:{top:thin,bottom:thin,left:thin,right:thin}});row.getCell(2).font={color:{argb:font}};};
 key(C.title,C.titleText,t('Tiêu đề tab. Không sửa.','Tab title. Do not edit.'));
 key(C.help,C.helpText,t('Hướng dẫn nhập. Không sửa, app bỏ qua dòng này.','Instructions. Do not edit; the app ignores this row.'));
 key(C.head,C.headText,t('Tên cột. Không sửa, không xoá, không chèn cột trước nó. Rê chuột vào để xem ví dụ.','Column names. Do not edit, delete or insert columns before them. Hover to see an example.'));
 key(C.input,'FF111827',t('Ô nhập dữ liệu, bắt đầu ngay dưới dòng tên cột.','Data cells, starting right below the column names.'));
 r++;line(['',t('CÁC TAB','TABS'),t('Bắt buộc?','Required?')],{font:{bold:true,size:12}});
 for(const name of ['Department','Users','SOPs','Main PIC','Report','Sync'] as const){const c=copies[name];line(['',name,c.required?t('Bắt buộc','Required'):t('Tuỳ chọn','Optional'),c.help],{},wrapHeight(c.help,70));}
 r++;line(['',t('CÁC BƯỚC','STEPS')],{font:{bold:true,size:12}});
 [t('Điền tab Department, rồi Users (và SOPs, Main PIC, Report, Sync nếu dùng).','Fill in Department, then Users (and SOPs, Main PIC, Report, Sync if used).'),
  t('Tải file lên Google Drive, mở bằng Google Sheets (Mở bằng → Google Trang tính, rồi Tệp → Lưu dưới dạng Google Trang tính).','Upload to Google Drive and open with Google Sheets (Open with → Google Sheets, then File → Save as Google Sheets).'),
  t('Chia sẻ Sheet cho service account của Promptify, quyền Người xem (Viewer).','Share the Sheet with the Promptify service account as Viewer.'),
  t('Admin duyệt link Sheet ở Quản trị → Nguồn Google được duyệt.','An admin approves the Sheet link in Governance → Approved Google sources.'),
  t('Trong Promptify: dán link Sheet, chọn bố cục “Workbook 6 tab”, lưu, rồi bấm Đồng bộ.','In Promptify: paste the Sheet link, choose the "Six-tab workbook" layout, save, then Sync.')]
  .forEach((s,i)=>line(['',`${i+1}.`,'',s],{},wrapHeight(s,70)));
 r++;line(['',t('KHÔNG ĐƯỢC','DO NOT')],{font:{bold:true,size:12,color:{argb:'FFB91C1C'}}});
 [t('Đổi tên tab hoặc tên cột.','Rename tabs or column names.'),t('Thêm dòng ví dụ hay ghi chú bên dưới dòng tên cột (app sẽ đọc như dữ liệu thật).','Add example or note rows below the column names (they are read as real data).'),t('Quá 500 dòng mỗi tab.','Exceed 500 rows per tab.')].forEach(s=>line(['','•','',s]));
 return sheet;
}

/** Builds the formatted onboarding workbook: a guide tab first, then the six contract tabs with title, instructions and header. */
export function buildRosterTemplate(Excel:{Workbook:new()=>Workbook},department:string,vi:boolean){
 const book=new Excel.Workbook(),copies=copy(vi,department);
 guideTab(book,vi,department,copies);
 const sheets:Record<string,Worksheet>={};
 for(const name of ['Department','Users','SOPs','Main PIC','Report','Sync'] as const)sheets[name]=dataTab(book,name,copies[name],vi);
 if(department)sheets.Department.getCell(`A${FIRST}`).value=department;
 return book;
}
