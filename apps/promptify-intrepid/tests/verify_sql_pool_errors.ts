import assert from 'node:assert/strict';
import {closeSqlPool,configureSqlPoolForTests,getSqlPool,sqlTransaction} from '../src/services/cloudPostgresService';

// I02: an idle pg client error must be logged (code only) instead of crashing the process. No DB connection is opened.
const saved={PGHOST:process.env.PGHOST,NODE_ENV:process.env.NODE_ENV};
process.env.PGHOST='127.0.0.1';
const logged:string[]=[];const originalError=console.error;console.error=(line:string)=>{logged.push(line);};
try{
 const pool=getSqlPool() as any;
 assert.ok(pool.listenerCount('error')>=1,'pool has an error listener');
 pool.emit('error',Object.assign(new Error('Connection terminated unexpectedly password=secret'),{code:'57P01'}));
 assert.deepEqual(logged.map(line=>JSON.parse(line)),[{event:'sql_pool_idle_error',code:'57P01'}]);
 assert.ok(!logged.join().includes('secret'),'message is not logged');
 // LIVE 04–06/11: Cloud SQL terminated a checked-out client; with no client listener Node crashed the instance.
 const {EventEmitter}=await import('node:events');
 const checkedOut=new EventEmitter();
 pool.emit('connect',checkedOut);
 assert.doesNotThrow(()=>checkedOut.emit('error',Object.assign(new Error('Connection terminated unexpectedly password=secret'),{code:'57P01'})),'checked-out client error must not crash');
 assert.deepEqual(JSON.parse(logged[1]),{event:'sql_client_error',code:'57P01'});
 assert.ok(!logged.join().includes('secret'),'message is not logged');
}finally{console.error=originalError;}
await closeSqlPool();

// A client whose ROLLBACK fails is destroyed, not returned to the pool; a healthy rollback keeps it.
process.env.NODE_ENV='test';
const releases:unknown[]=[];
const fakeClient=(rollbackFails:boolean)=>({async query(text:string){if(text==='ROLLBACK'&&rollbackFails)throw Error('connection lost');return {rows:[]};},release(destroy?:boolean){releases.push(destroy);}});
let rollbackFails=true;
configureSqlPoolForTests({async connect(){return fakeClient(rollbackFails);}});
await assert.rejects(sqlTransaction(undefined,async()=>{throw Error('work failed');}),/work failed/);
rollbackFails=false;
await assert.rejects(sqlTransaction(undefined,async()=>{throw Error('work failed');}),/work failed/);
assert.equal(await sqlTransaction(undefined,async()=>'ok'),'ok');
assert.deepEqual(releases,[true,false,false]);

process.env.PGHOST=saved.PGHOST;process.env.NODE_ENV=saved.NODE_ENV;
if(saved.PGHOST===undefined)delete process.env.PGHOST;if(saved.NODE_ENV===undefined)delete process.env.NODE_ENV;
console.log('verify_sql_pool_errors: PASS');
