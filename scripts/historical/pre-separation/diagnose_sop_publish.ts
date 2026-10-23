// Replays only the isolated QA contribution and logs the database error, never credentials/content.
import fs from 'node:fs';import {loadEnv} from 'vite';import {createClient} from '@supabase/supabase-js';
const env=loadEnv('rebuild',process.cwd(),'');const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL;if(new URL(url).hostname!=='aixhryqzgpptuhstiflx.supabase.co')throw new Error('Wrong project');
const qa=JSON.parse(fs.readFileSync('outputs/rebuild-audit/qa-identities.local.json','utf8'));
const admin=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),reader=createClient(url,env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
await reader.auth.signInWithPassword({email:qa.accounts.trainer.email,password:qa.password});
const {data}=await admin.from('product_sop_contributions').select('id,indexed_chunks').eq('actor_id',qa.accounts['learner-a'].id).eq('request_id',qa.sopRequest).single();
const result=await reader.rpc('product_publish_contribution',{p_contribution:data!.id,p_chunks:data!.indexed_chunks});console.log(JSON.stringify({error:result.error,success:!!result.data}));
