import {ApiAccessError} from './apiAuthorizationService';

/** Sharing a service identity across companies must not turn a supplied ID into permission. */
export function requireWorkspaceSource(classId:string,kind:'sheets'|'folders'|'files',sourceId:string,configuration=process.env.WORKSPACE_SOURCE_BINDINGS_JSON){
 let bindings:unknown;
 try{bindings=JSON.parse(configuration||'{}');}catch{throw new ApiAccessError('Workspace source approvals are not configured correctly.',503);}
 if(!bindings||typeof bindings!=='object'||Array.isArray(bindings))throw new ApiAccessError('Workspace source approvals are not configured correctly.',503);
 const entry=(bindings as Record<string,unknown>)[classId];
 const ids=entry&&typeof entry==='object'&&!Array.isArray(entry)?(entry as Record<string,unknown>)[kind]:undefined;
 if(!Array.isArray(ids)||!ids.every(id=>typeof id==='string'&&/^[A-Za-z0-9_-]+$/.test(id))||!ids.includes(sourceId))throw new ApiAccessError('This Workspace source is not approved for this class. Ask an administrator to configure its source binding.',403);
}

/** Drive folder IDs approved for this class (empty when none or unconfigured). */
export function approvedFolders(classId:string,configuration=process.env.WORKSPACE_SOURCE_BINDINGS_JSON):string[]{
 let entry:any;try{entry=(JSON.parse(configuration||'{}') as Record<string,any>)[classId];}catch{return [];}
 return Array.isArray(entry?.folders)?entry.folders.filter((id:unknown)=>typeof id==='string'&&/^[A-Za-z0-9_-]+$/.test(id)):[];
}
type FolderLister=(folderUrl:string)=>Promise<{files:Array<{id:string}>}>;
/** A file is approved when its ID is bound to the class, or when Drive itself lists it inside a folder bound to the class.
 * The folder check asks Drive (never trusts the supplied ID), so new files dropped into an approved folder need no redeploy. */
export async function requireWorkspaceFile(classId:string,fileId:string,listFolder:FolderLister,configuration=process.env.WORKSPACE_SOURCE_BINDINGS_JSON){
 try{requireWorkspaceSource(classId,'files',fileId,configuration);return;}catch(error){if((error as any)?.statusCode!==403)throw error;}
 for(const folder of approvedFolders(classId,configuration)){if((await listFolder('https://drive.google.com/drive/folders/'+folder)).files.some(file=>file.id===fileId))return;}
 throw new ApiAccessError('This Workspace source is not approved for this class. Ask an administrator to configure its source binding.',403);
}
export async function requireWorkspaceFileUrl(classId:string,url:string,listFolder:FolderLister){
 const match=url.match(/^https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d|document\/d|spreadsheets\/d)\/([A-Za-z0-9_-]+)(?:\/|$)/);
 if(!match)throw new ApiAccessError('A Google Drive or Google Docs file URL is required.',422);
 await requireWorkspaceFile(classId,match[1],listFolder);
}
