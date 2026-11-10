import {ApiAccessError} from './apiAuthorizationService';
import {sqlTransaction} from './cloudPostgresService';

type Kind='sheets'|'folders'|'files';
const SOURCE_ID=/^[A-Za-z0-9_-]+$/;
const misconfigured=()=>new ApiAccessError('Workspace source approvals are not configured correctly.',503);
const notApproved=()=>new ApiAccessError('This Workspace source is not approved for this class. Ask an administrator to configure its source binding.',403);

/** TM-008: approvals come from WORKSPACE_SOURCE_BINDINGS_JSON (legacy) plus the audited table from migration 025.
 * Passing `configuration` skips the database (offline tests and the env-only path). */
async function classBindings(classId:string,configuration?:string):Promise<Record<Kind,string[]>>{
 const raw=configuration??process.env.WORKSPACE_SOURCE_BINDINGS_JSON;
 let bindings:unknown;
 try{bindings=JSON.parse(raw||'{}');}catch{throw misconfigured();}
 if(!bindings||typeof bindings!=='object'||Array.isArray(bindings))throw misconfigured();
 const entry=(bindings as Record<string,unknown>)[classId];
 const pick=(kind:Kind)=>{const ids=entry&&typeof entry==='object'&&!Array.isArray(entry)?(entry as Record<string,unknown>)[kind]:undefined;return Array.isArray(ids)&&ids.every(id=>typeof id==='string'&&SOURCE_ID.test(id))?[...ids as string[]]:[];};
 const merged={sheets:pick('sheets'),folders:pick('folders'),files:pick('files')};
 if(configuration!==undefined)return merged;
 for(const row of await storedSources(classId))merged[row.kind].push(row.source_id);
 return merged;
}
async function storedSources(classId:string):Promise<Array<{kind:Kind;source_id:string}>>{
 try{return await sqlTransaction(undefined,async db=>(await db.query('SELECT kind,source_id FROM public.product_workspace_sources WHERE class_id=$1',[classId])).rows);}
 catch(error){if((error as any)?.code==='42P01')return [];throw error;} // 025 not applied: env approvals only.
}

/** Sharing a service identity across companies must not turn a supplied ID into permission. */
export async function requireWorkspaceSource(classId:string,kind:Kind,sourceId:string,configuration?:string){
 if(!(await classBindings(classId,configuration))[kind].includes(sourceId))throw notApproved();
}

/** Drive folder IDs approved for this class (empty when none or unconfigured). */
export async function approvedFolders(classId:string,configuration?:string):Promise<string[]>{
 try{return (await classBindings(classId,configuration)).folders;}catch(error){if((error as any)?.statusCode===503)return [];throw error;}
}
type FolderLister=(folderUrl:string)=>Promise<{files:Array<{id:string}>}>;
/** A file is approved when its ID is bound to the class, or when Drive itself lists it inside a folder bound to the class.
 * The folder check asks Drive (never trusts the supplied ID), so new files dropped into an approved folder need no redeploy. */
export async function requireWorkspaceFile(classId:string,fileId:string,listFolder:FolderLister,configuration?:string){
 const bindings=await classBindings(classId,configuration);
 if(bindings.files.includes(fileId))return;
 for(const folder of bindings.folders){if((await listFolder('https://drive.google.com/drive/folders/'+folder)).files.some(file=>file.id===fileId))return;}
 throw notApproved();
}
export async function requireWorkspaceFileUrl(classId:string,url:string,listFolder:FolderLister){
 const match=url.match(/^https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d|document\/d|spreadsheets\/d)\/([A-Za-z0-9_-]+)(?:\/|$)/);
 if(!match)throw new ApiAccessError('A Google Drive or Google Docs file URL is required.',422);
 await requireWorkspaceFile(classId,match[1],listFolder);
}
/** Governance list: env approvals are read-only (change needs a deploy); 'db' rows can be revoked in the app. */
export async function listWorkspaceSources(classId:string){
 const env=await classBindings(classId,process.env.WORKSPACE_SOURCE_BINDINGS_JSON||'{}').catch(()=>({sheets:[],folders:[],files:[]} as Record<Kind,string[]>));
 const kinds:Kind[]=['sheets','folders','files'];
 return [...kinds.flatMap(kind=>env[kind].map(source_id=>({kind,source_id,origin:'env' as const}))),...(await storedSources(classId)).map(row=>({kind:row.kind,source_id:row.source_id,origin:'db' as const}))];
}
/** Accepts a bare ID or a Sheets / Drive folder / Drive file URL; returns the ID or null. */
export function workspaceSourceId(value:string):string|null{
 const trimmed=value.trim(),match=trimmed.match(/^https:\/\/(?:docs|drive)\.google\.com\/(?:spreadsheets\/d|drive\/(?:u\/\d+\/)?folders|file\/d|document\/d|presentation\/d)\/([A-Za-z0-9_-]+)/);
 const id=match?match[1]:trimmed;
 return /^[A-Za-z0-9_-]{1,200}$/.test(id)?id:null;
}
