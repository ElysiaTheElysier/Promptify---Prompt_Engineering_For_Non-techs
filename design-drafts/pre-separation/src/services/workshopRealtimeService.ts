import {supabase} from './supabaseClient';
export type MessageConnection='connecting'|'live'|'fallback';
// An event invalidates the view; authoritative scoped reads supply the displayed data.
export function subscribeWorkshopMessages(classId:string,table:'workshop_messages'|'trainer_hints',onChange:()=>void,onStatus:(status:MessageConnection)=>void){
 let active=true;
 onStatus('connecting');
 const channel=supabase.channel(`workshop:${table}:${classId}:${crypto.randomUUID()}`)
 .on('postgres_changes',{event:'INSERT',schema:'public',table,filter:`class_id=eq.${classId}`},()=>{if(active)onChange()})
 .subscribe(status=>{if(!active)return;if(status==='SUBSCRIBED'){onStatus('live');onChange()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')onStatus('fallback')});
 return()=>{active=false;void supabase.removeChannel(channel)};
}
