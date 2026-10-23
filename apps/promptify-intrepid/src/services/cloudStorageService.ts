import {Storage} from '@google-cloud/storage';
import {createHash} from 'node:crypto';
const storage=new Storage();
const maxOriginalBytes=25*1024*1024;
function object(path:string){const bucket=process.env.GCP_SOP_BUCKET;if(!bucket)throw Error('Private SOP bucket is not configured');if(!path||path.startsWith('/')||path.split('/').some(x=>/^\.\.$/.test(x)||x===''))throw Error('Invalid storage path');return storage.bucket(bucket).file(path);}
export const cloudStorage={from:(logicalBucket:string)=>{
 if(logicalBucket!=='product-sop-originals')throw Error('Storage bucket not allowed');
 return {
  async createSignedUrl(path:string,seconds:number,options?:{download?:boolean|string}){try{
   const filename=typeof options?.download==='string'?options.download:path.split('/').pop()||'source';
   const safeName=filename.replace(/[\r\n"\\]/g,'_');
   const disposition=options?.download?`attachment; filename="${safeName.replace(/[^\x20-\x7e]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(safeName).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}`:undefined;
   const [url]=await object(path).getSignedUrl({version:'v4',action:'read',expires:Date.now()+Math.min(seconds,300)*1000,...(disposition?{responseDisposition:disposition}:{})});return {data:{signedUrl:url},error:null};}catch(error){return {data:null,error};}},
  async createSignedUploadUrl(path:string,options:{upsert?:boolean;size:number}){try{if(!Number.isInteger(options.size)||options.size<=0||options.size>25*1024*1024)throw Error('Invalid upload size');const [url]=await object(path).getSignedUrl({version:'v4',action:'write',expires:Date.now()+300000,extensionHeaders:{'x-goog-if-generation-match':'0','content-length':String(options.size)}});return {data:{token:url,signedUrl:url},error:null};}catch(error){return {data:null,error};}},
  async putImmutableOriginal(path:string,bytes:Buffer,options:{sha256:string;contentType:string}){
   try{
    if(bytes.length===0||bytes.length>maxOriginalBytes)throw Error('Invalid original size');
    const digest=createHash('sha256').update(bytes).digest('hex');
    if(!/^[a-f0-9]{64}$/.test(options.sha256)||digest!==options.sha256)throw Error('Original hash mismatch');
    const file=object(path);
    try{
     await file.save(bytes,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:options.contentType,metadata:{sha256:digest}}});
    }catch(error:any){
     // A concurrent/repeated ingestion may already have created this exact immutable object.
     if(error?.code!==412&&error?.code!=='412'&&error?.code!=='conditionNotMet')throw error;
     const [metadata]=await file.getMetadata();
     if(Number(metadata.size)!==bytes.length||metadata.metadata?.sha256!==digest||metadata.contentType!==options.contentType)throw Error('Existing private original does not match the indexed source');
    }
    const [metadata]=await file.getMetadata();
    return {data:{path,...(metadata.generation?{generation:String(metadata.generation)}:{})},error:null};
   }catch(error){return {data:null,error};}
  },
  async download(path:string){try{const file=object(path),[meta]=await file.getMetadata();if(Number(meta.size)>25*1024*1024)throw Error('File too large');const [bytes]=await file.download({validation:'crc32c'});if(bytes.length>25*1024*1024)throw Error('File too large');return {data:new Blob([new Uint8Array(bytes)]),error:null};}catch(error){return {data:null,error};}}
 };
}};

