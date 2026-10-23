import fs from 'node:fs';
import {parseEnv} from 'node:util';
// Actual HTTP handlers + Firebase Auth Emulator + PostgreSQL engine, synthetic data only.
if(!process.argv.includes('--local-only'))throw Error('Pass --local-only for disposable synthetic data.');
for(const key of Object.keys(process.env))if(/SUPABASE|GOOGLE|GCP_|DATABASE|^PG|FIREBASE|GEMINI|OPENAI|VERTEX|^VITE_/.test(key))delete process.env[key];
Object.assign(process.env,{NODE_ENV:'test',GOOGLE_CLOUD_PROJECT:'demo-intrepid',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',DATABASE_URL:'local-embedded-only',AI_PROVIDER:'gemini',GCP_ANALYTICS_MODE:'postgres',GCP_VECTOR_MODE:'pgvector',VITE_FIREBASE_API_KEY:'demo-key',VITE_FIREBASE_PROJECT_ID:'demo-intrepid',VITE_FIREBASE_AUTH_DOMAIN:'demo-intrepid.firebaseapp.com',VITE_FIREBASE_APP_ID:'demo-app',VITE_FIREBASE_AUTH_EMULATOR:'http://127.0.0.1:9099',VITE_FIRESTORE_EMULATOR:'127.0.0.1:8085',VITE_REBUILD_PRODUCTION:'true'});
if(process.argv.includes('--existing-ai-key')){
 const source=parseEnv(fs.readFileSync('../../.env.rebuild.local','utf8'));
 if(!source.GEMINI_API_KEY)throw Error('Existing AI key unavailable');
 process.env.GEMINI_API_KEY=source.GEMINI_API_KEY;process.env.GEMINI_MODEL=source.GEMINI_MODEL;
}
fs.mkdirSync('outputs/backend-review',{recursive:true});
fs.copyFileSync('tests/fixtures/local-feedback-login.html','outputs/backend-review/login.html');
const {PGlite}=await import('@electric-sql/pglite');
const db=new PGlite();
for(const name of ['001_baseline.sql','002_projection_outbox.sql','005_department_correction_auto_approval.sql','006_mentor_feedback.sql','006_studio_class_scope.sql','008_scoped_progress_rls.sql','009_projection_and_indexing_recovery.sql','010_structured_badge_rules.sql'])await db.exec(fs.readFileSync('gcp/sql/'+name,'utf8'));
const {configureSqlPoolForTests}=await import('../src/services/cloudPostgresService');
let tail=Promise.resolve();configureSqlPoolForTests({async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r});await prior;return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
for(const [n,role] of [[1,'learner'],[3,'admin'],[4,'instructor'],[5,'head']] as const)await db.query('INSERT INTO users(id,email,full_name,role) VALUES($1,$2,$3,$4)',[id(n),role+'@example.test','Local '+role,role]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(21),id(1)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Synthetic Local Client','Testing')",[id(30)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Local feedback review','published')",[id(31)]);
for(const n of [40,41])await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,$2,$3,$4,$5,now()-interval '1 day',now()+interval '7 days')",[id(n),'LOCAL-ONLY-'+n,id(31),id(30),n===40?'Testing':'Functions']);
await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[id(21),id(40)]);
await db.query("INSERT INTO course_instructors(course_id,user_id,permission) VALUES($1,$2,'editor')",[id(31),id(4)]);
await db.query("INSERT INTO product_class_grants(user_id,class_id,permission) VALUES($1,$2,'head')",[id(5),id(40)]);
await db.query("INSERT INTO course_modules(id,course_id,title,position,status) VALUES($1,$2,'Local module',1,'published')",[id(50),id(31)]);
for(const n of [60,61])await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status,position,sample_input_context) VALUES($1,$2,$3,'Synthetic ticket classification','published',$4,'Ticket 42: delivery status question. Training fixture; no personal information.')",[id(n),id(50),'LOCAL-LAB-'+n,n-59]);
const {default:handler}=await import('../api/product');
const {createServer}=await import('vite');const {default:react}=await import('@vitejs/plugin-react');
const server=await createServer({configFile:false,envDir:false,root:process.cwd(),plugins:[react(),{name:'local-real-api',transformIndexHtml(html){return html.replace(/(<body[^>]*>)/,'$1<div style="background:#fff3bf;padding:12px;text-align:center">LOCAL BACKEND · Firebase emulator + PostgreSQL · SYNTHETIC DATA</div>');},configureServer(vite){vite.middlewares.use(async(req,res,next)=>{if(req.url?.split('?')[0]!=='/api/product')return next();let body='';for await(const chunk of req){body+=chunk;if(body.length>3000000){res.statusCode=413;res.end();return;}}const reply:any={setHeader:(k:string,v:string)=>res.setHeader(k,v),status:(code:number)=>{res.statusCode=code;return reply},json:(data:unknown)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}};await handler({method:req.method,headers:req.headers,body},reply);});}}],server:{host:'127.0.0.1',port:5195,strictPort:true}});
await server.listen();console.log('http://127.0.0.1:5195 — learner/admin/instructor/head@example.test; no production database.');

