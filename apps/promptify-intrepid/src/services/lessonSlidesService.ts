import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {ApiAccessError} from './apiAuthorizationService.js';
import {googleAccessToken} from './googleRosterService.js';
import {boundedBody} from './sopIngestionService.js';
import {listDriveFolder,type DriveSource} from './driveFolderService.js';
import {approvedFolders} from './workspaceSourcePolicyService';
import type {CloudDatabaseClient} from './cloudDatabaseService';
import type {LessonSlides} from '../types/production.js';

/** Lecture slides are kept apart from SOP originals: own bucket, own paths, never extracted, embedded or sent to AI. */
export const SLIDES_BUCKET='product-lesson-slides';
export const MAX_SLIDE_BYTES=25*1024*1024;
const GOOGLE_SLIDES='application/vnd.google-apps.presentation';
export type SlideDeckRow={id:string;title:string;is_default:boolean;published_version_id:string|null;updated_at?:string};
export type SlideVersionRow={id:string;deck_id:string;page_count:number;source_kind?:string;drive_file_id?:string|null;size_bytes?:number;created_at?:string;published_at?:string|null;storage_path?:string};
export type LessonSlideRow={lesson_id:string;mode:'inherit'|'deck'|'off';deck_id:string|null;start_page:number|null;end_page:number|null;revision:number};

/** The deck a learner sees for one class lesson: explicit deck, else the class default; only published versions count. */
export function resolveLessonSlides(lessonId:string,decks:SlideDeckRow[],versions:SlideVersionRow[],assignments:LessonSlideRow[]):LessonSlides|null{
 const row=assignments.find(a=>a.lesson_id===lessonId);
 if(row?.mode==='off')return null;
 const deck=row?.mode==='deck'?decks.find(d=>d.id===row.deck_id):decks.find(d=>d.is_default);
 const version=deck?.published_version_id?versions.find(v=>v.id===deck.published_version_id):undefined;
 if(!deck||!version)return null;
 const pages=version.page_count,start=row?.start_page?Math.min(row.start_page,pages):1;
 // Only a start page means "to the end of the deck"; no range means the whole deck.
 return {deckId:deck.id,versionId:version.id,title:deck.title,pageCount:pages,startPage:start,endPage:row?.start_page?Math.min(row.end_page||pages,pages):pages,ranged:!!row?.start_page};
}

async function rows<T>(request:PromiseLike<{data:any;error:any}>):Promise<T[]>{const {data,error}=await request;if(error)throw new ApiAccessError('Slides are unavailable.',503);return data||[];}
/** published=true reads only what learners may see; editors also get drafts. */
export async function readClassSlides(db:CloudDatabaseClient,classId:string,published:boolean){
 const [decks,assignments]=await Promise.all([
  rows<SlideDeckRow>(db.from('product_slide_decks').select('id,title,is_default,published_version_id,updated_at').eq('class_id',classId).order('created_at')),
  rows<LessonSlideRow>(db.from('product_lesson_slides').select('lesson_id,mode,deck_id,start_page,end_page,revision').eq('class_id',classId))]);
 let query=db.from('product_slide_versions').select('id,deck_id,page_count,source_kind,drive_file_id,size_bytes,created_at,published_at').eq('class_id',classId);
 if(published)query=query.in('id',decks.map(d=>d.published_version_id).filter(Boolean));
 return {decks,assignments,versions:await rows<SlideVersionRow>(query.order('created_at',{ascending:false}).limit(500))};
}

/** Readable, unencrypted PDF with at least one page. Throws a learner-safe 422 otherwise. */
export async function inspectSlidePdf(bytes:Uint8Array){
 if(!bytes.length||bytes.length>MAX_SLIDE_BYTES)throw new ApiAccessError('Choose a PDF up to 25 MB.',422);
 if(Buffer.from(bytes.subarray(0,1024)).toString('latin1').indexOf('%PDF-')<0)throw new ApiAccessError('This file is not a PDF.',422);
 let pages=0;
 try{pages=(await PDFDocument.load(bytes,{updateMetadata:false})).getPageCount();}
 catch(error){throw new ApiAccessError(/is encrypted/.test(String((error as Error)?.message))?'This PDF is password-protected. Export it without a password and upload again.':'This PDF cannot be read. Export it again and upload the new file.',422);}
 if(pages<1||pages>2000)throw new ApiAccessError('A slide PDF needs 1-2000 pages.',422);
 return {pages,sha256:createHash('sha256').update(bytes).digest('hex'),size:bytes.length};
}

/** Server-chosen object keys: the browser never names the path, and every version gets a new immutable key. */
export const slideUploadPath=(actorId:string,classId:string,requestId:string)=>`uploads/${classId}/${actorId}/${requestId}.pdf`;
export const slideDrivePath=(classId:string,requestId:string)=>`drive/${classId}/${requestId}.pdf`;

export function supportedSlideSource(file:{name:string;mimeType:string;size?:string}){
 return file.mimeType===GOOGLE_SLIDES||(file.mimeType==='application/pdf'||/\.pdf$/i.test(file.name))&&Number(file.size||0)<=MAX_SLIDE_BYTES;
}
/** PDFs and Google Slides inside the folders approved for this class. An unconfigured class gets an empty, explained list. */
export async function listClassDriveSlides(classId:string){
 const folders=await approvedFolders(classId),files:DriveSource[]=[];
 for(const folder of folders)for(const file of (await listDriveFolder('https://drive.google.com/drive/folders/'+folder,supportedSlideSource)).files)if(!files.some(f=>f.id===file.id))files.push(file);
 return {configured:folders.length>0,files};
}
/** PDF bytes of an approved Drive file: PDFs are copied as-is, Google Slides are exported (Google caps exports at 10 MB). */
export async function fetchDriveSlidePdf(fileId:string){
 const headers={Authorization:`Bearer ${await googleAccessToken('https://www.googleapis.com/auth/drive.readonly')}`};
 const meta=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size&supportsAllDrives=true`,{headers,signal:AbortSignal.timeout(15000)});
 if(!meta.ok)throw new ApiAccessError('Promptify can no longer read this Drive file (deleted or unshared). The published version stays in use.',409);
 const file=await meta.json();if(file.id!==fileId||typeof file.mimeType!=='string')throw new ApiAccessError('Drive returned invalid file metadata.',502);
 let endpoint:string,sourceKind:'drive_pdf'|'drive_slides';
 if(file.mimeType===GOOGLE_SLIDES){endpoint=`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application%2Fpdf`;sourceKind='drive_slides';}
 else if(file.mimeType==='application/pdf'){if(Number(file.size||0)>MAX_SLIDE_BYTES)throw new ApiAccessError('Drive PDF exceeds 25 MB.',422);endpoint=`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;sourceKind='drive_pdf';}
 else throw new ApiAccessError('Choose a PDF or Google Slides file. For PowerPoint, export a PDF or open it as Google Slides first.',422);
 const response=await fetch(endpoint,{headers,signal:AbortSignal.timeout(30000)});
 if(!response.ok){
  const reason=JSON.stringify(await response.json().catch(()=>({})));
  if(sourceKind==='drive_slides'&&/exportSizeLimitExceeded|too large/i.test(reason))throw new ApiAccessError('Google Slides can export at most 10 MB. Download it as PDF from Google Slides and upload the PDF from your computer.',422);
  throw new ApiAccessError('Promptify can no longer read this Drive file (deleted or unshared). The published version stays in use.',409);
 }
 return {bytes:await boundedBody(response),sourceKind};
}
