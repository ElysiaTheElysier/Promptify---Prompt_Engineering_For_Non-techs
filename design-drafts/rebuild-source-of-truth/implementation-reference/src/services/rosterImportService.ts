import {supabase} from './supabaseClient';
export interface RosterRow{email:string;fullName:string}
// Accept quoted CSV, including escaped quotes and line breaks within a cell.
export function parseRosterCsv(source:string):RosterRow[]{
 const records:string[][]=[];let row:string[]=[],cell='',quoted=false;
 const input=source.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++}else if(quoted||!cell){quoted=!quoted}else throw new Error('Dấu ngoặc kép không hợp lệ.');}
  else if(c===','&&!quoted){row.push(cell);cell=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))records.push(row);row=[];cell=''}
  else cell+=c;
 }
 if(quoted)throw new Error('CSV chưa đóng dấu ngoặc kép.');row.push(cell);if(row.some(v=>v.trim()))records.push(row);
 const header=records.shift()?.map(v=>v.trim().toLowerCase())||[];
 const emailIndex=header.indexOf('email'),nameIndex=header.indexOf('fullname');
 if(emailIndex<0||nameIndex<0||header.some(v=>!['email','fullname'].includes(v))||header.length!==2)throw new Error('CSV cần đúng hai cột Email,FullName. Phòng ban lấy từ lớp đang chọn.');
 if(!records.length||records.length>500)throw new Error('Mỗi lần nhập từ 1 đến 500 học viên.');
 const emails=new Set<string>();
 return records.map((r,i)=>{if(r.length!==header.length)throw new Error(`Dòng ${i+2}: số cột không khớp.`);const email=r[emailIndex].trim().toLowerCase(),fullName=r[nameIndex].trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||fullName.length<2||fullName.length>120)throw new Error(`Dòng ${i+2}: email hoặc họ tên không hợp lệ.`);if(emails.has(email))throw new Error(`Dòng ${i+2}: email bị trùng.`);emails.add(email);return{email,fullName}});
}
export async function importRoster(classId:string,requestId:string,rows:RosterRow[]):Promise<{processed:number}>{
 const {data,error}=await supabase.rpc('rebuild_import_roster',{p_class:classId,p_request:requestId,p_rows:rows});if(error)throw error;return data;
}
