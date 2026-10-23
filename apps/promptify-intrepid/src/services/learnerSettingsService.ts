export type LearnerSettings={temperature:number;topP:number;maxOutputTokens:number;stopSequences:string[];searchGrounding:boolean;model?:string;personalInstruction?:string};
export const DEFAULT_LEARNER_SETTINGS:LearnerSettings={temperature:0.3,topP:0.95,maxOutputTokens:4096,stopSequences:[],searchGrounding:false,personalInstruction:''};
// Older saved attempts can predate optional controls such as stop sequences.
export function restoreLearnerSettings(value:unknown):LearnerSettings{
 try{return validateLearnerSettings(value);}catch{return validateLearnerSettings(DEFAULT_LEARNER_SETTINGS);}
}
export function validateLearnerSettings(value:unknown):LearnerSettings{
 const s={...DEFAULT_LEARNER_SETTINGS,...(value&&typeof value==='object'?value:{})} as LearnerSettings;
 if(!Number.isFinite(s.temperature)||s.temperature<0||s.temperature>2||!Number.isFinite(s.topP)||s.topP<=0||s.topP>1||!Number.isInteger(s.maxOutputTokens)||s.maxOutputTokens<256||s.maxOutputTokens>4096||!Array.isArray(s.stopSequences)||s.stopSequences.length>5||s.stopSequences.some(v=>typeof v!=='string'||v.length<1||v.length>80)||typeof s.searchGrounding!=='boolean')throw new Error('Invalid model parameters.');
 if(typeof s.personalInstruction!=='string'||s.personalInstruction.length>2000)throw new Error('Learner instruction exceeds 2000 characters.');
 if(s.model!==undefined&&(typeof s.model!=='string'||!/^gemini-[a-zA-Z0-9._-]+$/.test(s.model)))throw new Error('Invalid model selection.');
 return {temperature:s.temperature,topP:s.topP,maxOutputTokens:s.maxOutputTokens,stopSequences:[...s.stopSequences],searchGrounding:s.searchGrounding,personalInstruction:s.personalInstruction,...(s.model?{model:s.model}:{})};
}
