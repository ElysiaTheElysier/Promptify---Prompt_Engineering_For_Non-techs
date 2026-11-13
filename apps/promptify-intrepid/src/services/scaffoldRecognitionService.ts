export const CORE_SCAFFOLDS=['Role','Context','Task','Guardrail','Format'].map(tag=>({id:'core-'+tag.toLowerCase(),name:tag,tag,active:true,rubricKey:''}));
// Chips a lab offers until its trainer saves a list in Studio; a saved list replaces them entirely.
const DEFAULT_LINKS:Record<string,string>={Role:'persona',Context:'groundedness',Task:'actionability',Format:'format',Example:'oneshot'};
export const DEFAULT_SCAFFOLDS=['Role','Context','Task','Guardrail','Format','Example','Prove'].map(tag=>({id:'default-'+tag.toLowerCase(),name:tag,tag,active:true,rubricKey:DEFAULT_LINKS[tag]||''}));
export function lessonScaffolds<T extends {name:string;tag:string;active:boolean;rubricKey:string}>(saved?:T[]|null):(T|typeof DEFAULT_SCAFFOLDS[number])[]{return saved?.length?saved:DEFAULT_SCAFFOLDS;}
export function scaffoldTag(value:{name:string;tag:string}){return (value.tag||value.name).replace(/^\[/,'').split(/\]|:/)[0].trim();}
// [Tag]: counts anywhere (learners often write one line); a bare Tag: only at a line start, so prose never matches.
export function recognizedScaffolds<T extends {name:string;tag:string;active:boolean}>(prompt:string,scaffolds:T[]){
 return scaffolds.filter(c=>{if(!c.active)return false;const tag=scaffoldTag(c).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('\\['+tag+'\\]\\s*:|(?:^|\\n)\\s*'+tag+'\\s*:', 'i').test(prompt);});
}
