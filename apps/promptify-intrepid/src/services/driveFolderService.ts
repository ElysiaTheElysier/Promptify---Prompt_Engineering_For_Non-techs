import {googleAccessToken} from './googleRosterService.js';
import {ApiAccessError} from './apiAuthorizationService.js';
export type DriveSource={id:string;name:string;url:string;mimeType:string};
export function driveFolderId(url:string){
 const match=url.match(/^https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)(?:[/?#]|$)/);
 if(!match)throw new ApiAccessError('A Google Drive folder URL is required.',422);
 return match[1];
}
export function supportedDriveSource(file:{name:string;mimeType:string;size?:string}){
 return Number(file.size||0)<=25*1024*1024&&(['application/vnd.google-apps.document','application/vnd.google-apps.spreadsheet'].includes(file.mimeType)||/\.(pdf|docx|xlsx|md|csv|txt)$/i.test(file.name));
}
export async function listDriveFolder(url:string):Promise<{files:DriveSource[];skipped:number}> {
 const root=driveFolderId(url),headers={Authorization:`Bearer ${await googleAccessToken('https://www.googleapis.com/auth/drive.readonly')}`};
 const deadline=Date.now()+30000;
 const queue=[{id:root,depth:0}],seen=new Set<string>(),files:DriveSource[]=[];let skipped=0;
 while(queue.length){
  const folder=queue.shift()!;if(seen.has(folder.id))continue;seen.add(folder.id);
  if(seen.size>10)throw new ApiAccessError('Choose a smaller Drive folder: at most 10 subfolders.',422);
  const params=new URLSearchParams({q:`'${folder.id}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,mimeType,size)',pageSize:'100',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});
  const remaining=deadline-Date.now();
  if(remaining<=0)throw new ApiAccessError('Folder scan timed out. Choose a smaller folder and retry.',503);
  const r=await fetch('https://www.googleapis.com/drive/v3/files?'+params,{headers,signal:AbortSignal.timeout(Math.min(10000,remaining))});
  if(!r.ok)throw new ApiAccessError('Share the Drive folder with the service account and enable Google Drive API.',503);
  const data=await r.json();if(data.nextPageToken)throw new ApiAccessError('Choose a smaller Drive folder: at most 100 entries per folder.',422);
  for(const f of data.files||[]){
   if(f.mimeType==='application/vnd.google-apps.folder'){
    if(folder.depth>=2)throw new ApiAccessError('Choose a Drive folder with at most 3 levels.',422);
    queue.push({id:f.id,depth:folder.depth+1});
   }else if(supportedDriveSource(f)){
    if(!files.some(row=>row.id===f.id))files.push({id:f.id,name:f.name,mimeType:f.mimeType,url:'https://drive.google.com/file/d/'+f.id+'/view'});
    if(files.length>20)throw new ApiAccessError('Choose a smaller Drive folder: at most 20 supported files.',422);
   }else skipped++;
  }
 }
 if(!files.length)throw new ApiAccessError('No supported SOP files found in the shared Drive folder.',422);
 return {files,skipped};
}
