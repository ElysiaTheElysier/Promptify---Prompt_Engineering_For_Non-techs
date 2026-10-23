import assert from 'node:assert/strict';
import pg from 'pg';
const id=n=>`eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12,'0')}`;
const config={state:'ACTIVE',pillar:'',branch:'',competencies:'',startTime:'',endTime:'',departments:[],objectives:[],variables:[],scaffold:[],materials:[],awards:{},rubric:['groundedness','persona','format','oneshot','actionability'].map(key=>({key,label:key,description:'',weight:20,active:true}))};
/** Actual concurrent native transactions; called only by the guarded local harness. */
export async function runNativeConcurrency(connection,fixtureSql){
 if(connection.host!=='127.0.0.1'||(connection.port!==55432&&connection.port!==55433)||!/^intrepid_synthetic_\d+_\d+$/.test(connection.database))throw Error('Concurrency fixtures require fresh synthetic loopback DB');
 const clients=[new pg.Client(connection),new pg.Client(connection),new pg.Client(connection)];
 const [a,b,observer]=clients;
 try{
  await Promise.all(clients.map(c=>c.connect()));
  // The pgTAP suite rolled back; reuse only its synthetic seed before any tests.
  await observer.query(fixtureSql.slice(0,fixtureSql.indexOf('SET LOCAL ROLE authenticated;'))+'COMMIT;');
  async function save(client,title){
   try{await client.query('BEGIN');await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[id(101)]);
    const result=await client.query('SELECT product_save_studio($1,$2,0,$3,$4) AS saved',[id(30),id(50),config,{title}]);
    await client.query('COMMIT');return {revision:result.rows[0].saved.revision};
   }catch(error){await client.query('ROLLBACK');return {code:error.code,message:error.message};}
  }
  const saves=await Promise.all([save(a,'Concurrent edit A'),save(b,'Concurrent edit B')]);
  assert.equal(saves.filter(r=>r.revision===1).length,1,'Exactly one first save succeeds');
  assert.equal(saves.filter(r=>r.code==='P0001'&&r.message==='Revision conflict').length,1,'Concurrent stale edit is rejected');
  assert.equal((await observer.query('SELECT title FROM lessons WHERE id=$1',[id(50)])).rows[0].title,'Course template');
  await observer.query('INSERT INTO rebuild_sop_documents(id,class_id,title,created_by) VALUES($1,$2,$3,$4)',[id(60),id(30),'Concurrent SOP',id(1)]);
  await observer.query('INSERT INTO rebuild_sop_versions(id,document_id,version,content,created_by) VALUES($1,$2,1,$3,$4)',[id(70),id(60),'Synthetic SOP evidence',id(1)]);
  await a.query('BEGIN');await a.query('UPDATE classes SET course_id=$1 WHERE id=$2',[id(21),id(30)]);
  await b.query('BEGIN');const backend=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const binding=b.query('INSERT INTO rebuild_sop_bindings(class_id,lesson_id,document_id,version_id) VALUES($1,$2,$3,$4)',[id(30),id(50),id(60),id(70)]).then(()=>({code:null}),error=>({code:error.code,message:error.message}));
  let blocked=false;
  for(let retry=0;retry<40;retry++){
   const row=(await observer.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[backend])).rows[0];
   if(row?.wait_event_type==='Lock'){blocked=true;break;}
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.equal(blocked,true,'Binding waits on concurrent parent scope update');
  await a.query('COMMIT');const outcome=await binding;
  assert.equal(outcome.code,'23514','Binding rechecks committed parent scope rather than stale state');
  await b.query('ROLLBACK');
  assert.equal((await observer.query('SELECT count(*)::integer AS n FROM rebuild_sop_bindings')).rows[0].n,0);
  await observer.query('UPDATE classes SET course_id=$1 WHERE id=$2',[id(20),id(30)]);
  return {status:'PASS',checks:6,cases:['Concurrent first Studio save','SOP binding versus concurrent parent scope move']};
 }finally{
  await Promise.all(clients.map(async c=>{await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{});}));
 }
}
