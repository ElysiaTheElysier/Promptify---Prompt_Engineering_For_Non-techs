import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readGenerationStream,productionGenerateStream} from '../src/services/productionAiService';
import {runWithProviderAdmission} from '../src/services/providerAdmissionService';
import {handleGenerationStream,generationStreamEnabled} from '../src/services/generationStreamService';
import {cloudHandler} from '../src/services/cloudRunServer';
import {ApiAccessError} from '../src/services/apiAuthorizationService';
import {AiServerError} from '../src/services/apiServerService';

// TC-PLAY-02 token streaming. Mocked fetch and fake HTTP objects only; no provider, database or network.
process.env.NODE_ENV='test';
const encoder=new TextEncoder();
const streamOf=(pieces:string[],failAfter?:number)=>new ReadableStream<Uint8Array>({start(controller){pieces.forEach((piece,i)=>{if(failAfter===i){controller.error(Error('socket reset'));return;}controller.enqueue(encoder.encode(piece));});if(failAfter===undefined)controller.close();}});
const sse=(...chunks:unknown[])=>chunks.map(c=>`data: ${JSON.stringify(c)}\r\n\r\n`).join('');
const text=(t:string,extra:Record<string,unknown>={})=>({candidates:[{content:{parts:[{text:t}]},...extra}]});
const finalChunk={candidates:[{content:{parts:[{text:'!'}]},finishReason:'STOP',groundingMetadata:{groundingChunks:[{web:{uri:'https://example.test/a',title:'A'}}]}}],usageMetadata:{totalTokenCount:77}};
const body=sse({candidates:[{content:{parts:[{thought:true,text:'thinking…'}]}}]},text('Hello'),text(' world'),finalChunk);

// 1. Parser: split at arbitrary byte boundaries, CRLF framing, thoughts never streamed.
{
 const deltas:string[]=[];
 const pieces=body.match(/[\s\S]{1,7}/g)!;
 const data=await readGenerationStream(streamOf(pieces),t=>deltas.push(t));
 assert.deepEqual(deltas,['Hello',' world','!']);
 assert.equal(data.usageMetadata.totalTokenCount,77);
 assert.equal(data.candidates[0].finishReason,'STOP');
 assert.deepEqual(data.candidates[0].content.parts,[{thought:true,text:'thinking…'},{text:'Hello world!'}]);
 await assert.rejects(()=>readGenerationStream(streamOf([sse(text('a')),'data: {broken'+'\n\n']),()=>{}),(e:any)=>e.statusCode===502);
 await assert.rejects(()=>readGenerationStream(streamOf([sse(text('a')),sse(text('b'))],1),()=>{}),(e:any)=>e.statusCode===504,'cut stream is an uncertain outcome');
 await assert.rejects(()=>readGenerationStream(streamOf(['']),()=>{}),(e:any)=>e.statusCode===502);
}

// 2. Provider: streamGenerateContent?alt=sse, same validation and result as the JSON path, bounded retry.
const saved=Object.fromEntries(['GEMINI_API_KEY','GEMINI_MODEL','GEMINI_FALLBACK_MODEL','AI_PROVIDER','PROVIDER_ADMISSION_MODE'].map(n=>[n,process.env[n]]));
const original=globalThis.fetch;
try{
 process.env.GEMINI_API_KEY='offline-only';process.env.GEMINI_MODEL='gemini-3.8-flash';
 delete process.env.GEMINI_FALLBACK_MODEL;delete process.env.AI_PROVIDER;delete process.env.PROVIDER_ADMISSION_MODE;
 const urls:string[]=[];let responses:Array<()=>Response>=[];
 globalThis.fetch=async(url:any)=>{urls.push(String(url));return responses.shift()!();};
 responses=[()=>new Response(streamOf([body]),{headers:{'content-type':'text/event-stream'}})];
 const deltas:string[]=[];
 const result=await productionGenerateStream({prompt:'Summarise the fictional SOP.'} as any,t=>deltas.push(t));
 assert.match(urls[0],/:streamGenerateContent\?alt=sse$/);
 assert.equal(result.output,'Hello world!');assert.equal(result.tokens,77);assert.equal(result.reasoningSummary,'thinking…');
 assert.equal(result.streamed,true);assert.deepEqual(result.groundingSources,[{title:'A',url:'https://example.test/a'}]);
 assert.deepEqual(deltas,['Hello',' world','!']);
 // Blocked output: the learner saw partial text, but nothing is accepted as a successful result.
 responses=[()=>new Response(streamOf([sse(text('partial'),{candidates:[{finishReason:'SAFETY'}]})]))];
 await assert.rejects(()=>productionGenerateStream({prompt:'x'} as any,()=>{}),(e:any)=>e.statusCode===502&&/blocked or incomplete/.test(e.message));
 // A capacity rejection is retried once before any token is streamed.
 urls.length=0;
 responses=[()=>new Response(JSON.stringify({error:{status:'RESOURCE_EXHAUSTED'}}),{status:429,headers:{'retry-after':'0'}}),()=>new Response(streamOf([body]))];
 assert.equal((await productionGenerateStream({prompt:'x'} as any,()=>{})).output,'Hello world!');assert.equal(urls.length,2);
 await assert.rejects(()=>productionGenerateStream({prompt:'Email me at someone@example.com'} as any,()=>{}),(e:any)=>e.statusCode===422,'PII is refused before any provider call');
}finally{
 globalThis.fetch=original;for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;
}

// 3. Admission: the permit is held for the whole stream and settled once with the final usage.
{
 process.env.PROVIDER_ADMISSION_MODE='sql';
 const calls:Array<[string,unknown[]]>=[];
 const store={async call(name:string,args:unknown[]){calls.push([name,args]);if(name==='enqueue')return 'queued';if(name==='acquire')return {status:'admitted',fence:7};return true;}};
 const response=await runWithProviderAdmission({contents:'x'},5000,async()=>new Response(streamOf([body])),{store,log:()=>{},stream:true});
 assert.deepEqual(calls.map(c=>c[0]),['enqueue','acquire'],'not settled at headers');
 const deltas:string[]=[];await readGenerationStream(response.body!,t=>deltas.push(t));
 assert.deepEqual(calls.map(c=>c[0]),['enqueue','acquire','settle']);
 assert.deepEqual(calls[2][1].slice(1),[7,200,77]);
 calls.length=0;
 const cancelled=await runWithProviderAdmission({contents:'x'},5000,async()=>new Response(streamOf([body])),{store,log:()=>{},stream:true});
 await cancelled.body!.cancel('client gone');
 assert.equal(calls.some(c=>c[0]==='settle'),false,'uncertain stream keeps its reservation');
 delete process.env.PROVIDER_ADMISSION_MODE;
}

// 4. HTTP route: SSE framing, JSON before the first token, error event after it; disabled by default.
class FakeRes extends EventEmitter{status=0;headers:Record<string,string>={};chunks:string[]=[];headersSent=false;writableEnded=false;
 setHeader(k:string,v:string){this.headers[k.toLowerCase()]=v;}
 writeHead(status:number,headers:Record<string,string>={}){this.status=status;this.headersSent=true;for(const [k,v] of Object.entries(headers))this.headers[k.toLowerCase()]=v;return this;}
 write(chunk:string){this.chunks.push(chunk);return true;}
 end(chunk?:string){if(chunk)this.chunks.push(chunk);this.writableEnded=true;this.emit('finish');}
 get text(){return this.chunks.join('');}}
const req={headers:{authorization:'Bearer offline'}} as any;
const allow=async()=>({}) as any;
{
 const res=new FakeRes();let seen:any;
 await handleGenerationStream(req,res as any,{classId:'c',lessonId:'l',requestId:'r',prompt:'p'},async(auth,payload,queueOnly,onDelta)=>{seen={auth,payload,queueOnly};onDelta('Hel');onDelta('');onDelta('lo');return {output:'Hello',saved:{attempt:{id:'a1'}}};},allow);
 assert.equal(res.status,200);assert.match(res.headers['content-type'],/text\/event-stream/);
 assert.equal(seen.auth,'Bearer offline');assert.equal(seen.queueOnly,false);assert.equal(seen.payload.prompt,'p');
 const events=res.text.split('\n\n').filter(Boolean).map(block=>({event:/event: (\w+)/.exec(block)?.[1],data:JSON.parse(/data: (.*)/.exec(block)![1])}));
 assert.deepEqual(events,[{event:'delta',data:{text:'Hel'}},{event:'delta',data:{text:'lo'}},{event:'done',data:{output:'Hello',saved:{attempt:{id:'a1'}}}}]);
 assert.equal(res.writableEnded,true);
}
{
 const res=new FakeRes();
 await handleGenerationStream(req,res as any,{},async()=>{throw Object.assign(new ApiAccessError('Session limit',429),{code:'session_token_cap'});},allow);
 assert.equal(res.status,429);assert.deepEqual(JSON.parse(res.text),{error:'Session limit',code:'session_token_cap'},'pre-token errors keep their HTTP status');
}
{
 const res=new FakeRes();
 await handleGenerationStream(req,res as any,{},async()=>({output:'replayed'}),allow);
 assert.equal(res.status,200);assert.deepEqual(JSON.parse(res.text),{output:'replayed'},'a completed replay with no tokens is plain JSON');
}
{
 const res=new FakeRes();
 await handleGenerationStream(req,res as any,{},async(_a,_b,_c,onDelta)=>{onDelta('part');throw new AiServerError('AI output was blocked or incomplete',502);},allow);
 assert.equal(res.status,200);assert.match(res.text,/event: error\ndata: \{"status":502,"error":"AI output was blocked or incomplete"\}/);
}
{
 const res=new FakeRes();
 await handleGenerationStream(req,res as any,{},async()=>({}),async()=>{throw new ApiAccessError('Not enrolled',403);});
 assert.equal(res.status,403);
}
{
 // A client disconnect never cancels the server-side Run; later writes are dropped safely.
 const res=new FakeRes();let finished=false;
 await handleGenerationStream(req,res as any,{},async(_a,_b,_c,onDelta)=>{onDelta('a');res.emit('close');onDelta('b');finished=true;return {output:'ab'};},allow);
 assert.equal(finished,true);assert.equal(res.text.includes('"b"'),false);
}
assert.equal(generationStreamEnabled(),false,'off unless GENERATION_STREAM=true');
const routeRes=new FakeRes();
const routeReq=Object.assign((async function*(){})(),{url:'/api/stream',method:'POST',headers:{}});
await cloudHandler(routeReq as any,routeRes as any);
assert.equal(routeRes.status,404,'route is hidden while the flag is off');
process.env.GENERATION_STREAM='true';process.env.GENERATION_MODE='async';
assert.equal(generationStreamEnabled(),false,'asynchronous generation keeps streaming off');
delete process.env.GENERATION_MODE;assert.equal(generationStreamEnabled(),true);
const getRes=new FakeRes();
await cloudHandler(Object.assign((async function*(){})(),{url:'/api/stream',method:'GET',headers:{}}) as any,getRes as any);
assert.equal(getRes.status,405);
delete process.env.GENERATION_STREAM;
console.log('verify_generation_stream: PASS');
