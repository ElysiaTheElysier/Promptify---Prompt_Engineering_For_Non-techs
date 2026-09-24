import { AiServerError, handleEvaluateRequest } from '../src/services/apiServerService.js';
import { ApiAccessError, assertAiLessonAccess } from '../src/services/apiAuthorizationService.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // use raw body
      }
    }

    await assertAiLessonAccess({
      authorization: req.headers?.authorization,
      classId: body?.classId,
      lessonId: body?.lessonId,
    });
    const result = await handleEvaluateRequest(body || {});
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /api/evaluate:', error);
    const status = error instanceof ApiAccessError || error instanceof AiServerError ? error.statusCode : 500;
    return res.status(status).json({ error: error.message || 'AI evaluation error' });
  }
}
