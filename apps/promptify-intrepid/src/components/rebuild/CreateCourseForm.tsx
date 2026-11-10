import {useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';

type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
const day=(offset:number)=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
/** Governance (admin, migration 027): a new course with its first class, for an existing or a new client. */
export default function CreateCourseForm({snapshot,busy,onAction}:{snapshot:ProductSnapshot;busy:boolean;onAction:Action}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const clients=[...new Map((snapshot.classes||[]).map((row:any)=>[row.client_id,row.client_name||row.client_id])).entries()];
 const [title,setTitle]=useState(''),[clientId,setClientId]=useState(''),[clientName,setClientName]=useState(''),[code,setCode]=useState(''),[department,setDepartment]=useState(''),[start,setStart]=useState(day(0)),[end,setEnd]=useState(day(30)),[created,setCreated]=useState('');
 const newClient=clientId==='new';
 const ready=title.trim().length>=3&&code.trim().length>=2&&department.trim()&&(newClient?clientName.trim():clientId)&&end>start;
 const submit=()=>void onAction('createCourse',{title,code,department,start,end,...(newClient?{clientName}:{clientId})},()=>{setCreated(code.trim());setTitle('');setCode('');setDepartment('');setClientName('');});
 return <div className="mt-5" data-testid="create-course">
  <h4 className="font-bold">{p('Create a new course','Tạo khoá học mới')}</h4>
  <p className="mt-1 text-m3-on-surface-variant">{p('Creates an empty course with its first class (status Upcoming). Then grant an instructor access to that class, and add labs in Curriculum Studio.','Tạo một khoá học trống kèm lớp đầu tiên (trạng thái Sắp diễn ra). Sau đó cấp quyền giảng viên cho lớp đó và thêm bài trong Curriculum Studio.')}</p>
  <div className="mt-3 grid gap-2">
   <label>{p('Course title','Tên khoá học')}<input value={title} placeholder={p('Prompting for Customer Care','Prompting cho CSKH')} onChange={e=>setTitle(e.target.value)}/></label>
   <label>{p('Client company','Công ty khách hàng')}<select value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">{p('Choose…','Chọn…')}</option>{clients.map(([id,name])=><option key={id} value={id}>{name}</option>)}<option value="new">{p('+ New client','+ Khách hàng mới')}</option></select></label>
   {newClient&&<label>{p('New client name','Tên khách hàng mới')}<input value={clientName} onChange={e=>setClientName(e.target.value)}/></label>}
   <label>{p('First class code','Mã lớp đầu tiên')}<input value={code} placeholder="CC-2611" onChange={e=>setCode(e.target.value)}/></label>
   <label>{p('Department (must match the roster exactly)','Phòng ban (phải khớp chính xác với roster)')}<input value={department} placeholder="Customer Care" onChange={e=>setDepartment(e.target.value)}/></label>
   <label>{p('Start','Bắt đầu')}<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label>{p('End','Kết thúc')}<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
   <div className="ui-btn-row"><button type="button" className="ui-btn ui-btn-primary" disabled={busy||!ready} onClick={submit}>{p('Create course','Tạo khoá học')}</button></div>
   {created&&<p role="status">{p(`Created. Choose class ${created} in the class selector to continue.`,`Đã tạo. Chọn lớp ${created} ở bộ chọn lớp để làm tiếp.`)}</p>}
  </div>
 </div>;
}
