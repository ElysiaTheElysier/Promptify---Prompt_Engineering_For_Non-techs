import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
process.env.SUPABASE_URL='https://offline.example.test';process.env.SUPABASE_ANON_KEY='offline-anon-key';process.env.SUPABASE_SERVICE_ROLE_KEY='offline-service-key';
const id='00000001-0000-4000-8000-000000000001',subject='00000002-0000-4000-8000-000000000001',client='00000003-0000-4000-8000-000000000001',cls='00000004-0000-4000-8000-000000000001';
let corrected=false,role='learner';let listed=true;const calls:string[]=[];
globalThis.fetch=async(input:any,options:any={})=>{
 const url=new URL(typeof input==='string'?input:input.url||String(input));calls.push(url.pathname);
 assert.equal(url.origin,'https://offline.example.test','all requests stay in offline stub');
 let data:any;
 if(url.pathname==='/auth/v1/user')data={id:subject,email:'learner@example.test',email_confirmed_at:'2026-10-13T00:00:00Z',app_metadata:{providers:['google']}};
 else if(url.pathname==='/rest/v1/users')data=listed?[{id,email:'learner@example.test',full_name:'Offline Learner',role,auth_provider_id:subject,profile_confirmed_at:null}]:[];
 else if(url.pathname==='/rest/v1/product_profile_corrections')data=url.searchParams.get('select')==='target_class_id'?(corrected?[{target_class_id:cls}]:[]):[{id,auto_approved:true,requested_department:'Functions'}];
 else if(url.pathname==='/rest/v1/learners')data=[{id}];
 else if(url.pathname==='/rest/v1/enrollments')data=[{class_id:cls}];
 else if(url.pathname==='/rest/v1/classes')data=url.searchParams.get('select')==='department'?[{department:'Tech'},{department:'Functions'}]:[{id:cls,client_id:client,department:corrected?'Functions':'Tech',client:{name:'Offline'},course:{title:'Test'}}];
 else if(url.pathname==='/rest/v1/product_domains')data=[];
 else if(url.pathname==='/rest/v1/rpc/rebuild_can_manage_class')data=false;
 else if(url.pathname==='/rest/v1/rpc/product_auto_correct_department'){const payload=JSON.parse(options.body);assert.equal(payload.p_source,cls);assert.equal(payload.p_department,'Functions');assert.equal(payload.p_reason,'Sync mismatch');corrected=true;data={id,classId:cls,department:'Functions',autoApproved:true};}
 else if(url.pathname==='/rest/v1/rpc/product_request_correction'){
   const payload=JSON.parse(options.body);assert.equal(payload.p_reason,'Functions / Sync mismatch');data=id;
 }else throw Error('Unexpected offline request '+url.pathname);
 return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
};
const stage=path.resolve(process.argv[2]||'outputs/vercel-compat-deploy');
// Import the exact deployable JavaScript with native Node, without tsx/Vite.
const {default:handler}=await import(pathToFileURL(path.join(stage,'api/product.js')).href);
async function handleProductRequest(authorization:string,body:any){
 let status=0,result:any;
 await handler({method:'POST',headers:{authorization},body},{setHeader(){},status(value:number){status=value;return this;},json(value:any){result=value;}});
 if(status!==200)throw Error(result.error);
 return result;
}
for(const name of ['generate','evaluate','roster-worker']){
 const entry=await import(pathToFileURL(path.join(stage,'api',name+'.js')).href);
 assert.equal(typeof entry.default,'function',name+' native startup');
 let status=0;
 await entry.default({method:'GET',headers:{}},{setHeader(){},status(value:number){status=value;return this;},json(){}});
 assert.equal(status,405,name+' rejects unsupported methods after native startup');
}
await assert.rejects(()=>handleProductRequest('',{action:'snapshot'}),/sign in/);
const state=await handleProductRequest('Bearer offline-token',{action:'snapshot',onboarding:true});
assert.deepEqual(state.departments,['Functions','Tech']);assert.equal(state.classes.length,1);assert.equal(state.selectedClass.department,'Tech');assert.equal(state.lessons.length,0);
assert.ok(!calls.includes('/rest/v1/lessons'),'onboarding avoids curriculum loading');
assert.equal(await handleProductRequest('Bearer offline-token',{action:'profileCorrection',requestId:id,reason:'Functions / Sync mismatch'}),id);
assert.ok(!calls.includes('/rest/v1/rpc/product_enroll_basic'),'enterprise login never self-enrolls');
const moved=await handleProductRequest('Bearer offline-token',{action:'profileCorrection',requestId:id,sourceClassId:cls,department:'Functions',reason:'Sync mismatch',fullName:'Learner'});assert.equal(moved.classId,cls);assert.equal(moved.autoApproved,true);assert.equal((await handleProductRequest('Bearer offline-token',{action:'snapshot',onboarding:true})).selectedClass.department,'Functions');
 await assert.rejects(()=>handleProductRequest('Bearer offline-token',{action:'departmentCorrections'}),/administrator access/);role='admin';assert.equal((await handleProductRequest('Bearer offline-token',{action:'departmentCorrections'}))[0].auto_approved,true);
 listed=false;await assert.rejects(()=>handleProductRequest('Bearer offline-token',{action:'snapshot',onboarding:true}),/not on the provisioned roster/);
console.log('Vercel Supabase compatibility PASS: offline SDK authorization, whitelist denial, department names outside enrollment, correction RPC and lightweight onboarding.');
