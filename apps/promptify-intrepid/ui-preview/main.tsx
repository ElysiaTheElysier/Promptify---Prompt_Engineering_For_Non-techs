// Dev-only screen preview with fictional data: renders the real components without sign-in or API calls.
// Not part of any build input (vite.config.ts lists index.html and the two staging QA pages only).
import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../src/index.css';
import '../src/components/rebuild/production.css';
import '../src/components/rebuild/workspace-navigation.css';
import '../src/components/common/app-shell.css';
import ProductionAnalyticsSource from '../src/components/rebuild/ProductionAnalyticsSource';
import PromptLibrary from '../src/components/rebuild/PromptLibrary';
import RosterWorkbookPanel from '../src/components/rebuild/RosterWorkbookPanel';
import AccessRequestInbox from '../src/components/rebuild/AccessRequestInbox';
import ProductionRosterSource from '../src/components/rebuild/ProductionRosterSource';
import ProductionStudioSource from '../src/components/rebuild/ProductionStudioSource';
import DepartmentCorrectionLog from '../src/components/rebuild/DepartmentCorrectionLog';
import {WorkshopSupportQueue,LearnerInbox} from '../src/components/rebuild/WorkshopMessaging';
import ProductionHub from '../src/components/rebuild/ProductionHub';
import ProductionLanding from '../src/components/rebuild/ProductionLanding';
import ProductionEntry1 from '../src/components/rebuild/ProductionEntry1';
import ProductionEntry2 from '../src/components/rebuild/ProductionEntry2';
import ProductionEntry3 from '../src/components/rebuild/ProductionEntry3';
import ProductionLearnerInspectorSource from '../src/components/rebuild/ProductionLearnerInspectorSource';
import ProductionCompareSource from '../src/components/rebuild/ProductionCompareSource';
import ProductionJudgeSource from '../src/components/rebuild/ProductionJudgeSource';
import ProductionWorkspace from '../src/components/rebuild/ProductionWorkspace';
import ProductionWorkshopSource from '../src/components/rebuild/ProductionWorkshopSource';
import ProductionSopSource from '../src/components/rebuild/ProductionSopSource';
import ProductionGovernanceSource from '../src/components/rebuild/ProductionGovernanceSource';
import PromoteLearnerForm from '../src/components/rebuild/PromoteLearnerForm';
import {ConfirmHost,Toast,confirmAction} from '../src/components/common/UiFeedback';
import {AppShell} from '../src/components/common/AppShell';
import {ProductDialog} from '../src/components/common/ProductDialog';
import {setProductLanguage,useProductLanguage} from '../src/services/productI18nService';
import {identity} from '../src/services/firebaseIdentityService';

// Preview only: a fake session and canned /api/product answers so data-loading panels render without Firebase or the API.
const canned:Record<string,unknown>={
 governance:{ai:{configured:true,credentialMode:'iam',model:'gemini-3.8-flash',fallback:'—'},sheets:{configured:true,credentialMode:'iam'},telemetry:{average:2.4,requests:120,errors:1,p95:6.1},domains:[{domain:'intrepid.asia',active:true,status:'active'},{domain:'northstar.example',active:false,status:'disabled'}],audit:[],classes:[]},
 listDomains:[{domain:'intrepid.asia',active:true,status:'active'},{domain:'northstar.example',active:false,status:'disabled'}],
 accessRequests:[{id:'r1',email:'lan.nt@northstar.example',message:'Em không vào được lớp NS-CSKH-01 dù đã có trong danh sách.',status:'pending',created_at:new Date().toISOString()}],
 departmentCorrections:[],analytics:{classes:[],feedback:{available:true,events:[{event:'run',clicks:12,users:3,seconds:0},{event:'save_template',clicks:3,users:2,seconds:0}],outcomes:[]}},
 rosterConnections:[],sheetConnections:[],
};
(identity.auth as any).getSession=async()=>({data:{session:{access_token:'preview',user:{email:'duonglh@intrepid.asia'}}}});
const previewLanguage=new URLSearchParams(location.search).get('lang');
if(previewLanguage==='en'||previewLanguage==='vi')setProductLanguage(previewLanguage);
const realFetch=window.fetch.bind(window);
window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
 if(String(input).endsWith('/api/product')){const {action}=JSON.parse(String(init?.body||'{}'));return new Response(JSON.stringify(canned[action]??{}),{status:200,headers:{'Content-Type':'application/json'}});}
 return realFetch(input,init);
};


const judgeEval:any={contract:'weighted-v1',total:8.4,criteria:[{key:'persona',label:'Vai trò',description:'',weight:20,active:true,score:2,max:2,reason:'Rõ vai trò CSKH.'},{key:'format',label:'Định dạng',description:'',weight:20,active:true,score:1,max:2,reason:'Thiếu cấu trúc email.'},{key:'groundedness',label:'Bám SOP',description:'',weight:20,active:true,score:2,max:2,reason:'Dẫn đúng SOP.'}],strengths:['Giọng văn lịch sự.'],improvements:['Nêu thời hạn khắc phục.'],nextHint:'Thêm thời hạn cụ thể cho bước khắc phục.',feedback:{vi:{criteriaReasons:{persona:'Rõ vai trò CSKH.',format:'Thiếu cấu trúc email.',groundedness:'Dẫn đúng SOP.'},strengths:['Giọng văn lịch sự.'],improvements:['Nêu thời hạn khắc phục.'],nextHint:'Thêm thời hạn cụ thể.'},en:{criteriaReasons:{persona:'Clear support-agent role.',format:'Email structure missing.',groundedness:'Cites the SOP correctly.'},strengths:['Polite tone.'],improvements:['State a fix deadline.'],nextHint:'Add a concrete deadline.'}}};
const settings={temperature:.3,topP:.95,maxOutputTokens:2048,stopSequences:[],searchGrounding:false,personalInstruction:''};
const now=new Date().toISOString();
const lesson:any={id:'l1',title:'Viết email trả lời khiếu nại khách hàng',lesson_key:'B3',scenario:'Khách hàng phàn nàn giao hàng trễ 3 ngày.',task_goal:'Soạn email xin lỗi, nêu nguyên nhân và bước khắc phục.',pillar:'Communication',status:'published',studio:{state:'ACTIVE',startTime:'09:00',endTime:'11:00',variables:[],scaffold:[],awards:{passThreshold:8}}};
const attempt:any={id:'a1',lesson_ref_id:'l1',attempt_number:2,prompt_text:'[Role]: Chuyên viên CSKH\n[Task]: Viết email xin lỗi khách hàng…',ai_output:'**Kính gửi anh Minh,**\n\nChúng tôi thành thật xin lỗi vì đơn hàng #4521 đến trễ 3 ngày…',model:'gemini-3.8-flash',latency_ms:2400,created_at:now,evaluation_json:null as any,settings};
attempt.evaluation_json=judgeEval;
const learners:any[]=[{id:'u1',full_name:'Nguyễn Minh Anh',email:'minhanh@intrepid.asia',department:'CSKH',role:'learner'},{id:'u2',full_name:'Trần Quốc Bảo',email:'bao.tran@intrepid.asia',department:'CSKH',role:'learner'}];
const base=(role:string):any=>({
 profile:{id:'p1',full_name:'Lâm Hải Dương',email:'duonglh@intrepid.asia',role},
 selectedClass:{id:'c1',class_code:'NS-CSKH-01',department:'CSKH',client_name:'Northstar',course_title:'Prompting cho CSKH',can_manage:role!=='learner',status:'active'},
 classes:[{id:'c1',class_code:'NS-CSKH-01',department:'CSKH',client_name:'Northstar',course_title:'Prompting cho CSKH',status:'active'}],
 lessons:[lesson,{...lesson,id:'l2',lesson_key:'B4',title:'Phân loại ticket theo mức SLA',scenario:'Phân loại 20 ticket theo SOP xử lý khiếu nại.'},{...lesson,id:'l3',lesson_key:'B5',title:'Tóm tắt cuộc gọi khách VIP',scenario:'Tóm tắt ghi âm cuộc gọi thành 5 ý chính.'}],progress:[{lesson_id:'l1',status:'in_progress',best_score:8.4,attempts_count:2},{lesson_id:'l2',status:'completed',best_score:9.1,attempts_count:3}],awards:[{id:'aw1',title:'Chuyên viên bám SOP',issuer:'Promptify × Intrepid',issued_at:new Date().toISOString()}],attempts:[{...attempt,attempt_number:1,id:'a0',evaluation_json:{...judgeEval,total:6.5}},attempt],learners,sops:[{id:'s1',title:'Quy trình xử lý khiếu nại v1',version:1,citation:'SOP-CSKH-01 v1',metadata:{pages:12,bytes:204800},chunks:[],lessonIds:['l1']}],
 controls:{state:'active',revision:3},learnerContexts:[],promptLibrary:[],messages:[],hintRequests:[],
 contributions:[{id:'k1',title:'Quy trình xử lý khiếu nại v2',status:'pending',created_at:now},{id:'k2',title:'Kịch bản gọi lại khách VIP',status:'published',created_at:now},{id:'k3',title:'CV ứng viên (gửi nhầm)',status:'rejected',created_at:now}],
 connections:[{id:'cn1',name:'FICTIONAL Northstar Operations',sheet_url:'https://docs.google.com/spreadsheets/d/example',column_mapping:{tab:'Table',range:'A1:F200',layout:'2'},last_synced_at:new Date().toISOString(),auto_sync:true,status:'ok'}],
 modelInfo:{name:'gemini-3.8-flash',allowed:['gemini-3.8-flash']},feedbackAvailable:false,
});
const noop=async(name:string,_payload?:any,after?:(v:any)=>void)=>{if(name==='reviewSopPreview')after?.({id:'k1',content:'1. Tiếp nhận khiếu nại trong 2 giờ.\n2. Phân loại mức độ.\n3. Escalate nếu quá 24 giờ.'});};

function Learner(){
 const [prompt,setPrompt]=useState(attempt.prompt_text),ref=useRef<HTMLTextAreaElement>(null);
 return <ProductionWorkspace {...({snapshot:base('learner'),lesson,prompt,setPrompt,promptRef:ref,insert:()=>{},run:()=>{},busy:false,attempt,scoreCard:()=>null,unlock:()=>{},onAction:noop,navigate:()=>{},selectAttempt:()=>{},streamText:'',executionPhase:undefined,judgeProgress:undefined,actionError:''} as any)}/>;
}
const screens:Record<string,[string,()=>React.ReactNode]>={
 hub:['Học viên · Hub (UI04)',()=><><LearnerInbox snapshot={base('learner')} busy={false} onAction={noop as any}/><ProductionHub snapshot={base('learner')} busy={false} onAction={noop as any} navigate={()=>{}} onOpen={()=>{}}/></>],
 learner:['Học viên · Workspace (UI05)',()=><Learner/>],
 compare:['So sánh (UI06)',()=><ProductionCompareSource attempts={base('learner').attempts} title={lesson.title} navigate={()=>{}} restore={()=>{}}/>],
 judge:['Chấm điểm (UI07)',()=><ProductionJudgeSource evaluation={judgeEval} passThreshold={8} busy={false} judge={()=>{}} onClose={()=>{}} insertHint={()=>{}}/>],
 learnersop:['Học viên · SOP (UI13)',()=><ProductionSopSource snapshot={{...base('learner'),selectedClass:{...base('learner').selectedClass,can_manage:false}}} busy={false} onAction={noop as any}/>],
 workshop:['Facilitator · Workshop (UI09)',()=><ProductionWorkshopSource snapshot={base('instructor')} busy={false} onAction={noop as any} navigate={()=>{}} onInspect={()=>{}}><WorkshopSupportQueue snapshot={base('instructor')} busy={false} onAction={noop as any}/></ProductionWorkshopSource>],
 inspector:['Kiểm tra học viên (UI10)',()=><ProductionLearnerInspectorSource snapshot={base('instructor')} learnerId="u1" busy={false} onAction={noop as any} navigate={()=>{}}/>],
 studio:['Studio (UI11)',()=><ProductionStudioSource snapshot={base('instructor')} busy={false} onAction={noop as any} navigate={()=>{}}/>],
 analytics:['Phân tích (UI12)',()=><><ProductionAnalyticsSource snapshot={base('head')}/><PromptLibrary {...({snapshot:base('head'),busy:false,onAction:noop} as any)}/></>],
 roster:['Roster (UI15)',()=><><ProductionRosterSource snapshot={base('admin')} busy={false} onAction={noop as any}/><RosterWorkbookPanel snapshot={base('admin')} busy={false} onAction={noop as any}/><AccessRequestInbox classId="c1"/></>],
 sop:['Đóng góp SOP (UI13)',()=><ProductionSopSource snapshot={base('instructor')} busy={false} onAction={noop as any}/>],
 governance:['Admin · Quản trị (UI14)',()=><><ProductionGovernanceSource snapshot={base('admin')} busy={false} onAction={noop as any}/><PromoteLearnerForm snapshot={base('admin')} busy={false} onAction={noop as any}/><DepartmentCorrectionLog/></>],
 feedback:['Dialogs',()=><Feedback/>],
};
function Feedback(){
 const en=useProductLanguage()==='en',p=(a:string,b:string)=>en?a:b;
 const [toast,setToast]=useState(''),[dialog,setDialog]=useState(false);
 return <section className="prod-card"><h2>{p('Shared dialogs and notifications','Hộp thoại và thông báo dùng chung')}</h2><p>{p('Each control below opens the real component the app uses.','Mỗi nút dưới đây mở đúng component mà ứng dụng đang dùng.')}</p><div className="ui-btn-row">
  <button className="ui-btn ui-btn-danger" onClick={async()=>{const r=await confirmAction({title:p('Reject this SOP?','Từ chối SOP này?'),body:p('“Complaint handling v2” will not be indexed. The contributor sees your reason.','“Quy trình xử lý khiếu nại v2” sẽ không được index. Người gửi sẽ thấy lý do của bạn.'),confirmLabel:p('Reject','Từ chối'),tone:'danger'});setToast(r.ok?p('SOP rejected.','Đã từ chối SOP.'):'');}}>{p('Open confirm dialog','Mở hộp xác nhận')}</button>
  <button className="ui-btn ui-btn-secondary" onClick={()=>setDialog(true)}>{p('Open product dialog','Mở hộp thoại')}</button>
  <button className="ui-btn ui-btn-secondary" onClick={()=>setToast(p('Changes saved.','Đã lưu thay đổi.'))}>{p('Show toast','Hiện thông báo')}</button></div>
  {dialog&&<ProductDialog title={p('Model specifications','Thông số mô hình')} onClose={()=>setDialog(false)}><div className="ui-dialog-head"><h2>{p('Model specifications','Thông số mô hình')}</h2><button className="ui-btn ui-btn-ghost ui-btn-sm" aria-label={p('Close','Đóng')} onClick={()=>setDialog(false)}>×</button></div><p>{p('Text generation with authorized SOP context. Models are selected by the administrator.','Sinh văn bản với ngữ cảnh SOP được cấp quyền. Quản trị viên chọn mô hình.')}</p><div className="ui-btn-row ui-btn-row-end"><button className="ui-btn ui-btn-primary" onClick={()=>setDialog(false)}>{p('Done','Xong')}</button></div></ProductDialog>}
  <Toast kind="success" message={toast} onClose={()=>setToast('')}/></section>;
}
class Guard extends React.Component<React.PropsWithChildren,{error?:string}>{
 state:{error?:string}={};
 static getDerivedStateFromError(e:Error){return {error:e.message};}
 render(){return this.state.error?<p role="alert" className="prod-card" style={{margin:16}}>Preview data is missing a field: {this.state.error}</p>:this.props.children;}
}
// id, English and Vietnamese labels, sidebar group (en, vi). Ids follow the app's UI numbers where they are unique.
const meta:Record<string,[number,string,string,string,string]>={
 hub:[4,'Learning space','Không gian học tập','Learner','Học viên'],learner:[5,'Lab workspace','Không gian bài lab','Learner','Học viên'],
 compare:[6,'Version comparison','So sánh phiên bản','Learner','Học viên'],judge:[7,'AI Judge scorecard','Bảng điểm AI Judge','Learner','Học viên'],
 learnersop:[113,'Department SOPs','SOP phòng ban','Learner','Học viên'],workshop:[9,'Workshop control','Điều hành workshop','Facilitator','Giảng viên'],
 inspector:[10,'Learner inspector','Kiểm tra bài làm','Facilitator','Giảng viên'],studio:[11,'Curriculum Studio','Studio giáo trình','Facilitator','Giảng viên'],
 sop:[13,'SOP contribution','Đóng góp SOP','Facilitator','Giảng viên'],analytics:[12,'Learning analytics','Phân tích học tập','Administration','Quản trị'],
 governance:[14,'System governance','Quản trị hệ thống','Administration','Quản trị'],roster:[15,'Roster connections','Kết nối danh sách học viên','Administration','Quản trị'],
 feedback:[99,'Dialogs & toasts','Hộp thoại & thông báo','Preview','Xem trước'],
};
function Preview(){
 const lang=useProductLanguage(),en=lang==='en';
 const [key,setKey]=useState(()=>new URLSearchParams(location.search).get('screen')||'learner');
 const pick=(k:string)=>{setKey(k);history.replaceState(null,'','?screen='+k+'&lang='+lang);};
 const keys=Object.keys(screens);
 // Signed-out and entry screens render without the shell, exactly as in the app.
 const bare:Record<string,()=>React.ReactNode>={landing:()=><ProductionLanding/>,signin:()=><ProductionEntry1 email={undefined}/>,profile:()=><ProductionEntry2 {...({snapshot:{...base('learner'),profile:{...base('learner').profile,profile_confirmed_at:null}},email:'duonglh@intrepid.asia',onConfirmed:async()=>{}} as any)}/>,denied:()=><ProductionEntry3 {...({email:'someone@gmail.com',viewDenied:false,onHome:()=>{}} as any)}/>};
 if(bare[key])return <Guard key={key}>{bare[key]()}</Guard>;
 return <AppShell items={keys.map(k=>({id:meta[k][0],label:meta[k][en?1:2],group:meta[k][en?3:4]}))} current={meta[key]?.[0]} onNavigate={id=>pick(keys.find(k=>meta[k][0]===id)||'learner')} onHome={()=>pick('hub')} staging title={meta[key]?.[en?1:2]||'Promptify'}
  classPicker={<select className="app-class-picker" aria-label={en?'Cohort':'Lớp học'} value="c1" onChange={()=>{}}><option value="c1" title="Prompting cho CSKH">NS-CSKH-01 · CSKH</option></select>}
  onLanguage={code=>{setProductLanguage(code);history.replaceState(null,'','?screen='+key+'&lang='+code);}} onProfile={()=>{}} onSignOut={()=>{}}>
  <Guard key={key}>{screens[key]?.[1]()}</Guard><ConfirmHost/></AppShell>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
