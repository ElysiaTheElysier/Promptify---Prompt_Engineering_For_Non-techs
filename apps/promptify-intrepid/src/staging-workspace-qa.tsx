import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {productRequest,ProductRequestError} from './services/productionClientService';
import {workspaceFixtures as fixtures,fixtureLesson as lessonId} from './staging-workspace-fixture';
import './index.css';
const allowed=import.meta.env.MODE==='staging'&&location.hostname==='ai-transformation-510302-intrepid-staging.web.app';
type Row={name:string;ok:boolean;details?:unknown};
function Review(){
 const [busy,setBusy]=useState(false),[rows,setRows]=useState<Row[]>([]),[actor,setActor]=useState('');
 const add=(row:Row)=>setRows(previous=>[...previous,row]);
 const snapshot=async(c:typeof fixtures[number])=>{
  if(!allowed)throw Error('Fixed staging host required');
  const s=await productRequest<any>('snapshot',{classId:c.classId});
  if(s.selectedClass?.class_code!==c.code||s.selectedClass?.department!==c.department)throw Error('Fictional class mismatch');
  setActor(s.profile.email+' · '+s.profile.role);return s;
 };
 async function operation(work:()=>Promise<void>){setBusy(true);setRows([]);try{await work();}catch(e){add({name:'Stopped; do not blindly repeat uncertain writes',ok:false,details:e instanceof ProductRequestError?{status:e.status,message:e.message}:String(e)});}finally{setBusy(false);}}
 async function deny(name:string,action:string,payload:Record<string,unknown>){try{await productRequest(action,payload);add({name,ok:false,details:{status:200}});return false;}catch(e){const status=e instanceof ProductRequestError?e.status:0;add({name,ok:status===403,details:{status}});return status===403;}}
 async function admin(){
  for(const c of fixtures){
   let s=await snapshot(c);if(s.profile.email!=='duonglh.work@gmail.com'||s.profile.role!=='admin')throw Error('Existing QA administrator required');
   const save=async(tab:string)=>productRequest<string>('saveSheet',{classId:c.classId,url:'https://docs.google.com/spreadsheets/d/'+c.sheetId+'/edit',name:'FICTIONAL '+c.department,mapping:{templateVersion:2,tab,range:'A1:AF2001',email:'Email',fullName:'Full Name',department:'Department',country:'Country'}});
   const connectionId=await save('Table'),requestId=crypto.randomUUID();
   const imported=await productRequest<any>('syncSheet',{classId:c.classId,connectionId,requestId});
   const replay=await productRequest<any>('syncSheet',{classId:c.classId,connectionId,requestId});
   add({name:c.department+' initial roster and stable sync replay',ok:imported.processed===3&&JSON.stringify(imported)===JSON.stringify(replay),details:{connectionId,requestId,processed:imported.processed}});
   if(imported.processed!==3||JSON.stringify(imported)!==JSON.stringify(replay))throw Error('Roster prerequisite failed before indexing');
   const listing=await productRequest<any>('listDriveFolder',{classId:c.classId,url:'https://drive.google.com/drive/folders/'+c.folderId});
   add({name:c.department+' Drive discovery',ok:listing.files?.length===2&&listing.files.every((f:any)=>(c.files as readonly string[]).includes(f.id)),details:{files:listing.files?.map((f:any)=>({id:f.id,name:f.name})),skipped:listing.skipped}});
   if(listing.files?.length!==2||!listing.files.every((f:any)=>(c.files as readonly string[]).includes(f.id)))throw Error('Drive discovery scope failed before indexing');
   const other=fixtures.find(f=>f.classId!==c.classId)!;
   if(!await deny(c.department+' rejects the other company folder','listDriveFolder',{classId:c.classId,url:'https://drive.google.com/drive/folders/'+other.folderId}))throw Error('Cross-company folder denial failed');
   if(!await deny(c.department+' rejects the other company Sheet registration','saveSheet',{classId:c.classId,url:'https://docs.google.com/spreadsheets/d/'+other.sheetId+'/edit',name:'Denied cross-company test',mapping:{}}))throw Error('Cross-company Sheet denial failed');
   for(const [index,fileId]of c.files.entries()){
    s=await snapshot(c);const title='FICTIONAL Workspace SOP '+c.department+' '+(index+1);
    const prior=s.contributions.find((r:any)=>r.title===title&&r.metadata?.driveFileId===fileId);
    let contributionId=prior?.id;
    if(!contributionId){const submitted=await productRequest<any>('submitSop',{classId:c.classId,lessonId,requestId:crypto.randomUUID(),title,driveUrl:'https://drive.google.com/file/d/'+fileId+'/view'});contributionId=submitted.id;}
    if(prior?.indexing)throw Error('Prior indexing outcome must be inspected before retry');
    const published=prior?.status==='published'?{versionId:prior.version_id}:await productRequest<any>('reviewSop',{classId:c.classId,contributionId,decision:'approve'});
    const publishedState=await snapshot(c),canonical=publishedState.sops.find((r:any)=>r.id===published.versionId);
    const verified=!!canonical&&canonical.metadata?.driveFileId===fileId&&canonical.content.includes(c.canaries[index])&&canonical.chunks.length>0&&canonical.lessonIds.includes(lessonId)&&!!canonical.citation;
    add({name:c.department+' actual Drive ingest, approval, indexing and canonical source '+(index+1),ok:verified,details:{fileId,contributionId,versionId:published.versionId,ownCanary:!!canonical&&canonical.content.includes(c.canaries[index]),chunks:canonical?.chunks.length,citation:canonical?.citation}});if(!verified)throw Error('Published source proof failed');
    try{await productRequest('sourceDownload',{classId:c.classId,versionId:published.versionId});add({name:'Drive original download available',ok:true});}catch(e){const status=e instanceof ProductRequestError?e.status:0;add({name:'Drive original download gap (known unsupported 404)',ok:false,details:{status}});if(status!==404)throw e;}
   }
   const found=await productRequest<any[]>('searchSop',{classId:c.classId,lessonId,query:c.canaries[0]});
   const text=JSON.stringify(found);add({name:c.department+' published source search is isolated',ok:c.canaries.some(x=>text.includes(x))&&!other.canaries.some(x=>text.includes(x)),details:{resultCount:found.length,ownCanary: c.canaries.some(x=>text.includes(x)),foreignCanary:other.canaries.some(x=>text.includes(x))}});
  }
 }
 async function changes(){
  for(const c of fixtures){const s=await snapshot(c);if(s.profile.email!=='duonglh.work@gmail.com'||s.profile.role!=='admin')throw Error('Existing QA administrator required');
   for(const [tab,expected]of [['Add',4],['Update',4],['Omission',3]] as const){
    const connectionId=await productRequest<string>('saveSheet',{classId:c.classId,url:'https://docs.google.com/spreadsheets/d/'+c.sheetId+'/edit',name:'FICTIONAL '+c.department,mapping:{templateVersion:2,tab,range:'A1:AF2001',email:'Email',fullName:'Full Name',department:'Department',country:'Country'}});
    const result=await productRequest<any>('syncSheet',{classId:c.classId,connectionId,requestId:crypto.randomUUID()});const after=await snapshot(c);
    const active=after.learners.filter((r:any)=>r.email.endsWith('.example.test')).length;
    add({name:c.department+' '+tab+' authoritative membership expectation',ok:result.processed===expected&&active===expected,details:{processed:result.processed,expected,activeSyntheticMembers:active,note:tab==='Omission'?'A mismatch is a real deprovisioning bug; no manual revoke is used to hide it.':undefined}});
   }
  }
 }
 async function prepareOwnership(){
  for(const c of fixtures){const s=await snapshot(c);if(s.profile.email!=='duonglh.work@gmail.com'||s.profile.role!=='admin')throw Error('Existing QA administrator required');
   const connectionId=await productRequest<string>('saveSheet',{classId:c.classId,url:'https://docs.google.com/spreadsheets/d/'+c.sheetId+'/edit',name:'FICTIONAL '+c.department,mapping:{templateVersion:2,tab:'Add',range:'A1:AF2001',email:'Email',fullName:'Full Name',department:'Department',country:'Country'}});
   const requestId=crypto.randomUUID(),result=await productRequest<any>('syncSheet',{classId:c.classId,connectionId,requestId});
   const after=await snapshot(c),active=after.learners.filter((r:any)=>r.email.endsWith('.example.test')).length;
   add({name:c.department+' full Add snapshot before guarded ownership adoption',ok:result.processed===4&&active===4,details:{connectionId,requestId,result,activeSyntheticMembers:active}});
   if(result.processed!==4||active!==4)throw Error('Full snapshot prerequisite failed; do not adopt ownership');
  }
 }
 async function peerRoster(grant:boolean){
  const c=fixtures[0],s=await snapshot(c);if(s.profile.email!=='duonglh.work@gmail.com'||s.profile.role!=='admin')throw Error('Existing QA administrator required');
  const tab=grant?'PeerAccess':'Omission',connectionId=await productRequest<string>('saveSheet',{classId:c.classId,url:'https://docs.google.com/spreadsheets/d/'+c.sheetId+'/edit',name:'FICTIONAL '+c.department,mapping:{templateVersion:2,tab,range:'A1:AF2001',email:'Email',fullName:'Full Name',department:'Department',country:'Country'}});
  const requestId=crypto.randomUUID(),result=await productRequest<any>('syncSheet',{classId:c.classId,connectionId,requestId});
  const after=await snapshot(c),peerPresent=after.learners.some((r:any)=>r.email===fixtures[1].tester),manualPresent=after.learners.some((r:any)=>r.email===c.tester);
  add({name:grant?'Peer receives temporary source-owned A access':'Peer source-owned A access removed by ordinary snapshot',ok:result.processed===(grant?5:3)&&peerPresent===grant&&manualPresent,details:{classId:c.classId,connectionId,requestId,result,peerPresent,manualQaPreserved:manualPresent}});
 }
 async function peerProof(expectAccess:boolean){
  const seed=await productRequest<any>('snapshot',{});setActor(seed.profile.email+' · '+seed.profile.role);
  if(seed.profile.email!==fixtures[1].tester||seed.profile.role!=='learner')throw Error('Use the existing company B learner');
  const c=fixtures[0];
  if(expectAccess){
   const s=await snapshot(c),source=s.sops.find((r:any)=>r.metadata?.driveFileId===c.files[0]);if(!source)throw Error('Expected A canonical source is unavailable');
   const d=await productRequest<{url:string}>('sourceDownload',{classId:c.classId,versionId:source.id}),r=await fetch(d.url);if(!r.ok)throw Error('Granted source download failed');
   const bytes=await r.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   add({name:'Actual peer signed session can read newly granted A source',ok:sha===source.metadata.sha256,details:{classId:c.classId,versionId:source.id,bytes:bytes.byteLength,sha256:sha}});
  }else{
   await deny('Actual peer loses A snapshot after source omission','snapshot',{classId:c.classId});
   await deny('Actual peer loses A original after source omission','sourceDownload',{classId:c.classId,versionId:'f11375ce-d3c1-4269-8489-588770433d4b'});
   await originals(false);
  }
 }
 async function learner(){
  const seed=await productRequest<any>('snapshot',{});const c=fixtures.find(f=>f.tester===seed.profile.email);if(!c||seed.profile.role!=='learner')throw Error('Use the existing QA learner assigned to one fixture company');
  await snapshot(c);const other=fixtures.find(f=>f.classId!==c.classId)!;
  await deny('Learner cannot read foreign company class','snapshot',{classId:other.classId});
  const found=await productRequest<any[]>('searchSop',{classId:c.classId,lessonId,query:c.canaries[0]});const text=JSON.stringify(found);
  add({name:'Actual learner source search and citation',ok:found.length>0&&found.every((r:any)=>typeof r.citation==='string'&&r.citation.length>0)&&c.canaries.some(x=>text.includes(x))&&!other.canaries.some(x=>text.includes(x)),details:{classId:c.classId,resultCount:found.length,citations:found.map((r:any)=>r.citation),foreignCanary:other.canaries.some(x=>text.includes(x))}});
 }
 async function originals(restore:boolean){
  const initial=await productRequest<any>('snapshot',{});
  const targets=restore?fixtures:fixtures.filter(c=>c.tester===initial.profile.email);
  if(restore&&(initial.profile.role!=='admin'||initial.profile.email!=='duonglh.work@gmail.com'))throw Error('Existing QA administrator required');
  if(!targets.length)throw Error('Use a configured QA account');
  for(const c of targets){const s=await snapshot(c);
   for(const fileId of c.files){
    const source=s.sops.find((r:any)=>r.metadata?.driveFileId===fileId);
    if(!source||!/^[a-f0-9]{64}$/.test(source.metadata.sha256||''))throw Error('Canonical source hash is missing');
    if(restore){const result=await productRequest<any>('backfillDriveOriginal',{classId:c.classId,versionId:source.id,expectedSha256:source.metadata.sha256});add({name:c.department+' restore exact original',ok:result.versionId===source.id,details:{versionId:source.id,restored:result.restored}});}
    const download=await productRequest<{url:string}>('sourceDownload',{classId:c.classId,versionId:source.id});
    const response=await fetch(download.url);if(!response.ok)throw Error('Private original download failed: '+response.status);
    const bytes=await response.arrayBuffer();if(bytes.byteLength>25*1024*1024)throw Error('Original exceeds expected bounds');
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    add({name:c.department+' original download exact hash',ok:digest===source.metadata.sha256&&bytes.byteLength===source.metadata.bytes,details:{versionId:source.id,bytes:bytes.byteLength,sha256:digest,matchesCanonical:digest===source.metadata.sha256}});
   }
   const other=fixtures.find(f=>f.classId!==c.classId)!;
   if(!restore)await deny('Learner cannot restore originals','backfillDriveOriginal',{classId:c.classId,versionId:s.sops[0]?.id,expectedSha256:s.sops[0]?.metadata?.sha256});
   if(!restore)await deny('Learner cannot download foreign company source','sourceDownload',{classId:other.classId,versionId:s.sops[0]?.id});
  }
 }
 return <main style={{maxWidth:950,margin:'32px auto',padding:24,fontFamily:'Inter,system-ui',color:'#102d32'}}><h1>Synthetic Workspace integration QA</h1><p>Fixed fictional company classes only. Ordinary signed app requests, no token export or fake authentication identities. Original repair and download verification make no AI calls; signed URLs remain private in memory. No score or completion changes.</p><p>{actor||'Sign in through the ordinary staging app first.'}</p><a href="/?ui=02">App sign-in</a><div style={{display:'flex',flexWrap:'wrap',gap:12,margin:'24px 0'}}>{[['Admin initial sync and SOP pipeline',admin],['Admin prepare owned roster snapshot',prepareOwnership],['Admin add update omission checks',changes],['Learner source isolation checks',learner],['Admin restore and verify originals',()=>originals(true)],['Learner verify original downloads',()=>originals(false)],['Admin grant peer fixture access',()=>peerRoster(true)],['Peer verify granted access',()=>peerProof(true)],['Admin omit peer fixture access',()=>peerRoster(false)],['Peer verify revoked access',()=>peerProof(false)]].map(([label,action])=><button key={String(label)} disabled={busy||!allowed} onClick={()=>void operation(action as ()=>Promise<void>)} style={{background:'#047857',color:'white',padding:12,borderRadius:12,minHeight:44}}>{String(label)}</button>)}</div><p role="status">{busy?'Running…':'Idle'}</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',background:'#f4f8f6',padding:16}}>{JSON.stringify({at:new Date().toISOString(),actor,rows},null,2)}</pre></main>;
}
createRoot(document.getElementById('root')!).render(allowed?<Review/>:<p>Staging-only review unavailable.</p>);
