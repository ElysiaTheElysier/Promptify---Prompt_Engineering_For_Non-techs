import {supabase} from './supabaseClient';
export interface SopVersion {document_id:string;title:string;version_id:string;version:number;content:string;created_at:string;citation:string}
export async function classSops(classId:string,lessonId?:string):Promise<SopVersion[]>{
 const {data,error}=await supabase.rpc('rebuild_class_sops',{p_class:classId,p_lesson:lessonId||null});if(error)throw error;return data||[];
}
export async function sopLessonOptions(classId:string):Promise<{id:string;title:string}[]>{
 const {data,error}=await supabase.rpc('rebuild_sop_lesson_options',{p_class:classId});if(error)throw error;return data||[];
}
export async function publishSop(classId:string,documentId:string|null,title:string,content:string,lessonId:string|null){
 const {data,error}=await supabase.rpc('rebuild_publish_sop',{p_class:classId,p_document:documentId,p_title:title,p_content:content,p_lesson:lessonId});if(error)throw error;return data as string;
}
