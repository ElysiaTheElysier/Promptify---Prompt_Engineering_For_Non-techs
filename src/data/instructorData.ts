import {
  InstructorActivity,
  InstructorClass,
} from '../types/instructor';

// Empty compatibility fallbacks only. Instructor screens load real classes,
// learners and activity from Supabase; no named mock users are shipped.
export const INSTRUCTOR_CLASSES: InstructorClass[] = [];
export const INSTRUCTOR_ACTIVITIES: InstructorActivity[] = [];
