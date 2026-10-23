import {sqlTransaction} from './cloudPostgresService';
/** Vertex is invoked by google_ml_integration inside Cloud SQL, not an HTTP call in the API. */
export async function embedThroughSql(text:string,timeout=40000):Promise<number[]>{
 if(process.env.EMBEDDING_MODEL!=='text-multilingual-embedding-002')throw Error('SQL embedding model must be text-multilingual-embedding-002');
 const result=await sqlTransaction(undefined,async db=>{await db.query("SELECT set_config('statement_timeout',$1,true)",[String(Math.max(1,timeout))]);return (await db.query('SELECT public.intrepid_embed_text($1) AS embedding',[text])).rows[0]?.embedding;});
 if(!Array.isArray(result)||result.length!==768||result.some(v=>typeof v!=='number'||!Number.isFinite(v))||!result.some(v=>v!==0))throw Error('Cloud SQL returned an invalid embedding');
 return result;
}
