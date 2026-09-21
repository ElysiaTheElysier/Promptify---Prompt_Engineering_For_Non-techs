export type InstructorViewMode = 'dashboard' | 'classes' | 'class_detail' | 'learners' | 'activity';

export interface InstructorClass {
  id: string;
  classCode: string;
  name: string;
  organization: string;
  department: string;
  totalLearners: number;
  startedLearners: number;
  completedLearners: number;
  avgProgressPercent: number;
  status: 'active' | 'ending_soon' | 'completed';
  timeRemainingText: string;
  startDate: string;
  description: string;
  lessonProgress: {
    labId: string;
    labTitle: string;
    completedCount: number;
    totalCount: number;
    completionPercent: number;
  }[];
}

export interface InstructorLearner {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  organization: string;
  classId: string;
  className: string;
  completedLabIds: string[];
  currentLabId: string;
  promptAttemptsTotal: number;
  attemptsByLab: Record<string, number>;
  status: 'not_started' | 'in_progress' | 'completed';
  lastActive: string;
  recentPromptSample?: string;
  avatarInitials: string;
}

export type InstructorActionType = 
  | 'start_lab' 
  | 'run_prompt' 
  | 'compare_result' 
  | 'complete_lab' 
  | 'export_library';

export interface InstructorActivity {
  id: string;
  timestamp: string;
  timeAgo: string;
  learnerId: string;
  learnerName: string;
  learnerAvatar: string;
  classId: string;
  className: string;
  actionType: InstructorActionType;
  actionText: string;
  detail: string;
  labId?: string;
  labName?: string;
}

export interface InstructorDashboardStats {
  activeClasses: number;
  totalLearners: number;
  startedLearners: number;
  completedLearners: number;
}
