import {modelRequest,type ModelOperation} from './vertexAiService';
import {runWithProviderAdmission} from './providerAdmissionService';

/** Both Generation and every parallel Judge/retry use this one global admission path. */
export function admittedModelRequest(model:string,operation:ModelOperation,payload:unknown,timeout:number){
 // Embeddings have a distinct provider/model budget; do not silently mix them with Gemini.
 if(operation==='predict')return modelRequest(model,operation,payload,timeout);
 return runWithProviderAdmission(payload,timeout,remaining=>modelRequest(model,operation,payload,remaining),{stream:operation==='streamGenerateContent'});
}
