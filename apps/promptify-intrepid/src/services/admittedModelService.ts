import {modelRequest,type ModelOperation} from './vertexAiService';
import {runWithProviderAdmission} from './providerAdmissionService';

/** Both Generation and every parallel Judge/retry use this one global admission path. */
export async function admittedModelRequest(model:string,operation:ModelOperation,payload:unknown,timeout:number){
 // Embeddings have a distinct provider/model budget; do not silently mix them with Gemini.
 if(operation==='predict')return modelRequest(model,operation,payload,timeout);
 const started=performance.now();
 try{
  const response=await runWithProviderAdmission(payload,timeout,remaining=>modelRequest(model,operation,payload,remaining),{stream:operation==='streamGenerateContent'});
  logProviderSend(model,operation,started,response.status);
  return response;
 }catch(error){logProviderSend(model,operation,started,0,String((error as any)?.code||(error as any)?.name||'error').slice(0,60));throw error;}
}
/** I13: one event per Gemini request (each retry and hedge counts), whatever PROVIDER_ADMISSION_MODE is.
 * ms includes admission wait when admission is on; streamed bodies are still being read when this is logged. */
function logProviderSend(model:string,operation:string,started:number,status:number,error?:string){
 console.log(JSON.stringify({event:'provider_send',model,operation,status,ms:Math.round(performance.now()-started),...(error?{error}:{})}));
}
