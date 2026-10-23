import assert from 'node:assert/strict';
import handler from '../api/product';
function response(){return {code:0,headers:{} as Record<string,string>,body:undefined as any,setHeader(key:string,value:string){this.headers[key]=value;},status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}};}
for(const [request,expected] of [[{method:'GET',headers:{}},405],[{method:'POST',headers:{},body:'{'},400],[{method:'POST',headers:{},body:{action:'snapshot'}},401],[{method:'POST',headers:{},body:{value:'x'.repeat(3000001)}},413]] as const){const res=response();await handler(request,res);assert.equal(res.code,expected);assert.equal(res.headers['Cache-Control'],'no-store');}
console.log('Product HTTP checks passed: method, invalid JSON, anonymous access and size limit. No provider calls.');

for(const action of ['prepareSopUpload','sourceDownload','sandboxJudge','saveStudio','syncSheet']){const res=response();await handler({method:'POST',headers:{},body:{action}},res);assert.equal(res.code,401);}
console.log('Private file and authoring actions reject anonymous access.');

// A backend connection outage must not tell a freshly authenticated user to sign out.
const previousNodeEnv=process.env.NODE_ENV,previousPgHost=process.env.PGHOST;
process.env.NODE_ENV='test';process.env.PGHOST='offline.invalid';
const {configureFirebaseVerifierForTests}=await import('../src/services/firebaseServerIdentityService');
try {
 for(const [code,expected] of [['ECONNRESET',503],['auth/id-token-expired',401]] as const){
  configureFirebaseVerifierForTests(async()=>{throw Object.assign(new Error('offline fixture'),{code});});
  const res=response();await handler({method:'POST',headers:{authorization:'Bearer offline-only'},body:{action:'snapshot'}},res);
  assert.equal(res.code,expected);
 }
} finally {
 if(previousNodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousNodeEnv;
 if(previousPgHost===undefined)delete process.env.PGHOST;else process.env.PGHOST=previousPgHost;
}
console.log('Identity failure classification PASS: infrastructure outage 503; expired identity remains 401. No network calls.');
