/** TC-SEC-04: rule-based detection of prompt-injection / jailbreak attempts in learner-authored text.
 * Signals name the technique only; the prompt text itself is never logged. English and Vietnamese. */
export type InjectionSignal='instruction_override'|'system_prompt_extraction'|'jailbreak_persona'|'delimiter_spoofing'|'grader_manipulation';
const RULES:Array<[InjectionSignal,RegExp]>=[
 ['instruction_override',/\b(?:ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}\b(?:previous|prior|above|earlier|preceding|your|system|developer|original)\b[^.\n]{0,20}\b(?:instructions?|prompts?|rules?|guidelines?|directives?|constraints?)\b/i],
 ['instruction_override',/\b(?:ignore|disregard|forget)\s+(?:all|everything)\s+(?:you were told|above|before|prior)\b/i],
 ['instruction_override',/(?:bỏ qua|phớt lờ|quên|bỏ hết|vô hiệu hóa|không tuân theo)[^.\n]{0,40}(?:hướng dẫn|chỉ dẫn|quy tắc|mệnh lệnh|lệnh|ràng buộc)[^.\n]{0,20}(?:trước|ở trên|phía trên|hệ thống|ban đầu|gốc|trước đó)/iu],
 ['system_prompt_extraction',/\b(?:reveal|show|print|repeat|output|display|leak|dump|tell me|what (?:is|are))\b[^.\n]{0,40}\b(?:system|developer|hidden|initial|original|secret)\s+(?:prompt|instructions?|message|rules)\b/i],
 ['system_prompt_extraction',/(?:tiết lộ|hiển thị|in ra|cho (?:tôi|mình|em) xem|nhắc lại|cho biết)[^.\n]{0,30}(?:system prompt|lời nhắc hệ thống|chỉ dẫn hệ thống|hướng dẫn hệ thống|prompt hệ thống|prompt ẩn)/iu],
 ['jailbreak_persona',/\b(?:do anything now|developer mode|jailbreak(?:ed|ing)?|jailbroken|DAN mode|act as DAN|you are DAN|no (?:ethical |content )?restrictions|without (?:any )?(?:restrictions|filters|limitations)|unfiltered (?:mode|ai|assistant))\b/i],
 ['jailbreak_persona',/\byou are (?:now|no longer)\b[^.\n]{0,40}\b(?:unrestricted|unfiltered|not bound|free from|evil|DAN)\b/i],
 ['jailbreak_persona',/(?:không (?:có|bị) (?:giới hạn|ràng buộc|kiểm duyệt)|chế độ nhà phát triển|bẻ khóa)/iu],
 ['delimiter_spoofing',/<\/?\s*(?:system|assistant|developer)\s*>|\[\/?(?:INST|SYS)\]|<\|(?:im_start|im_end|system)\|>|^\s*#{0,3}\s*(?:system|developer)\s*(?:prompt|message)?\s*:/im],
 ['grader_manipulation',/\b(?:give|award|assign)\s+(?:me|this(?: prompt| answer| attempt)?|my (?:prompt|answer|attempt))\s+(?:a\s+)?(?:full|perfect|maximum|10\s*\/\s*10|100\s*%)\s*(?:score|marks|points|grade)?/i],
 ['grader_manipulation',/\b(?:score|grade|rate)\s+(?:me|this(?: prompt| attempt| answer)?|my (?:prompt|answer|attempt))\s+(?:a\s+|as\s+)?(?:10\s*\/\s*10|100\s*%|full marks|perfect)/i],
 ['grader_manipulation',/(?:cho|chấm)\s+(?:tôi|mình|em|bài này|prompt này)\s+(?:điểm\s*)?(?:10\s*\/\s*10|tối đa|điểm tối đa|100\s*%)/iu],
];
const normalize=(text:string)=>text.normalize('NFKC').replace(/[​-‍⁠﻿]/g,'').replace(/[ \t]+/g,' ');
export function injectionSignals(...texts:Array<string|undefined|null>):InjectionSignal[]{
 const found=new Set<InjectionSignal>();
 for(const raw of texts){if(!raw)continue;const text=normalize(raw);for(const [signal,rule] of RULES)if(rule.test(text))found.add(signal);}
 return [...found];
}
