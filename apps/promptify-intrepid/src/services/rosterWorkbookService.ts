import {googleAccessToken,parseRoster,type RosterMapping} from './googleRosterService';
import {ApiAccessError} from './apiAuthorizationService';
import {sqlTransaction} from './cloudPostgresService';
import {parseTableRoster} from './rosterTableService';
export const WORKBOOK_TABS={Sync:['Sync At (ISO)'],Users:['Email','Full Name','Department','Country','Employee ID','Office Location'],Department:['Department'],SOPs:['Title','Department','URL'], 'Main PIC':['Name','Email','Department'],Report:['Report URL']} as const;
export type WorkbookBundle={rows:any[];departments:string[];sops:any[];contacts:any[];reports:any[];schedule:string[];nextSync:string};
function records(values:any[][],headers:readonly string[]){if(values.length>501||values.some(row=>row.some(v=>String(v??'').length>2000))||!values.length||headers.some((h,i)=>values[0][i]!==h))throw new ApiAccessError('Workbook header changed. Use template v1.',422);return values.slice(1).filter(row=>row.some(v=>String(v??'').trim())).map(row=>Object.fromEntries(headers.map((h,i)=>[h,String(row[i]??'').trim()])));}
export function parseWorkbook(tabs:Record<string,any[][]>,department:string,now=Date.now()):WorkbookBundle{
 const read=(name:keyof typeof WORKBOOK_TABS)=>records(tabs[name]||[],WORKBOOK_TABS[name]);
 const departments=read('Department').map(r=>r.Department);if(!departments.includes(department)||new Set(departments).size!==departments.length)throw new ApiAccessError('Department tab must list each department once.',422);
 const users=read('Users');if(users.some(r=>!departments.includes(r.Department)))throw new ApiAccessError('Unknown user department.',422);
 const rows=parseRoster(tabs.Users,{tab:'Users',range:'A1:F501',email:'Email',fullName:'Full Name',department:'Department',country:'Country'},department,{allowEmpty:true}).map(row=>({...row,employeeId:users.find(r=>r.Email.toLowerCase()===row.email)?.['Employee ID']||'',officeLocation:users.find(r=>r.Email.toLowerCase()===row.email)?.['Office Location']||''}));
 const validUrl=(url:string)=>{try{return new URL(url).protocol==='https:';}catch{return false;}};
 const sops=read('SOPs');if(sops.some(r=>!r.Title||!departments.includes(r.Department)||!validUrl(r.URL)))throw new ApiAccessError('Invalid SOP reference.',422);
 const contacts=read('Main PIC');if(contacts.some(r=>!r.Name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.Email)||!departments.includes(r.Department)))throw new ApiAccessError('Invalid Main PIC contact.',422);
 const reports=read('Report');if(reports.some(r=>!validUrl(r['Report URL'])))throw new ApiAccessError('Invalid report URL.',422);
 const sorted=[...new Set(read('Sync').map(r=>syncTime(r['Sync At (ISO)'])))].sort();
 // Empty Sync tab: re-read every 15 minutes while scheduled sync is on (same cadence as the table layout).
 const nextSync=sorted.length?sorted.find(t=>Date.parse(t)>now)||'infinity':new Date(now+15*60*1000).toISOString();
 return {rows,departments,sops:sops.filter(r=>r.Department===department),contacts:contacts.filter(r=>r.Department===department),reports,schedule:sorted,nextSync};
}
// shortcut: a time without a timezone is Vietnam time (+07:00); add a per-class timezone when a client outside Vietnam signs.
const VN_OFFSET=7*3600000;
/** One Sync cell: ISO with timezone, 2026-11-12 08:00, 12/11/2026 08:00 (day first), or a Sheets date serial. Returns ISO UTC. */
export function syncTime(raw:string):string{
 const fail=():never=>{throw new ApiAccessError(`Sync tab: "${raw.slice(0,40)}" is not a valid time. Write it like 12/11/2026 08:00 (Vietnam time), or leave the Sync tab empty to sync every 15 minutes.`,422);};
 if(/^\d+(\.\d+)?$/.test(raw)){const serial=Number(raw);return serial>=1&&serial<2958466?new Date(Math.round((serial-25569)*86400)*1000-VN_OFFSET).toISOString():fail();}
 if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(raw)){const t=Date.parse(raw);return Number.isFinite(t)?new Date(t).toISOString():fail();}
 const iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/),vn=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
 const m=iso||vn||fail(),[y,mo,d]=(iso?[m[1],m[2],m[3]]:[m[3],m[2],m[1]]).map(Number),[h,mi,s]=[m[4],m[5],m[6]].map(v=>Number(v||0));
 const utc=Date.UTC(y,mo-1,d,h,mi,s),back=new Date(utc);
 if(back.getUTCFullYear()!==y||back.getUTCMonth()!==mo-1||back.getUTCDate()!==d||h>23||mi>59||s>59)fail();
 return new Date(utc-VN_OFFSET).toISOString();
}
export async function readRosterSource(sheetId:string,mapping:RosterMapping&{templateVersion?:number},department:string):Promise<WorkbookBundle|null>{
 if(mapping.templateVersion===2){
  if(!/^[A-Za-z0-9_-]+$/.test(sheetId)||!mapping.tab?.trim()||mapping.tab.length>100)throw new ApiAccessError('A bounded Table workbook tab is required.',422);
  const range="'"+mapping.tab.replace(/'/g,"''")+"'!A1:AF2002";
  const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,{headers:{Authorization:`Bearer ${await googleAccessToken()}`},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new ApiAccessError('Table workbook could not be read. Check tab and existing service identity access.',503);
  const data=await response.json();return parseTableRoster(data.values||[],department);
 }
 if(mapping.templateVersion!==1)return null;
 if(!/^[A-Za-z0-9_-]+$/.test(sheetId))throw new ApiAccessError('Invalid Sheet ID.',422);
 const names=Object.keys(WORKBOOK_TABS),query=names.map(n=>'ranges='+encodeURIComponent("'"+n+"'!A1:F502")).join('&');
 const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${query}`,{headers:{Authorization:`Bearer ${await googleAccessToken()}`},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new ApiAccessError('Workbook could not be read. Check all six tabs and service account access.',503);
 const data=await response.json(),tabs=Object.fromEntries(names.map((n,i)=>[n,data.valueRanges?.[i]?.values||[]]));
 // Sync is read again as raw values so a cell Sheets turned into a date arrives as a serial number, not locale-formatted text (12/11 vs 11/12).
 const sync=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("'Sync'!A1:A502")}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,{headers:{Authorization:`Bearer ${await googleAccessToken()}`},signal:AbortSignal.timeout(15000)});
 if(!sync.ok)throw new ApiAccessError('Workbook could not be read. Check all six tabs and service account access.',503);
 tabs.Sync=(await sync.json()).values||[];
 return parseWorkbook(tabs,department);
}
export async function finishWorkbookSync(logId:string,rows:any[],bundle:WorkbookBundle|null){
 try{return await sqlTransaction(undefined,async db=>{
 if(bundle){
  const manifest={...bundle,rows:undefined};
  return (await db.query('SELECT public.product_finish_roster_snapshot($1,$2::jsonb,$3::jsonb,$4::timestamptz) result',[logId,JSON.stringify(rows),JSON.stringify(manifest),bundle.nextSync])).rows[0].result;
 }
 const imported=(await db.query('SELECT public.product_finish_roster_sync($1,$2::jsonb,NULL) result',[logId,JSON.stringify(rows)])).rows[0].result;
 return imported;
 });}catch(error){
  const code=String((error as {code?:unknown})?.code||'');
  if(['42P01','42883','42501'].includes(code))throw new ApiAccessError('The roster lifecycle schema upgrade is unavailable.',503);
  if(['P0001','23505','40001','40P01'].includes(code))throw new ApiAccessError('The roster changed during synchronization. Refresh the connection and inspect its saved log before retrying.',409);
  throw error;
 }
}
