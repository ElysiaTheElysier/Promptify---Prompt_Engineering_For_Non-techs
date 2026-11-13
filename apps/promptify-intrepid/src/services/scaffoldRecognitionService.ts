export const CORE_SCAFFOLDS=['Role','Context','Task','Guardrail','Format'].map(tag=>({id:'core-'+tag.toLowerCase(),name:tag,tag,active:true,rubricKey:''}));
export function scaffoldTag(value:{name:string;tag:string}){return (value.tag||value.name).replace(/^\[/,'').split(/\]|:/)[0].trim();}
// [Tag]: counts anywhere (learners often write one line); a bare Tag: only at a line start, so prose never matches.
export function recognizedScaffolds<T extends {name:string;tag:string;active:boolean}>(prompt:string,scaffolds:T[]){
 return scaffolds.filter(c=>{if(!c.active)return false;const tag=scaffoldTag(c).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('\\['+tag+'\\]\\s*:|(?:^|\\n)\\s*'+tag+'\\s*:', 'i').test(prompt);});
}
