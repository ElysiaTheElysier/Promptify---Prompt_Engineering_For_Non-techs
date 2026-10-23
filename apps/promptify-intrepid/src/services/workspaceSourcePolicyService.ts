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

export function requireWorkspaceFileUrl(classId:string,url:string){
 const match=url.match(/^https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d|document\/d|spreadsheets\/d)\/([A-Za-z0-9_-]+)(?:\/|$)/);
 if(!match)throw new ApiAccessError('A Google Drive or Google Docs file URL is required.',422);
 requireWorkspaceSource(classId,'files',match[1]);
}
