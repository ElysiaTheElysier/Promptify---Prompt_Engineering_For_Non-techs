import {GoogleAuth} from 'google-auth-library';
import {providerStubEnabled,stubModelRequest,ProviderStubError} from './providerStubService';
const adc=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
export function normalizeModelPayload(model:string,payload:any){
 if(!/^gemini-3\.[6-9](?:[.-]|$)/.test(model)||!payload?.generationConfig)return payload;
 const {temperature,topP,topK,frequencyPenalty,presencePenalty,candidateCount,...config}=payload.generationConfig;
 const {thinkingBudget,...thinking}=config.thinkingConfig||{};
 return {...payload,generationConfig:{...config,thinkingConfig:{...thinking,thinkingLevel:String(thinking.thinkingLevel||'LOW').toUpperCase()}}};
}
export function vertexEnabled(){return process.env.AI_PROVIDER==='vertex';}
/** Raised before any provider request is sent, so the outcome is a definite failure. */
export class ProviderSetupError extends Error {}
export type ModelOperation='generateContent'|'streamGenerateContent'|'predict';
export async function modelRequest(model:string,operation:ModelOperation,payload:unknown,timeout:number){
 const suffix=operation==='streamGenerateContent'?'?alt=sse':'';
 if(!/^[a-zA-Z0-9._-]+$/.test(model))throw new ProviderSetupError('Invalid model');
 payload=normalizeModelPayload(model,payload);
 // Staging load tests only (guarded inside): replaces just this network call.
 if(providerStubEnabled())return stubModelRequest(model,operation,payload,timeout).catch(error=>{throw error instanceof ProviderStubError?new ProviderSetupError(error.message):error;});
 if(vertexEnabled()){
  const project=process.env.GOOGLE_CLOUD_PROJECT,region=(operation==='predict'?process.env.EMBEDDING_LOCATION:process.env.VERTEX_LOCATION)||'asia-southeast1';
  if(!project||!/^[a-z0-9-]+$/.test(project)||!/^[a-z0-9-]+$/.test(region))throw new ProviderSetupError('Vertex AI project/location not configured');
  let token;try{const client=await adc.getClient();token=await client.getAccessToken();}catch{throw new ProviderSetupError('Vertex ADC token unavailable');}
  if(!token.token)throw new ProviderSetupError('Vertex ADC token unavailable');
  const host=region==='global'?'aiplatform.googleapis.com':region+'-aiplatform.googleapis.com';
  return fetch(`https://${host}/v1/projects/${project}/locations/${region}/publishers/google/models/${model}:${operation}${suffix}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token.token},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeout)});
 }
 const key=process.env.GEMINI_API_KEY;if(!key)throw new ProviderSetupError('AI provider configuration is missing');
 return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${operation}${suffix}`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeout)});
}
