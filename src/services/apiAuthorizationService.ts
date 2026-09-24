import { createClient } from '@supabase/supabase-js';

export class ApiAccessError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiAccessError';
    this.statusCode = statusCode;
  }
}

function getServerSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anonKey) {
    throw new ApiAccessError('Server is not configured with Supabase credentials for authorization.', 503);
  }
  return { url, anonKey };
}

function readBearerToken(authorization?: string): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new ApiAccessError('You must be signed in to use AI features.', 401);
  return match[1].trim();
}

/**
 * Server-side authorization for AI endpoints. RLS remains the source of truth:
 * the class query returns a row only for instructors or actively enrolled users.
 */
export async function assertAiLessonAccess(params: {
  authorization?: string;
  classId?: string;
  lessonId?: string;
}): Promise<void> {
  const token = readBearerToken(params.authorization);
  if (!params.classId) throw new ApiAccessError('Class ID is required for access verification.', 403);

  const { url, anonKey } = getServerSupabaseConfig();
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) throw new ApiAccessError('Session is invalid or expired. Please sign in again.', 401);

  const { data: classRecord, error: classError } = await client
    .from('classes')
    .select('id, course_id')
    .eq('id', params.classId)
    .maybeSingle();

  if (classError || !classRecord) {
    throw new ApiAccessError('You are not enrolled in this class or access has been revoked.', 403);
  }

  // Static fallback lessons have non-UUID ids. They are permitted only after
  // the active class authorization above succeeds.
  const isLessonUuid = Boolean(params.lessonId && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(params.lessonId));
  if (!isLessonUuid) return;

  const { data: lessonRecord, error: lessonError } = await client
    .from('lessons')
    .select('id, module:course_modules(course_id)')
    .eq('id', params.lessonId!)
    .maybeSingle();

  const lessonCourseId = (lessonRecord as any)?.module?.course_id;
  if (lessonError || !lessonRecord || lessonCourseId !== classRecord.course_id) {
    throw new ApiAccessError('This lesson does not belong to your enrolled course.', 403);
  }
}
