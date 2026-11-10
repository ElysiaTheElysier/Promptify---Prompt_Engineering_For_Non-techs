import {createDatabaseClient,requireCloudDatabase} from './cloudDatabaseService';
import {isIdentityRejection} from './firebaseServerIdentityService';

export class ApiAccessError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiAccessError';
    this.statusCode = statusCode;
  }
}

/** A definitive identity rejection is 401. Firebase or Cloud SQL being unavailable is 503 (still denied), so the
 * client retries instead of treating a valid account as signed out or off-roster. */
export function identityError(error: unknown, message: string): ApiAccessError {
  // TM-003: a staff sign-in waiting for administrator approval keeps its own message and code (not a sign-out).
  if ((error as any)?.code === 'identity_link_pending') return Object.assign(new ApiAccessError((error as Error).message, 403), { code: 'identity_link_pending' });
  return !error || isIdentityRejection(error)
    ? new ApiAccessError(message, 401)
    : new ApiAccessError('Identity service is temporarily unavailable. Retry without signing out.', 503);
}

function readBearerToken(authorization?: string): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new ApiAccessError('Bạn cần đăng nhập để sử dụng chức năng AI.', 401);
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
  if (!params.classId) throw new ApiAccessError('Thiếu lớp học để xác thực quyền truy cập.', 403);

  try{requireCloudDatabase();}catch{throw new ApiAccessError('Cloud SQL authentication is not configured.',503);}
  const client=createDatabaseClient(`Bearer ${token}`);

  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) throw identityError(authError, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');

  const { data: classRecord, error: classError } = await client
    .from('classes')
    .select('id, course_id')
    .eq('id', params.classId)
    .maybeSingle();

  if (classError || !classRecord) {
    throw new ApiAccessError('Bạn chưa được ghi danh hoặc quyền truy cập lớp đã bị thu hồi.', 403);
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
    throw new ApiAccessError('Bài học không thuộc khóa học mà bạn được ghi danh.', 403);
  }
}
