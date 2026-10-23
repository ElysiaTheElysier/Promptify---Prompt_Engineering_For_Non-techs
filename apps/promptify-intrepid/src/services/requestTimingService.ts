import {AsyncLocalStorage} from 'node:async_hooks';
type Metrics={sqlTransactions:number;sqlMs:number;authMs:number};
const scope=new AsyncLocalStorage<Metrics>();
export function recordRequestTime(kind:'sql'|'auth',milliseconds:number){
 const metrics=scope.getStore();if(!metrics)return;
 if(kind==='sql'){metrics.sqlTransactions++;metrics.sqlMs+=milliseconds;}else metrics.authMs+=milliseconds;
}
export async function timeProductRequest<T>(work:()=>Promise<T>){
 const metrics:Metrics={sqlTransactions:0,sqlMs:0,authMs:0};
 const started=performance.now();
 const value=await scope.run(metrics,work);
 return {value,metrics,totalMs:performance.now()-started};
}
