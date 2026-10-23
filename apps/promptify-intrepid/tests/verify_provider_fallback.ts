import assert from 'node:assert/strict';
import {productionGenerate} from '../src/services/productionAiService';
process.env.GEMINI_API_KEY='offline-test-key';process.env.GEMINI_MODEL='primary';process.env.GEMINI_FALLBACK_MODEL='fallback';
const original=globalThis.fetch;
const output=()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'Offline test'}]}}]}));
const calls:string[]=[];
globalThis.fetch=async(input)=>{calls.push(String(input));return calls.length===1?new Response('',{status:429}):output();};
try{
 const value=await productionGenerate({prompt:'Describe the supplied fictional task.'} as any);assert.equal(value.model,'fallback');assert.equal(calls.length,2);
 calls.length=0;globalThis.fetch=async(input)=>{calls.push(String(input));throw new Error('Offline timeout');};
 await assert.rejects(()=>productionGenerate({prompt:'Describe the supplied fictional task.'} as any),/uncertain/);assert.equal(calls.length,1);
 calls.length=0;globalThis.fetch=async(input)=>{calls.push(String(input));return new Response('',{status:403});};
 await assert.rejects(()=>productionGenerate({prompt:'Describe the supplied fictional task.'} as any),/rejected/);assert.equal(calls.length,1);
 console.log('Provider fallback passed: explicit capacity rejection uses configured fallback; uncertain timeout and forbidden requests are never retried. No live calls.');
}finally{globalThis.fetch=original;}
