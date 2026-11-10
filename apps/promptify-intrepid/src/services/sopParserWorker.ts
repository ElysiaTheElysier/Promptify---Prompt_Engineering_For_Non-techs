import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';

/** TM-007: SOP files (PDF / DOCX / XLSX / text) are parsed in a short-lived child process with its own heap limit,
 * a deadline and an environment without secrets (no DATABASE_URL, no keys), so a hostile or broken file cannot crash,
 * exhaust or hang the API process. It still runs in the API container: the metadata server (service identity) stays
 * reachable, so full isolation needs a separate service with a minimal identity (owner decision, see threat model).
 * A worker thread with resourceLimits was tried first: Node 24 segfaults at exit after pdf-parse ran under those limits. */
export const PARSE_TIMEOUT_MS=60000;
export const PARSE_HEAP_MB=512;
type Parsed={pages:Array<{page:number|null;text:string}>;totalPages:number|null};
export async function parseSopPages(bytes:Buffer,extension:string):Promise<Parsed>{
 let pages:Array<{page:number|null;text:string}>,totalPages:number|null=null;
  if(extension==='pdf'){
   if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('Invalid PDF');
   const {PDFParse}=await import('pdf-parse');const parser=new PDFParse({data:new Uint8Array(bytes)});
   try{const result=await parser.getText();if(result.total>100)throw new Error('Too many pages');pages=result.pages.map(p=>({page:p.num,text:p.text}));totalPages=result.total;}finally{await parser.destroy();}
  }else if(extension==='docx'){
   const mammoth=await import('mammoth');const result=await mammoth.extractRawText({buffer:bytes});pages=[{page:null,text:result.value}];
  }else if(extension==='xlsx'){
   const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes as any);
   let count=0;pages=workbook.worksheets.map(sheet=>{const rows:string[]=[];sheet.eachRow(row=>{if(++count>5000)throw new Error('Too many rows');rows.push((row.values as any[]).slice(1).map(cell=>typeof cell==='object'?cell?.text??cell?.result??'':cell??'').join(' | '));});return {page:null,text:`Sheet: ${sheet.name}\n${rows.join('\n')}`};});
  }else if(['md','txt','csv'].includes(extension)){pages=[{page:null,text:new TextDecoder('utf-8',{fatal:true}).decode(bytes)}];}
  else throw new Error('Unsupported format');
 return {pages,totalPages};
}
export function parseInWorker(bytes:Buffer,extension:string,timeoutMs=PARSE_TIMEOUT_MS):Promise<Parsed>{
 return new Promise((resolve,reject)=>{
  const child=fork(fileURLToPath(import.meta.url),[],{execArgv:[...process.execArgv,`--max-old-space-size=${PARSE_HEAP_MB}`],
   env:{SOP_PARSER_CHILD:'1',PATH:process.env.PATH||'',NODE_ENV:process.env.NODE_ENV||''},serialization:'advanced',stdio:['ignore','ignore','ignore','ipc']});
  let settled=false;const finish=(error:Error|null,value?:Parsed)=>{if(settled)return;settled=true;clearTimeout(timer);if(child.exitCode===null)child.kill();error?reject(error):resolve(value!);};
  const timer=setTimeout(()=>finish(Error('SOP parser timed out')),timeoutMs);
  child.once('message',(message:any)=>finish(message?.ok?null:Error(String(message?.error||'SOP parser failed')),message?.value));
  child.once('error',error=>finish(error));
  child.once('exit',code=>finish(Error('SOP parser stopped ('+code+')')));
  child.send({bytes,extension});
 });
}
if(process.env.SOP_PARSER_CHILD==='1'&&process.send)process.once('message',(task:any)=>{
 parseSopPages(Buffer.from(task.bytes),String(task.extension)).then(value=>({ok:true,value}),error=>({ok:false,error:String(error?.message||error)}))
  .then(reply=>process.send!(reply,()=>process.exit(0)));
});
