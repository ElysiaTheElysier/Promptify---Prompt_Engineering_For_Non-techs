import {productRequest} from './productionClientService';
export function startLearningTelemetry(root:HTMLElement,classId:string,lessonId?:string){
 let queue:any[]=[],sending=false,lastActive=Date.now(),lastTick=Date.now();
 const flush=async()=>{if(sending||!queue.length)return;sending=true;const batch=queue.slice(0,20);try{await productRequest('uiEvents',{classId,events:batch});queue.splice(0,batch.length);}catch{/* Retry bounded metadata batches; learning never depends on telemetry. */}finally{sending=false;}};
 const add=(event:string,seconds=0)=>{if(queue.length<100)queue.push({id:crypto.randomUUID(),event,lessonId,seconds});};
 const click=(event:MouseEvent)=>{const target=(event.target as HTMLElement).closest<HTMLElement>('[data-learning-event]');if(target&&root.contains(target)&&!(target as HTMLButtonElement).disabled)add(target.dataset.learningEvent!);};
 const active=()=>{lastActive=Date.now();};root.addEventListener('click',click);root.addEventListener('keydown',active);root.addEventListener('pointerdown',active);root.addEventListener('wheel',active,{passive:true});
 const timer=setInterval(()=>{const now=Date.now(),seconds=Math.min(30,Math.floor((now-lastTick)/1000));lastTick=now;if(lessonId&&document.visibilityState==='visible'&&now-lastActive<90000&&seconds>0)add('active_time',seconds);void flush();},30000);
 return ()=>{clearInterval(timer);root.removeEventListener('click',click);root.removeEventListener('keydown',active);root.removeEventListener('pointerdown',active);root.removeEventListener('wheel',active);void flush();};
}
