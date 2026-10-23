// Pattern signals for the document's PII warning; no personal values leave this helper.
const rules=[
 {key:'identity',expression:/\b(?:CCCD|CMND|passport|SSN|social security)\s*(?:number|no\.?|số)?\s*[:#-]?\s*[A-Z0-9 .-]{8,20}/gi},
 {key:'phone',expression:/(?<!\d)(?:\+?84[ .-]?|0)(?:3|5|7|8|9)(?:[ .-]?\d){8}(?!\d)/g},
 {key:'email',expression:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi},
];
export function piiSignals(text:string){return rules.filter(rule=>{rule.expression.lastIndex=0;return rule.expression.test(text);}).map(rule=>rule.key);}
export function scrubPrompt(text:string){return rules.reduce((value,rule)=>{rule.expression.lastIndex=0;return value.replace(rule.expression,`[REDACTED_${rule.key.toUpperCase()}]`);},text);}
