type Cell=string|number|null|undefined;
/** RFC 4180 CSV. Text that a spreadsheet would run as a formula (=, +, -, @) is prefixed with ' (CSV injection). */
export function toCsv(rows:Cell[][]){
 return rows.map(row=>row.map(value=>{
  if(value===null||value===undefined)return '';
  let text=typeof value==='number'?(Number.isFinite(value)?String(Math.round(value*100)/100):''):String(value);
  if(typeof value==='string'&&/^[=+\-@\t\r]/.test(text))text="'"+text;
  return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
 }).join(',')).join('\r\n');
}

/** Head/Admin analytics export: summary, cohorts and labs, in the dashboard's own metrics. BOM keeps Excel on UTF-8. */
export function analyticsCsv(data:any,lang:'en'|'vi',period?:string){
 const t=(en:string,vi:string)=>lang==='en'?en:vi;
 const rows:Cell[][]=[
  [t('Promptify learning report','Báo cáo học tập Promptify'),new Date().toISOString()],
  ...(period?[[t('Period','Khoảng thời gian'),period]]:[]),
  [],
  [t('Metric','Chỉ số'),t('Value','Giá trị')],
  [t('Enrolled learners','Học viên ghi danh'),data?.enrolled],
  [t('Learners who completed','Học viên hoàn thành'),data?.completed],
  [t('Saved attempts','Lượt làm đã lưu'),data?.attempts],
  [t('Graded attempts','Lượt đã chấm'),data?.evaluated],
  [t('Average AI Judge score (all graded attempts)','Điểm AI Judge trung bình (mọi lượt đã chấm)'),data?.average_score],
  [t('First graded attempt, same task','Lần chấm đầu, cùng bài'),data?.pre_score],
  [t('Latest graded attempt, same task','Lần chấm mới nhất, cùng bài'),data?.post_score],
  [t('Tasks with repeated grading','Số bài được chấm lại'),data?.paired_tasks],
  [t('Published SOPs','SOP đã xuất bản'),data?.published_sops],
  [],
  [t('Cohort','Lớp'),t('Department','Phòng ban'),t('Enrolled','Ghi danh'),t('Completed','Hoàn thành'),t('Attempts','Lượt làm'),t('Average score','Điểm TB'),t('Published SOPs','SOP xuất bản')],
  ...(data?.classes||[]).map((row:any)=>[row.class_code,row.department,row.enrolled,row.completed,row.attempts,row.average_score,row.published_sops]),
  [],
  [t('Lab','Bài lab'),t('Graded attempts','Lượt đã chấm'),t('Average score','Điểm TB')],
  ...(data?.techniques||[]).map((row:any)=>[row.title,row.evaluated,row.average_score]),
 ];
 return '﻿'+toCsv(rows);
}
