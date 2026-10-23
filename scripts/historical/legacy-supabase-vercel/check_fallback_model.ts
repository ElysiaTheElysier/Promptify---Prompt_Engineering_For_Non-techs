import {loadEnv} from 'vite';
const config=loadEnv(process.argv.includes('--replacement')?'rotation':'rebuild',process.cwd(),'');
const model='gemini-2.5-flash';
const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model,{headers:{'x-goog-api-key':config.GEMINI_API_KEY},signal:AbortSignal.timeout(15000)});
if(!response.ok)throw new Error('Fallback model is unavailable: HTTP '+response.status);
const data=await response.json();
if(!data.supportedGenerationMethods?.includes('generateContent'))throw new Error('Fallback model does not support generation');
console.log('Configured credential supports '+model+' generation. Read-only check; no paid generation.');
