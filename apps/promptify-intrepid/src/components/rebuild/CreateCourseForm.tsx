import {useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';

type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
const day=(offset:number)=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
const field='grid gap-1.5 text-sm font-semibold min-w-0',control='w-full h-12 border border-m3-outline-variant rounded-xl px-3 font-normal bg-white focus:outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary-container';
/** Governance (admin, migration 027): a new course with its first class, for an existing or a new client. */
export default function CreateCourseForm({snapshot,busy,onAction}:{snapshot:ProductSnapshot;busy:boolean;onAction:Action}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const clients=[...new Map((snapshot.classes||[]).map(row=>[row.client_id,row.client_name||row.client_id])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
 const [title,setTitle]=useState(''),[clientId,setClientId]=useState(''),[clientName,setClientName]=useState(''),[code,setCode]=useState(''),[department,setDepartment]=useState(''),[start,setStart]=useState(day(0)),[end,setEnd]=useState(day(30)),[created,setCreated]=useState('');
 const newClient=clientId==='new',badDates=!!start&&!!end&&end<=start;
 const ready=title.trim().length>=3&&code.trim().length>=2&&!!department.trim()&&!!(newClient?clientName.trim():clientId)&&!!start&&!!end&&!badDates;
 const submit=()=>void onAction('createCourse',{title,code,department,start,end,...(newClient?{clientName}:{clientId})},()=>{setCreated(code.trim());setTitle('');setCode('');setDepartment('');setClientName('');});
 return <section className="mt-6 border rounded-2xl p-5" data-testid="create-course">
  <h3 className="font-bold text-lg">{p('Create a new course','Tạo khoá học mới')}</h3>
  <p className="mt-1 text-sm text-m3-on-surface-variant">{p('Creates an empty course with its first class (status Upcoming). Then choose that class, grant an instructor access, and add labs in Curriculum Studio.','Tạo một khoá học trống kèm lớp đầu tiên (trạng thái Sắp diễn ra). Sau đó chọn lớp đó, cấp quyền giảng viên và thêm bài trong Curriculum Studio.')}</p>
  <form className="mt-5 grid md:grid-cols-2 gap-4 items-start" onSubmit={e=>{e.preventDefault();if(ready)submit();}}>
   <label className={field+' md:col-span-2'}>{p('Course title','Tên khoá học')}<input className={control} value={title} placeholder={p('Prompting for Customer Care','Prompting cho CSKH')} onChange={e=>setTitle(e.target.value)}/></label>
   <label className={field}>{p('Client company','Công ty khách hàng')}<select className={control} value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">{p('Choose…','Chọn…')}</option>{clients.map(([id,name])=><option key={id} value={id}>{name}</option>)}<option value="new">{p('+ New client','+ Khách hàng mới')}</option></select></label>
   {newClient?<label className={field}>{p('New client name','Tên khách hàng mới')}<input className={control} value={clientName} onChange={e=>setClientName(e.target.value)}/></label>:<span className="hidden md:block"/>}
   <label className={field}>{p('First class code','Mã lớp đầu tiên')}<input className={control} value={code} placeholder="NS-CC-2611" onChange={e=>setCode(e.target.value)}/></label>
   <label className={field}>{p('Department','Phòng ban')}<input className={control} value={department} placeholder="Customer Care" onChange={e=>setDepartment(e.target.value)}/><span className="text-xs font-normal text-m3-on-surface-variant">{p('Must match the roster exactly.','Phải khớp chính xác với roster.')}</span></label>
   <label className={field}>{p('Start','Bắt đầu')}<input type="date" className={control} value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label className={field}>{p('End','Kết thúc')}<input type="date" className={control} value={end} min={start} onChange={e=>setEnd(e.target.value)}/>{badDates&&<span role="alert" className="text-xs font-normal text-m3-error">{p('End must be after start.','Ngày kết thúc phải sau ngày bắt đầu.')}</span>}</label>
   <div className="ui-btn-row md:col-span-2"><button className="ui-btn ui-btn-primary" disabled={busy||!ready}>{p('Create course','Tạo khoá học')}</button></div>
  </form>
  {created&&<p role="status" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 p-3 text-sm font-semibold">{p(`Created. Choose class ${created} in the class selector at the top to continue.`,`Đã tạo. Chọn lớp ${created} ở bộ chọn lớp phía trên để làm tiếp.`)}</p>}
 </section>;
}
