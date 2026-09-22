/**
 * DATABASE TYPES & MODELS FOR PROMPTIFY MVP
 * Khớp chính xác với PostgreSQL schema tại supabase/schema.sql
 */

export type UserRole = 'learner' | 'instructor' | 'admin';

export interface DbUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  auth_provider_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbClient {
  id: string;
  name: string;
  industry: string;
  created_at?: string;
}

export type CourseStatus = 'active' | 'archived';
export type CoursePublicationStatus = 'draft' | 'published' | 'archived';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type LessonResourceType = 'text' | 'data' | 'url' | 'file' | 'reference';

export interface DbCourse {
  id: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  slug?: string | null;
  publication_status?: CoursePublicationStatus;
  version?: number;
  published_at?: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbCourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  status: ContentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface DbLesson {
  id: string;
  module_id: string;
  lesson_key: string;
  title: string;
  badge: string | null;
  focus_skill: string | null;
  scenario: string | null;
  task_goal: string | null;
  concept_title: string | null;
  concept_content: string | null;
  system_instruction: string | null;
  starter_prompt: string | null;
  baseline_prompt: string | null;
  improved_prompt: string | null;
  sample_input_context: string | null;
  prompt_placeholder: string | null;
  expected_output_format: string | null;
  hints: string[];
  focus_components: string[];
  position: number;
  status: ContentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface DbLessonRubricCriterion {
  id: string;
  lesson_id: string;
  criterion_key: string;
  label: string;
  description: string;
  max_score: number;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbLessonResource {
  id: string;
  lesson_id: string;
  resource_type: LessonResourceType;
  title: string;
  content: string | null;
  url: string | null;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbCourseInstructor {
  course_id: string;
  user_id: string;
  permission: 'owner' | 'editor' | 'viewer';
  assigned_at?: string;
}

export interface CourseCurriculumLesson extends DbLesson {
  rubric_criteria: DbLessonRubricCriterion[];
  resources: DbLessonResource[];
}

export interface CourseCurriculumModule extends DbCourseModule {
  lessons: CourseCurriculumLesson[];
}

export type ClassStatus = 'active' | 'upcoming' | 'completed' | 'archived';

export interface DbClass {
  id: string;
  class_code: string;
  course_id: string;
  client_id: string;
  department: string;
  start_date: string;
  end_date: string;
  status: ClassStatus;
  created_at?: string;
}

export interface DbLearner {
  id: string;
  learner_code: string; // LRN-000001
  user_id: string;
  created_at?: string;
}

export type EnrollmentStatus = 'active' | 'completed' | 'removed' | 'expired';

export interface DbEnrollment {
  id: string;
  learner_id: string;
  class_id: string;
  status: EnrollmentStatus;
  joined_at?: string;
  updated_at?: string;
}

/**
 * Class Tracking Join Model:
 * Từ ClassID truy vấn ngược:
 * ClassID -> Course -> Client / Company -> Industry -> Department -> Learner count
 */
export interface ClassWithDetails extends DbClass {
  course: DbCourse;
  client: DbClient;
  learner_count: number;
}

/**
 * Learner Tracking Detail Model trong một Class
 */
export interface LearnerInClassDetail {
  enrollment_id: string;
  learner_id: string;
  user_id: string;
  learner_code: string; // LRN-000001
  full_name: string;
  email: string;
  department: string;
  enrollment_status: EnrollmentStatus;
  joined_at: string;
  progress_percent?: number;
  completed_labs?: number;
  total_labs?: number;
}

/**
 * View cho Learner sau khi đăng nhập:
 * Tìm User -> LearnerID -> Enrollment -> Class -> Course & Client
 */
export interface LearnerActiveEnrollmentView {
  user: DbUser;
  learner: DbLearner;
  enrollment: DbEnrollment;
  classDetails: ClassWithDetails;
}

export interface AiRubricScores {
  taskCompletion: number; // 0–2
  groundedness: number;   // 0–2
  formatAdherence: number; // 0–2
  constraintCompliance: number; // 0–2
  businessUsability: number; // 0–2
}

export interface AiEvaluationResult {
  scores: AiRubricScores;
  total: number; // 0–10
  strengths: string[];
  improvements: string[];
  nextHint: string;
}

export interface DbPromptAttempt {
  id: string;
  learner_id: string;
  class_id: string;
  lesson_id: string;
  lesson_ref_id?: string | null;
  attempt_number: number;
  prompt_text: string;
  ai_output: string;
  evaluation_json: AiEvaluationResult | null;
  model: string;
  latency_ms: number;
  created_at?: string;
}

