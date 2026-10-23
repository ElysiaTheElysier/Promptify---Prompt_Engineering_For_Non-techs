import {createHash} from 'node:crypto';
import {ApiAccessError} from './apiAuthorizationService.js';
import {googleAccessToken} from './googleRosterService.js';
export type SopChunk={position:number;page:number|null;content:string;embedding?:number[]};
export type ExtractedSop={content:string;chunks:SopChunk[];metadata:{filename:string;type:string;pages:number|null;bytes:number;sha256:string;storageBucket?:string;storagePath?:string;driveFileId?:string;versionTag?:string}};
const maxBytes=25*1024*1024;
export function chunkSop(pages:Array<{page:number|null;text:string}>):SopChunk[]{
 const chunks:SopChunk[]=[];
 for(const page of pages){const clean=page.text.replace(/\u0000/g,'').trim();for(let i=0;i<clean.length;i+=1800)chunks.push({position:chunks.length+1,page:page.page,content:clean.slice(i,i+2000)});}
 if(!chunks.length||chunks.length>60||pages.reduce((n,p)=>n+p.text.length,0)>100000)throw new ApiAccessError('SOP must contain searchable text within 100000 characters and 60 chunks.',422);
 return chunks;
}
export async function extractSop(bytes:Buffer,filename:string):Promise<ExtractedSop>{
 if(!bytes.length||bytes.length>maxBytes||filename.length>160)throw new ApiAccessError('SOP file exceeds the 25 MB limit.',422);
 const extension=filename.toLowerCase().split('.').pop();if(['docx','xlsx'].includes(extension||''))validateArchiveSize(bytes);let pages:Array<{page:number|null;text:string}>,totalPages:number|null=null;
 try{
  if(extension==='pdf'){
   if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('Invalid PDF');
   const {PDFParse}=await import('pdf-parse');const parser=new PDFParse({data:new Uint8Array(bytes)});
   try{const result=await parser.getText();if(result.total>100)throw new Error('Too many pages');pages=result.pages.map(p=>({page:p.num,text:p.text}));totalPages=result.total;}finally{await parser.destroy();}
  }else if(extension==='docx'){
   const mammoth=await import('mammoth');const result=await mammoth.extractRawText({buffer:bytes});pages=[{page:null,text:result.value}];
  }else if(extension==='xlsx'){
   const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes as any);
   let count=0;pages=workbook.worksheets.map(sheet=>{const rows:string[]=[];sheet.eachRow(row=>{if(++count>5000)throw new Error('Too many rows');rows.push((row.values as any[]).slice(1).map(cell=>typeof cell==='object'?cell?.text??cell?.result??'':cell??'').join(' | '));});return {page:null,text:`Sheet: ${sheet.name}\n${rows.join('\n')}`};});
  }else if(['md','txt','csv'].includes(extension||'')){pages=[{page:null,text:new TextDecoder('utf-8',{fatal:true}).decode(bytes)}];}
  else throw new Error('Unsupported format');
 }catch(error){if(error instanceof ApiAccessError)throw error;throw new ApiAccessError('SOP extraction failed. Use a readable PDF, DOCX, XLSX, Markdown, CSV or text file.',422);}
 const chunks=chunkSop(pages);const content=pages.map(p=>(p.page?`[Page ${p.page}]\n`:'')+p.text.trim()).join('\n\n');
 return {content,chunks,metadata:{filename,type:extension!.toUpperCase(),pages:totalPages,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
}
async function boundedBody(response:Response){
 if(!response.ok||Number(response.headers.get('content-length')||0)>maxBytes)throw new ApiAccessError('Drive file cannot be read or exceeds 25 MB.',422);
 const reader=response.body?.getReader();if(!reader)throw new ApiAccessError('Drive file is empty.',422);
 const parts:Uint8Array[]=[];let length=0;try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maxBytes)throw new ApiAccessError('Drive file exceeds 25 MB.',422);parts.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(parts);
}
export async function extractDriveSop(url:string){
 const match=url.match(/^https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d|document\/d|spreadsheets\/d)\/([A-Za-z0-9_-]+)(?:\/|$)/);
 if(!match)throw new ApiAccessError('A Google Drive or Google Docs file URL is required.',422);
 const fileId=match[1],headers={Authorization:`Bearer ${await googleAccessToken('https://www.googleapis.com/auth/drive.readonly')}`};
 const response=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size&supportsAllDrives=true`,{headers,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new ApiAccessError('Share the source file with the service account and enable Google Drive API.',503);
 const file=await response.json();if(Number(file.size||0)>maxBytes)throw new ApiAccessError('Drive file exceeds 25 MB.',422);
 let endpoint=`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,name=file.name;
 if(file.mimeType==='application/vnd.google-apps.document'){endpoint=`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text%2Fplain`;name+=' .txt';}
 if(file.mimeType==='application/vnd.google-apps.spreadsheet'){endpoint=`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;name+=' .xlsx';}
 const result=await extractSop(await boundedBody(await fetch(endpoint,{headers,signal:AbortSignal.timeout(15000)})),name);result.metadata.driveFileId=fileId;return result;
}
export async function embedSopChunks(chunks:SopChunk[],taskType='RETRIEVAL_DOCUMENT'){
 const model='gemini-embedding-001',key=process.env.GEMINI_API_KEY;if(!key)throw new ApiAccessError('Embedding provider is not configured.',503);
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({requests:chunks.map(c=>({model:`models/${model}`,taskType,outputDimensionality:768,content:{parts:[{text:c.content}]}}))}),signal:AbortSignal.timeout(40000)});
 if(!response.ok)throw new ApiAccessError('SOP indexing failed; the source has not been published.',response.status===429?429:502);
 const data=await response.json();if(data.embeddings?.length!==chunks.length)throw new ApiAccessError('Embedding count does not match source chunks.',502);
 return chunks.map((c,i)=>{const values=data.embeddings[i]?.values;if(!Array.isArray(values)||values.length!==768||values.some((v:unknown)=>typeof v!=='number'||!Number.isFinite(v)))throw new ApiAccessError('Embedding vector is invalid.',502);return {...c,embedding:values};});
}

// Bound expansion before XML document libraries inflate an Office ZIP.
function validateArchiveSize(bytes:Buffer){
 let offset=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){offset=i;break;}
 if(offset<0)throw new ApiAccessError('Invalid Office archive.',422);
 const count=bytes.readUInt16LE(offset+10);let cursor=bytes.readUInt32LE(offset+16),expanded=0;
 if(count>2000)throw new ApiAccessError('Office archive has too many entries.',422);
 for(let i=0;i<count;i++){
  if(cursor+46>bytes.length||bytes.readUInt32LE(cursor)!==0x02014b50)throw new ApiAccessError('Invalid Office archive.',422);
  const flags=bytes.readUInt16LE(cursor+8),size=bytes.readUInt32LE(cursor+24);expanded+=size;
  if(flags&1||size===0xffffffff||expanded>64*1024*1024)throw new ApiAccessError('Office archive expansion exceeds the processing limit.',422);
  cursor+=46+bytes.readUInt16LE(cursor+28)+bytes.readUInt16LE(cursor+30)+bytes.readUInt16LE(cursor+32);
 }
}
