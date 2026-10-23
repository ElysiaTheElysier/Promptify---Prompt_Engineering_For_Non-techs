/** Course content is a template; Studio overrides belong to one class/lesson. */
export function resolveClassLesson<T extends Record<string, any>>(lesson: T, config: any): T {
  const overrides = config?.lessonOverrides;
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return { ...lesson };
  const resolved: Record<string, any> = { ...lesson };
  for (const field of ['title', 'scenario', 'task_goal', 'system_instruction', 'starter_prompt', 'sample_input_context', 'status']) {
    if (Object.prototype.hasOwnProperty.call(overrides, field)) resolved[field] = overrides[field];
  }
  return resolved as T;
}
