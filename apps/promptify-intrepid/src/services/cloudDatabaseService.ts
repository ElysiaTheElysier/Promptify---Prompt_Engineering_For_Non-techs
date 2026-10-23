import schema from './cloudSchema.json';
import {sqlTransaction,type VerifiedActor} from './cloudPostgresService';
import {verifyFirebaseIdentity} from './firebaseServerIdentityService';
import {cloudStorage} from './cloudStorageService';
type DbResult={data:any;error:any;count?:number};
type Meta={tables:Record<string,Record<string,string>>;relations:Array<{child:string;parent:string;columns:string[];references:string[];navigation?:boolean}>;rpcs:Record<string,{args:Array<{name:string;type:string}>;many:boolean}>};
const meta=schema as Meta;
const identifier=(s:string)=>{if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))throw Error('Invalid SQL identifier');return '"'+s+'"';};
function splitFields(s:string){const parts:string[]=[];let start=0,depth=0;for(let i=0;i<s.length;i++){if(s[i]==='(')depth++;if(s[i]===')')depth--;if(s[i]===','&&depth===0){parts.push(s.slice(start,i).trim());start=i+1;}}if(depth!==0)throw Error('Invalid selection');parts.push(s.slice(start).trim());return parts;}
function field(table:string,column:string,alias='t'){
 const [name,key]=column.split('->');if(!meta.tables[table]?.[name])throw Error('Unknown column '+table+'.'+name);
 return `${alias}.${identifier(name)}`+(key?` -> '${identifier(key).slice(1,-1)}'`:'');
}
function project(table:string,selection:string,alias='t',depth=0):string{
 if(depth>4)throw Error('Selection too deep');
 return splitFields(selection).map(token=>{
  if(token==='*')return alias+'.*';
  const embedded=token.match(/^(?:(\w+):)?(\w+)\((.*)\)$/s);
  if(embedded){const [,label,target,inside]=embedded;if(!meta.tables[target])throw Error('Unknown relation');
   const forwards=meta.relations.filter(r=>r.navigation!==false&&r.child===table&&r.parent===target),backwards=meta.relations.filter(r=>r.navigation!==false&&r.parent===table&&r.child===target);
   const options=forwards.length?forwards:backwards;if(options.length!==1)throw Error('Ambiguous relation '+table+' -> '+target);
   const r=options[0],childAlias='n'+depth,forward=forwards.length>0;
   const conditions=(forward?r.references:r.columns).map((col,i)=>`${childAlias}.${identifier(col)}=${alias}.${identifier((forward?r.columns:r.references)[i])}`).join(' AND ');
   const sub=`SELECT ${project(target,inside,childAlias,depth+1)} FROM public.${identifier(target)} ${childAlias} WHERE ${conditions}`;
   return forward?`(SELECT row_to_json(x) FROM (${sub}) x) AS ${identifier(label||target)}`:`(SELECT coalesce(json_agg(x),'[]'::json) FROM (${sub}) x) AS ${identifier(label||target)}`;
  }
  const [label,column]=token.includes(':')?token.split(':'):[undefined,token];return field(table,column,alias)+(label?' AS '+identifier(label):'');
 }).join(',');
}
export class CloudQuery implements PromiseLike<DbResult>{
 private filters:Array<{column:string;op:string;value:any}>=[];private either:Array<{column:string;value:string}>=[];private sort:Array<{column:string;ascending:boolean}>=[];
 private mode='select';private selection='*';private payload:any;private conflict='';private take:number|undefined;private offset=0;private cardinality:'many'|'single'|'maybe'='many';private returning=false;
 constructor(private table:string,private actor:()=>Promise<VerifiedActor|undefined>){if(!meta.tables[table])throw Error('Unknown database table');}
 select(columns='*',_options?:unknown){this.selection=columns;this.returning=true;return this;}
 eq(column:string,value:any){this.filters.push({column,op:'=',value});return this;}
 neq(column:string,value:any){this.filters.push({column,op:'<>',value});return this;}
 in(column:string,value:any[]){this.filters.push({column,op:'IN',value});return this;}
 is(column:string,value:any){if(value!==null)throw Error('Only IS NULL supported');this.filters.push({column,op:'IS NULL',value});return this;}
 not(column:string,operator:string,value:any){if(operator!=='is'||value!==null)throw Error('Unsupported NOT filter');this.filters.push({column,op:'IS NOT NULL',value});return this;}
 gte(column:string,value:any){this.filters.push({column,op:'>=',value});return this;}
 lte(column:string,value:any){this.filters.push({column,op:'<=',value});return this;}
 gt(column:string,value:any){this.filters.push({column,op:'>',value});return this;}
 lt(column:string,value:any){this.filters.push({column,op:'<',value});return this;}
 or(expression:string){this.either=expression.split(',').map(part=>{const m=part.match(/^(\w+)\.eq\.(.+)$/);if(!m)throw Error('Unsupported OR filter');return {column:m[1],value:m[2]};});return this;}
 order(column:string,options:{ascending?:boolean}={}){this.sort.push({column,ascending:options.ascending!==false});return this;}
 limit(n:number){if(!Number.isInteger(n)||n<0||n>10000)throw Error('Invalid limit');this.take=n;return this;}
 range(from:number,to:number){if(!Number.isInteger(from)||from<0||to<from)throw Error('Invalid range');this.offset=from;return this.limit(to-from+1);}
 single(){this.cardinality='single';return this;}
 maybeSingle(){this.cardinality='maybe';return this;}
 insert(value:any){this.mode='insert';this.payload=value;return this;}
 update(value:any){this.mode='update';this.payload=value;return this;}
 upsert(value:any,options:{onConflict?:string}={}){this.mode='insert';this.payload=value;this.conflict=options.onConflict||'id';return this;}
 delete(){this.mode='delete';return this;}
 compile(){
  const values:any[]=[];const bind=(value:any)=>{values.push(value);return '$'+values.length;};
  const typed=(column:string,value:any)=>{field(this.table,column);return meta.tables[this.table][column]==='jsonb'&&value!==null?JSON.stringify(value):value;};
  const conditions=this.filters.map(f=>{const col=field(this.table,f.column);if(f.op.startsWith('IS'))return col+' '+f.op;if(f.op==='IN'){if(!Array.isArray(f.value))throw Error('Invalid IN filter');return f.value.length?`${col} IN (${f.value.map(bind).join(',')})`:'false';}return col+' '+f.op+' '+bind(f.value);});
  if(this.either.length)conditions.push('('+this.either.map(f=>field(this.table,f.column)+'='+bind(f.value)).join(' OR ')+')');
  const where=conditions.length?' WHERE '+conditions.join(' AND '):'';const table='public.'+identifier(this.table);let sql:string;
  if(this.mode==='select'){sql=`SELECT ${project(this.table,this.selection)} FROM ${table} t${where}`;}
  else {
   if(['update','delete'].includes(this.mode)&&!conditions.length)throw Error('Unscoped mutation rejected');
   if(this.mode==='delete')sql=`DELETE FROM ${table} t${where}`;
   else if(this.mode==='update'){const keys=Object.keys(this.payload);if(!keys.length)throw Error('Empty update');sql=`UPDATE ${table} t SET ${keys.map(k=>identifier(k)+'='+bind(typed(k,this.payload[k]))).join(',')}${where}`;}
   else {const rows=Array.isArray(this.payload)?this.payload:[this.payload];if(!rows.length)throw Error('Empty insert');const keys=Object.keys(rows[0]);if(!keys.length)throw Error('Empty insert');if(rows.some(row=>Object.keys(row).sort().join(',')!==[...keys].sort().join(',')))throw Error('Insert row keys differ');
    sql=`INSERT INTO ${table} (${keys.map(k=>{field(this.table,k);return identifier(k);}).join(',')}) VALUES ${rows.map(row=>'('+keys.map(k=>bind(typed(k,row[k]))).join(',')+')').join(',')}`;
    if(this.conflict){const cols=this.conflict.split(',');cols.forEach(k=>field(this.table,k));const changed=keys.filter(k=>!cols.includes(k));sql+=` ON CONFLICT (${cols.map(identifier).join(',')}) `+(changed.length?'DO UPDATE SET '+changed.map(k=>`${identifier(k)}=EXCLUDED.${identifier(k)}`).join(','):'DO NOTHING');}
   }
   if(this.returning)sql=`WITH changed AS (${sql} RETURNING *) SELECT ${project(this.table,this.selection)} FROM changed t`;
  }
  if(this.mode==='select'){if(this.sort.length)sql+=' ORDER BY '+this.sort.map(s=>field(this.table,s.column)+' '+(s.ascending?'ASC':'DESC')).join(',');if(this.take!==undefined)sql+=' LIMIT '+bind(this.take);if(this.offset)sql+=' OFFSET '+bind(this.offset);}
  return {sql,values};
 }
 async execute():Promise<DbResult>{try{const {sql,values}=this.compile();const rows=await sqlTransaction(await this.actor(),async db=>(await db.query(sql,values)).rows);
  if(this.cardinality!=='many'){if(rows.length>1||this.cardinality==='single'&&rows.length!==1)return {data:null,error:{code:'PGRST116',message:'Expected one row'}};return {data:rows[0]||null,error:null};}
  return {data:this.mode==='select'||this.returning?rows:null,error:null};
 }catch(e){return {data:null,error:{code:(e as any).code||'GCP_DB_ERROR',message:(e as Error).message}};}}
 then<TResult1=DbResult,TResult2=never>(onfulfilled?:((value:DbResult)=>TResult1|PromiseLike<TResult1>)|null,onrejected?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null):PromiseLike<TResult1|TResult2>{return this.execute().then(onfulfilled,onrejected);}
}
export function createDatabaseClient(authorization?:string){
 let verified:Promise<VerifiedActor>|undefined;
 const resolve=()=>{if(!authorization)return Promise.resolve(undefined);verified??=verifyFirebaseIdentity(authorization.replace(/^Bearer\s+/i,''));return verified;};
 return {
  from:(table:string)=>new CloudQuery(table,resolve),storage:cloudStorage,
  auth:{async getUser(token:string){try{verified??=verifyFirebaseIdentity(token);const a=await verified;return {data:{user:{id:a.subject,email:a.email,email_confirmed_at:true,app_metadata:{providers:['google']},firebaseUid:a.firebaseUid}},error:null};}catch(error){if(process.env.PROMPTIFY_LOCAL_TIMING==='true'){const code=(error as any)?.code||(error as any)?.errorInfo?.code;console.warn(JSON.stringify({event:'identity-verification-failed',code:typeof code==='string'&&/^[a-z0-9/_-]{1,80}$/i.test(code)?code:'unclassified'}));}return {data:{user:null},error};}}},
  async rpc(name:string,args:Record<string,any>={}):Promise<DbResult>{try{
   const contract=meta.rpcs[name];if(!contract)throw Error('RPC not allowed');const keys=Object.keys(args);if(keys.some(k=>!contract.args.some(a=>a.name===k)))throw Error('Unknown RPC argument');
   const values=keys.map(k=>{const arg=contract.args.find(a=>a.name===k)!;return arg.type==='jsonb'&&args[k]!==null?JSON.stringify(args[k]):args[k];});
   const call='public.'+identifier(name)+'('+keys.map((k,i)=>identifier(k)+' => $'+(i+1)).join(',')+')';
   const data=await sqlTransaction(await resolve(),async db=>{const rows=(await db.query(contract.many?'SELECT * FROM '+call:'SELECT '+call+' AS data',values)).rows;return contract.many?rows:rows[0]?.data;});return {data,error:null};
  }catch(e){return {data:null,error:{code:(e as any).code||'GCP_DB_ERROR',message:(e as Error).message}};}}
 };
}
export type CloudDatabaseClient=ReturnType<typeof createDatabaseClient>;
export function requireCloudDatabase(){if(!process.env.DATABASE_URL&&!process.env.PGHOST)throw Error('Cloud SQL server configuration is missing');}
