import assert from 'node:assert/strict';
import handler from '../api/product';
function response(){return {code:0,headers:{} as Record<string,string>,body:undefined as any,setHeader(key:string,value:string){this.headers[key]=value;},status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}};}
for(const [request,expected] of [[{method:'GET',headers:{}},405],[{method:'POST',headers:{},body:'{'},400],[{method:'POST',headers:{},body:{action:'snapshot'}},401],[{method:'POST',headers:{},body:{value:'x'.repeat(3000001)}},413]] as const){const res=response();await handler(request,res);assert.equal(res.code,expected);assert.equal(res.headers['Cache-Control'],'no-store');}
console.log('Product HTTP checks passed: method, invalid JSON, anonymous access and size limit. No provider calls.');

for(const action of ['prepareSopUpload','sourceDownload','sandboxJudge','saveStudio','syncSheet']){const res=response();await handler({method:'POST',headers:{},body:{action}},res);assert.equal(res.code,401);}
console.log('Private file and authoring actions reject anonymous access.');
