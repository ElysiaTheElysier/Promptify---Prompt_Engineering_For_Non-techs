import {googleAccessToken} from './googleRosterService';
import {ApiAccessError} from './apiAuthorizationService';
/** Administrator-only connection check: headers and MIME type, never employee rows. */
export async function inspectWorkspaceSource(url:string,tab:string){
 const match=url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
 if(!match||!tab.trim()||tab.length>100)throw new ApiAccessError('A Google Sheet and bounded tab name are required.',422);
 const range="'"+tab.replace(/'/g,"''")+"'!A1:AF1",sheetId=match[1];
 const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,{headers:{Authorization:'Bearer '+await googleAccessToken()},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new ApiAccessError('The Workspace identity cannot read this Sheet tab.',503);
 const data=await response.json();
 const drive=await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?fields=id,mimeType&supportsAllDrives=true`,{headers:{Authorization:'Bearer '+await googleAccessToken('https://www.googleapis.com/auth/drive.readonly')},signal:AbortSignal.timeout(15000)});
 if(!drive.ok)throw new ApiAccessError('The Workspace identity cannot read the supplied Drive file.',503);
 const metadata=await drive.json();
 return {sheetId,tab,headers:(data.values?.[0]||[]).map(String),mimeType:metadata.mimeType,scope:'Headers and provided file metadata only; no roster import or source edits'};
}
