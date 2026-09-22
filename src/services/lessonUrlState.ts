export const LESSON_QUERY_PARAM = 'lesson';

export function readLessonId(search: string): string | null {
  const value = new URLSearchParams(search).get(LESSON_QUERY_PARAM)?.trim();
  return value || null;
}

export function resolveAuthorizedLessonId(
  requestedId: string | null,
  authorizedLessonIds: string[],
  preferredId?: string,
): string | null {
  if (requestedId && authorizedLessonIds.includes(requestedId)) return requestedId;
  if (preferredId && authorizedLessonIds.includes(preferredId)) return preferredId;
  return authorizedLessonIds[0] || null;
}

export function buildLessonUrl(currentUrl: string, lessonId: string | null): string {
  const url = new URL(currentUrl);
  if (lessonId) {
    url.searchParams.set(LESSON_QUERY_PARAM, lessonId);
  } else {
    url.searchParams.delete(LESSON_QUERY_PARAM);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
