import {supabase} from './supabaseClient';
export interface WorkshopMessage {id:string;message:string;created_at:string;read_at:string|null}
export const workshopMessagingService={
 async inbox(classId:string):Promise<WorkshopMessage[]>{
  const {data,error}=await supabase.rpc('rebuild_workshop_inbox',{p_class:classId});
  if(error)throw error;return data||[];
 },
 async broadcast(classId:string,requestId:string,message:string):Promise<string>{
  const {data,error}=await supabase.rpc('rebuild_broadcast',{p_class:classId,p_request:requestId,p_message:message.trim()});
  if(error)throw error;return data;
 },
 async acknowledge(messageId:string){
  const {error}=await supabase.rpc('rebuild_ack_workshop_message',{p_message:messageId});if(error)throw error;
 }
};
