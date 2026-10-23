import {ApiAccessError} from './apiAuthorizationService';
type Variable={name:string;type:string;sample:string};
export function bindPromptVariables(template:string,definitions:Variable[]=[],input:unknown={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiAccessError('Invalid variable values.',422);
 const values=input as Record<string,unknown>,known=new Set(definitions.map(v=>v.name));
 if(Object.keys(values).some(key=>!known.has(key)))throw new ApiAccessError('Unknown prompt variable.',422);
 const used:Record<string,string>={};
 const prompt=template.replace(/\{\{\s*([\w.-]+)\s*\}\}|\{([\w.-]+)\}/g,(token,double,single)=>{
  const name=double||single,definition=definitions.find(v=>v.name===name);if(!definition)return token;
  const value=values[name]??definition.sample;
  if(typeof value!=='string'||!value.trim()||value.length>10000)throw new ApiAccessError('A value is required for variable '+name,422);
  if(['number','integer'].includes(definition.type)&&(!Number.isFinite(Number(value))||definition.type==='integer'&&!Number.isInteger(Number(value))))throw new ApiAccessError('Invalid numeric variable '+name,422);
  if(definition.type==='json'){try{JSON.parse(value);}catch{throw new ApiAccessError('Invalid JSON variable '+name,422);}}
  used[name]=value;return value;
 });
 if(prompt.length>24000)throw new ApiAccessError('Expanded prompt exceeds 24000 characters.',422);
 return {prompt,values:used,template};
}
