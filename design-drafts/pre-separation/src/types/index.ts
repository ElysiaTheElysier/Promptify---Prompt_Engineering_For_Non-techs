export type UIMode = 'notebook' | 'playground' | 'hybrid';

export type AppView = 
  | 'landing' 
  | 'class_select' 
  | 'dashboard' 
  | 'learning_path' 
  | 'lesson' 
  | 'playground' 
  | 'library' 
  | 'history';

export interface Learner {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'CLASS_MANAGER' | 'INSTRUCTOR';
  organization: string;
  department: string;
  avatarInitials?: string;
}

export interface ClassCohort {
  id: string;
  classCode: string;
  name: string;
  organization: string;
  industry: string;
  department: string;
  expiryDurationHours: number;
  expiryDateText?: string;
  description: string;
  iconName: string;
  isPublic?: boolean;
}

export interface Enrollment {
  learnerId: string;
  classId: string;
  completedLabIds: string[];
  currentLabId: string;
  enrolledAt: string;
  expiresAt: string;
}

export interface MiniChallenge {
  title: string;
  instruction: string;
  context?: string;
  tip?: string;
}

export interface SolutionStep {
  stepNumber: number;
  title: string;
  explanation: string;
  snippet?: string;
}

export interface LabAssistanceState {
  hasViewedHints: boolean;
  hasViewedSolution: boolean;
  hintsUnlockedAt?: string;
  solutionUnlockedAt?: string;
}

export interface LabStep {
  id: string;
  order: number;
  title: string;
  badge: string;
  focusSkill: string;
  scenario: string;
  taskGoal: string;
  conceptTag: string;
  conceptTitle: string;
  conceptExplanation: string;
  theoryContent?: string;
  systemInstruction?: string;
  baselinePrompt: string;
  improvedPrompt: string;
  solutionSteps?: SolutionStep[];
  starterPrompt?: string;
  promptPlaceholder?: string;
  sampleInputContext?: string;
  hints: string[];
  expectedOutputFormat: string;
  rubricCriteria: {
    persona: string;
    task: string;
    guardrails: string;
    format: string;
  };
  comparisonHighlights?: {
    promptChanges: string[];
    outputChanges: { before: string; after: string };
    whyBetter: string;
  };
  miniChallenge?: MiniChallenge;
  focusComponents?: PromptComponentType[];
  simulatedBaselineOutput: string;
  simulatedImprovedOutput: string;
}

export type PromptComponentType =
  | 'role'
  | 'context'
  | 'task'
  | 'constraint'
  | 'output_format'
  | 'example'
  | 'grounding';

export interface PromptSpan {
  type: PromptComponentType;
  start: number;
  end: number;
  text: string;
  confidence: number;
  reason?: string;
}

export interface PromptAnalysis {
  components: PromptSpan[];
  detectedTypes: PromptComponentType[];
  missingTypes: PromptComponentType[];
}

export interface PromptRun {
  id: string;
  timestamp: string;
  labId: string;
  promptText: string;
  systemInstruction: string;
  output: string;
  tokenCount: number;
  latencyMs: number;
  mode: 'simulated' | 'gemini' | 'openai';
  versionTag: 'baseline' | 'improved' | 'custom';
}

export interface RubricAudit {
  personaScore: number;       // max 20
  taskScore: number;          // max 20
  guardrailsScore: number;    // max 20
  variableScore: number;      // max 20
  formatScore: number;        // max 20
  totalScore: number;         // max 100
  personaNote: string;
  taskNote: string;
  guardrailsNote: string;
  variableNote: string;
  formatNote: string;
  actionableAdvice: string;
}

export type ApiEngineMode = 'live' | 'simulated' | 'gemini';

export interface ApiConfig {
  mode: ApiEngineMode;
  geminiApiKey?: string;
  model: string;
  temperature: number;
}

export interface UserSession {
  email: string;
  name: string;
  role: 'STUDENT' | 'CLASS_MANAGER' | 'INSTRUCTOR';
  classId: string;
  sessionStartTime: number;
  expiryDurationMs: number;
  isExpired: boolean;
}

// 5 Tiêu chuẩn Đánh giá Nghiệp vụ (Business Evaluation)
export interface BusinessEvaluation {
  formatAdherence: boolean;    // Đúng định dạng yêu cầu (Bảng markdown, gạch đầu dòng, danh sách mẫu)
  completeness: boolean;       // Đầy đủ các ý quan trọng trong bài toán
  actionability: boolean;      // Có giải pháp dùng ngay được trong công việc
  groundedness: boolean;       // Căn cứ dựa trên dữ liệu/tài liệu gốc đã cung cấp
  toneFit: boolean;            // Văn phong chuẩn mực ngân hàng (khách quan, trang trọng)
  userFeedbackNote?: string;
}

// Lưu trữ từng lần thử câu lệnh (Prompt Versioning)
export interface PromptVersion {
  id: string;
  versionNumber: number;        // 1, 2, 3...
  labId: string;
  promptText: string;
  systemInstruction?: string;
  output: string;
  techniqueUsed: string;
  detectedChanges: {
    hasRole: boolean;
    hasContext: boolean;
    hasTask?: boolean;
    hasConstraint: boolean;
    hasFormat: boolean;
    hasExample: boolean;
    hasGrounding: boolean;
  };
  timestamp: string;
  businessEvaluation: BusinessEvaluation;
  aiEvaluation?: import('./database').AiEvaluationResult | null;
  tokenCount?: number;
  latencyMs?: number;
}

// Thư viện Prompt Chuẩn Nghiệp vụ (SOP Library / Prompt Registry)
export interface SavedPromptTemplate {
  id: string;
  title: string;                // Tên prompt (ví dụ: Prompt phân tích tín dụng SME)
  businessUseCase: string;      // Tình huống / Nhiệm vụ nghiệp vụ
  labId: string;
  promptText: string;
  systemInstruction?: string;
  techniqueUsed: string;
  versionNumber: number;
  businessEvaluation: BusinessEvaluation;
  department: string;          // Khối Tín dụng - Agribank
  author?: string;
  createdAt: string;
  isRecommended?: boolean;     // Được chuyên gia / giảng viên đánh dấu khuyên dùng
  sampleOutputSnippet?: string;
}

