import {ApiAccessError} from './apiAuthorizationService.js';
export function validateStudioShape(config:any){
 const fail=()=>{throw new ApiAccessError('Invalid Studio configuration.',422);};
 if(!config||typeof config!=='object'||Array.isArray(config))fail();
 for(const key of ['pillar','branch','competencies','startTime','endTime'])if(typeof config[key]!=='string'||config[key].length>20000)fail();
 for(const key of ['departments','objectives'])if(!Array.isArray(config[key])||config[key].length>100||config[key].some((v:any)=>typeof v!=='string'||v.length>2000))fail();
 const specs:Record<string,string[]>={variables:['name','type','sample','mappedTo'],scaffold:['id','name','tag','rubricKey'],materials:['id','type','name','url','version','updated','log']};
 for(const [key,fields] of Object.entries(specs)){if(!Array.isArray(config[key])||config[key].length>100)fail();for(const row of config[key]){if(!row||fields.some(field=>typeof row[field]!=='string'||row[field].length>20000))fail();if(key==='scaffold'&&typeof row.active!=='boolean')fail();}}
 if(new Set(config.variables.map((v:any)=>v.name)).size!==config.variables.length||config.variables.some((v:any)=>! /^[A-Za-z_][A-Za-z0-9_.-]{0,79}$/.test(v.name)))fail();
 if(!config.awards||typeof config.awards!=='object'||Array.isArray(config.awards))fail();
 // TC-SEC-04: lessons that teach injection defence may run adversarial prompts (still logged).
 if(config.allowAdversarialPractice!==undefined&&typeof config.allowAdversarialPractice!=='boolean')fail();
 if(config.awards.slaMinutes!==undefined&&config.awards.slaMinutes!==''&&(!Number.isFinite(Number(config.awards.slaMinutes))||Number(config.awards.slaMinutes)<1||Number(config.awards.slaMinutes)>1440))fail();
 const threshold=config.awards.passThreshold??8;if(typeof threshold!=='number'||!Number.isFinite(threshold)||threshold<0||threshold>10)fail();
 if(config.awards.issuance!==undefined){const rule=config.awards.issuance;if(!rule||typeof rule!=='object'||Array.isArray(rule)||['badgeOnPass','certificateOnCompletion','requireAttendance'].some(key=>typeof rule[key]!=='boolean')||typeof rule.minimumAverageScore!=='number'||!Number.isFinite(rule.minimumAverageScore)||rule.minimumAverageScore<0||rule.minimumAverageScore>10)fail();}
 for(const key of ['badges','gamificationLinks'])if(config.awards[key]!==undefined&&(!Array.isArray(config.awards[key])||config.awards[key].length>100||config.awards[key].some((row:any)=>!row||typeof row!=='object'||Object.values(row).some(v=>typeof v!=='string'||v.length>20000))))fail();
 for(const badge of config.awards.badges||[]){if(badge.ruleType!==undefined){if(!['passed_lesson','overall_score','criterion_score'].includes(badge.ruleType)||!['any','first'].includes(badge.attemptScope||'any'))fail();if(badge.ruleType!=='passed_lesson'&&(!/^[0-9]+([.][0-9]+)?$/.test(badge.minimumScore||'')||Number(badge.minimumScore)>10))fail();if(badge.ruleType==='criterion_score'&&!config.rubric?.some((r:any)=>r.key===badge.criterionKey&&r.active))fail();}}
 if(config.awards.certificate!==undefined&&(!config.awards.certificate||typeof config.awards.certificate!=='object'||Object.values(config.awards.certificate).some(v=>typeof v!=='string'||v.length>20000)))fail();
 for(const row of [...config.materials,...(config.awards.gamificationLinks||[])])if(row.url){try{if(!['https:','http:'].includes(new URL(row.url).protocol))fail();}catch{fail();}}
 return config;
}
