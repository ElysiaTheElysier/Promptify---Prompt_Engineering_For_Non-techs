import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync('curriculum-specs/public-basic.json','utf8'));
const output='supabase/migrations/041_product_public_basic_curriculum.sql';
if(fs.existsSync(output))throw new Error('Refusing to overwrite a migration. Create a new forward migration for curriculum updates.');
const q=value=>"'"+String(value).replace(/'/g,"''")+"'";
let sql='-- Generated from curriculum-specs/public-basic.json; fictional public practice only.\nBEGIN;\nDO $$ DECLARE module uuid; BEGIN\nSELECT m.id INTO STRICT module FROM public.course_modules m JOIN public.courses c ON c.id=m.course_id WHERE c.slug=\'promptify-public-basic\' AND m.position=1;\n';
for(const [index,lab]of source.labs.entries()){
 const system='You are a public business prompting practice assistant. Use only the fictional supplied source, follow the requested output format, and state when information is missing. Never invent an enterprise policy. Respond in the language requested by the learner.';
 sql+=`INSERT INTO public.lessons(module_id,lesson_key,title,badge,focus_skill,scenario,task_goal,concept_title,concept_content,system_instruction,starter_prompt,baseline_prompt,improved_prompt,sample_input_context,prompt_placeholder,expected_output_format,hints,focus_components,position,status) VALUES(module,${[lab.key,lab.title,lab.skill,lab.skill,'Fictional public practice / Thực hành công khai với dữ liệu giả định.',lab.goal,lab.skill,lab.theory,system,lab.starter,lab.starter,lab.solution,source.context,'Write your prompt / Viết prompt của bạn',lab.format,JSON.stringify(['State the task and output format. / Nêu nhiệm vụ và định dạng.','Use only the supplied practice source. / Chỉ dùng nguồn thực hành được cung cấp.']),JSON.stringify(['task','context','format'])].map(q).join(',')},${index+1},'published');\n`;
}
sql+='END $$;\nCOMMIT;\nNOTIFY pgrst,\'reload schema\';\n';fs.writeFileSync(output,sql);console.log('Generated a new public Basic curriculum migration; existing history and curriculumSeed.ts untouched.');
