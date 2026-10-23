import {ApiAccessError} from './apiAuthorizationService';
import {parseRoster} from './googleRosterService';

const key=(value:unknown)=>String(value??'').trim().toLowerCase().replace(/[ _-]/g,'');
/** Read the four side-by-side tables; never infer roles or publish referenced assets. */
export function parseTableRoster(values:unknown[][],department:string,now=Date.now()){
 if(!values.length||values.length>2001||values.some(r=>r.length>32||r.some(v=>String(v??'').length>2000)))throw new ApiAccessError('Table workbook exceeds the supported bounds.',422);
 const headers=values[0].map(key),cells=values.slice(1),at=(row:unknown[],i:number)=>i<0?'':String(row[i]??'').trim();
 const unique=(name:string)=>{const indices=headers.flatMap((h,i)=>h===name?[i]:[]);if(indices.length!==1)throw new ApiAccessError(`Table workbook requires one ${name} header.`,422);return indices[0];};
 const email=unique('email'),departmentsColumn=unique('departmentname'),asset=unique('assetid');
 const userDepartment=headers.findIndex((h,i)=>h==='department'&&i>email&&i<asset),country=headers.findIndex((h,i)=>h==='country'&&i>email&&i<asset),fullName=headers.findIndex((h,i)=>h==='fullname'&&i>email&&i<asset);
 const assetDepartment=headers.findIndex((h,i)=>h==='department'&&i>asset),title=unique('assettitle'),access=unique('accessstatus'),fileId=unique('googlefileid'),direct=headers.indexOf('directurl');
 const countryName=headers.findIndex((h,i)=>h==='name'&&i<departmentsColumn),countryCode=headers.findIndex((h,i)=>h==='code'&&i<departmentsColumn);
 if([userDepartment,country,assetDepartment,countryName,countryCode].some(i=>i<0)||!(countryName<departmentsColumn&&departmentsColumn<email&&email<asset&&asset<title))throw new ApiAccessError('Country, Department, User and SOP table boundaries are invalid.',422);
 const departments=cells.map(r=>at(r,departmentsColumn)).filter(Boolean);
 const departmentNames=new Map(departments.map(d=>[key(d),d]));
 if(!departmentNames.has(key(department))||departmentNames.size!==departments.length)throw new ApiAccessError('Department table must list the selected department exactly once.',422);
 const countries=new Set(cells.flatMap(r=>[at(r,countryName),at(r,countryCode)]).filter(Boolean));
 const roster=cells.filter(r=>at(r,email)||at(r,country)||at(r,userDepartment));
 if(roster.some(r=>!departmentNames.has(key(at(r,userDepartment)))||!countries.has(at(r,country))))throw new ApiAccessError('User country or department is not in the reference tables.',422);
 const rows=parseRoster([['Email','Full Name','Country','Department'],...roster.map(r=>[at(r,email),at(r,fullName),at(r,country),key(at(r,userDepartment))===key(department)?department:departmentNames.get(key(at(r,userDepartment)))])],{tab:'Table',range:'A1:AF2001',email:'Email',fullName:fullName<0?'':'Full Name',country:'Country',department:'Department'},department,{allowEmpty:true}).map(r=>({...r,employeeId:'',officeLocation:''}));
 const ids=new Set<string>(),sops:Array<{Title:string;Department:string;URL:string;assetId:string}>=[];
 let excludedAssets=0,unmappedAssets=0;
 for(const row of cells){
  const id=at(row,asset),name=at(row,title),dep=at(row,assetDepartment);
  if(!id&&!name&&!dep)continue;
  if(!departmentNames.has(key(dep))){unmappedAssets++;continue;}
  if(!id||!name||ids.has(id))throw new ApiAccessError('Invalid or duplicate scoped SOP asset.',422);
  ids.add(id);
  if(key(dep)!==key(department))continue;
  const status=at(row,access).toLowerCase().replace(/[^a-z]/g,'');
  if(status!=='accessgranted'){excludedAssets++;continue;}
  const googleId=at(row,fileId),url=at(row,direct);
  const googleUrl=/^[A-Za-z0-9_-]{10,200}$/.test(googleId)?'https://drive.google.com/file/d/'+googleId+'/view':url;
  let target:URL;try{target=new URL(googleUrl);}catch{excludedAssets++;continue;}
  if(target.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(target.hostname)){excludedAssets++;continue;}
  sops.push({Title:name,Department:department,URL:target.href,assetId:id});
 }
 return {rows,departments,sops,contacts:[],reports:[],schedule:[],nextSync:new Date(now+15*60*1000).toISOString(),sourceFormat:'table-v2' as const,excludedAssets,unmappedAssets};
}
