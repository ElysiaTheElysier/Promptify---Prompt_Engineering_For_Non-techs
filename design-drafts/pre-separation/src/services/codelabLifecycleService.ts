export function codelabAvailable(status:string,config:any,now=Date.now()):boolean {
 if(status!=='published')return false;
 if(config?.state==='DRAFT'||config?.state==='ARCHIVED')return false;
 const start=config?.startTime?Date.parse(config.startTime):null,end=config?.endTime?Date.parse(config.endTime):null;
 if(config?.state==='SCHEDULED'&&(start===null||end===null||!Number.isFinite(start)||!Number.isFinite(end)||end<=start))return false;
 return (start===null||Number.isFinite(start)&&now>=start)&&(end===null||Number.isFinite(end)&&now<end);
}
