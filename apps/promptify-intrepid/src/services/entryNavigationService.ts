/** Preserve an explicit class invitation through OAuth without accepting an external redirect. */
export function entryReturnUrl(origin:string,search:string,ui='02'){
 const result=new URL('/',origin);result.searchParams.set('ui',ui);
 const classId=new URLSearchParams(search).get('classId');
 if(classId&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(classId))result.searchParams.set('classId',classId);
 return result.href;
}
