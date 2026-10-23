import {BigQuery} from '@google-cloud/bigquery';
export const bigquery=new BigQuery();
export function dataset(name:'raw'|'analytics'|'knowledge'){
 const project=process.env.GOOGLE_CLOUD_PROJECT,value=process.env['BQ_'+name.toUpperCase()+'_DATASET']||'intrepid_'+name;
 if(!project||!/^[a-z][a-z0-9-]+$/.test(project)||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))throw Error('BigQuery dataset is not configured');
 return project+'.'+value;
}
let testQuery:((query:string,params:Record<string,any>)=>Promise<any[]>)|undefined;
export function configureWarehouseQueryForTests(fn:(query:string,params:Record<string,any>)=>Promise<any[]>){if(process.env.NODE_ENV!=='test')throw Error('Warehouse test injection requires NODE_ENV=test');testQuery=fn;}
export async function queryWarehouse<T=any>(query:string,params:Record<string,any>,types?:Record<string,any>):Promise<T[]>{if(testQuery)return testQuery(query,params) as Promise<T[]>;const [rows]=await bigquery.query({query,params,types,location:process.env.BQ_LOCATION||'asia-southeast1',maximumBytesBilled:process.env.BQ_MAX_BYTES||'1000000000'});return rows as T[];}
export async function mergeWarehouseEntity(row:{source_table:string;entity_id:string;entity_json:string|null;source_version:number;is_deleted:boolean}){
 await queryWarehouse(`MERGE \`${dataset('raw')}.operational_entities\` t USING (SELECT @table AS source_table,@id AS entity_id,@json AS entity_json,@version AS source_version,@deleted AS is_deleted) s ON t.source_table=s.source_table AND t.entity_id=s.entity_id
 WHEN MATCHED AND s.source_version>=t.source_version THEN UPDATE SET entity_json=s.entity_json,source_version=s.source_version,is_deleted=s.is_deleted,loaded_at=CURRENT_TIMESTAMP()
 WHEN NOT MATCHED THEN INSERT(source_table,entity_id,entity_json,source_version,is_deleted,loaded_at) VALUES(s.source_table,s.entity_id,s.entity_json,s.source_version,s.is_deleted,CURRENT_TIMESTAMP())`,{table:row.source_table,id:row.entity_id,json:row.entity_json,version:row.source_version,deleted:row.is_deleted},{json:'STRING'});
}
export async function syncWarehouseVectors(versionId:string,rows:Array<{position:number;page:number|null;content:string;embedding:number[];class_id:string;document_id:string;version:number;title:string}>,sourceVersion:number){
 // Delete tombstone prevents an older replay from restoring a revoked version.
 const state=`${dataset('knowledge')}.version_state`,chunks=`${dataset('knowledge')}.sop_chunks`;
 await queryWarehouse(`BEGIN TRANSACTION;
 MERGE \`${state}\` t USING(SELECT @version_id AS version_id,@revision AS source_version) s ON t.version_id=s.version_id WHEN MATCHED AND s.source_version>=t.source_version THEN UPDATE SET source_version=s.source_version WHEN NOT MATCHED THEN INSERT(version_id,source_version) VALUES(s.version_id,s.source_version);
 IF (SELECT source_version FROM \`${state}\` WHERE version_id=@version_id)=@revision THEN
 DELETE FROM \`${chunks}\` WHERE version_id=@version_id;
 INSERT INTO \`${chunks}\`(version_id,chunk_position,page,content,embedding,class_id,document_id,document_version,title,model_id,embedding_dimensions,indexed_at)
 SELECT @version_id,CAST(JSON_VALUE(x,'$.position') AS INT64),CAST(JSON_VALUE(x,'$.page') AS INT64),JSON_VALUE(x,'$.content'),ARRAY(SELECT CAST(v AS FLOAT64) FROM UNNEST(JSON_VALUE_ARRAY(x,'$.embedding')) v),JSON_VALUE(x,'$.class_id'),JSON_VALUE(x,'$.document_id'),CAST(JSON_VALUE(x,'$.version') AS INT64),JSON_VALUE(x,'$.title'),@model,768,CURRENT_TIMESTAMP() FROM UNNEST(JSON_QUERY_ARRAY(@rows)) x;
 END IF;
 COMMIT TRANSACTION;`,{version_id:versionId,revision:sourceVersion,rows:JSON.stringify(rows),model:process.env.EMBEDDING_MODEL||'gemini-embedding-001'});
}
export async function searchWarehouseSop(versionIds:string[],embedding:number[]){if(!versionIds.length)return [];
 return queryWarehouse(`SELECT base.version_id,base.chunk_position AS position,base.page,base.content,base.title,base.document_version AS version,1-distance AS similarity FROM VECTOR_SEARCH((SELECT * FROM \`${dataset('knowledge')}.sop_chunks\` WHERE version_id IN UNNEST(@versions) AND model_id=@model AND embedding_dimensions=768),'embedding',(SELECT @embedding AS embedding),query_column_to_search=>'embedding',top_k=>10,distance_type=>'COSINE')`,{versions:versionIds,embedding,model:process.env.EMBEDDING_MODEL||'gemini-embedding-001'},{versions:['STRING'],embedding:['FLOAT64']});
}
