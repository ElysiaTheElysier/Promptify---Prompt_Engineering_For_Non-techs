export type ProductRole = 'learner' | 'instructor' | 'head' | 'admin';
export interface ProductProfile { id: string; email: string; full_name: string; role: ProductRole; profile_confirmed_at: string | null }
export interface ProductClass { id: string; class_code: string; department: string; course_id: string; client_id: string; status: string; start_date: string; end_date: string; client_name: string; course_title: string; can_manage: boolean }
export interface RubricCriterion { key: string; label: string; description: string; weight: number; active: boolean }
export interface WeightedEvaluation { contract: 'weighted-v1'; total: number; criteria: Array<RubricCriterion & { score: number; max: number; reason: string }>; strengths: string[]; improvements: string[]; nextHint: string; feedback?: Record<'en'|'vi', { criteriaReasons: Record<string,string>; strengths: string[]; improvements: string[]; nextHint: string }> }
export interface ProductAttempt { id: string; learner_id: string; learner_name?: string; lesson_ref_id: string; class_id: string; attempt_number: number; prompt_text: string; ai_output: string; model: string; latency_ms: number; created_at: string; evaluation_json: WeightedEvaluation | null }
export interface StudioConfig {
  revision: number; pillar: string; branch: string; departments: string[]; objectives: string[]; competencies: string;
  startTime: string; endTime: string; state: 'DRAFT' | 'ACTIVE' | 'SCHEDULED' | 'ARCHIVED';
  variables: Array<{ name: string; type: string; sample: string; mappedTo: string }>;
  scaffold: Array<{ id: string; name: string; tag: string; active: boolean; rubricKey: string }>;
  rubric: RubricCriterion[]; materials: Array<{ id: string; type: string; name: string; url: string; version: string; updated: string; log: string }>;
  awards: Record<string, unknown>;
}
export interface ProductLesson { id: string; lesson_key: string; title: string; status: string; module_id: string; position: number; scenario: string; task_goal: string; system_instruction: string; starter_prompt: string; sample_input_context: string; concept_content: string; hints: string[]; resources: any[]; rubric: RubricCriterion[]; studio: StudioConfig | null }
export interface ProductSnapshot { promptLibrary?:any[];learnerContexts?:any[];modelInfo?:{name:string;allowed?:string[]}; profile: ProductProfile; classes: ProductClass[]; selectedClass: ProductClass | null; lessons: ProductLesson[]; attempts: ProductAttempt[]; sops: any[]; messages: any[]; privateHints: any[]; learners: any[]; analytics: Record<string, any>; controls: { state: 'active' | 'frozen' | 'ended'; revision: number }; connections: any[]; audit: any[]; contributions?:any[];syncLogs?:any[];trainerNotes?:any[];drafts?:Array<{lesson_id:string;prompt:string;revision:number}>;progress?:any[];awards?:any[];attendance?:any[] }
