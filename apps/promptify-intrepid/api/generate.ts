import { generateSavedRun } from '../src/services/rebuildRunService.js';
import { AiServerError, handleGenerateRequest } from '../src/services/apiServerService.js';
import { ApiAccessError, assertAiLessonAccess } from '../src/services/apiAuthorizationService.js';
import {generationAsyncEnabled} from '../src/services/generationQueueService';

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
    const asyncMode=generationAsyncEnabled();
    if((process.env.GENERATION_MODE==='async'||process.env.AI_WORKER_ISOLATED==='true')&&!asyncMode)throw new ApiAccessError('Asynchronous generation is not configured.',503);
    const result = await generateSavedRun(req.headers?.authorization || '', body || {},asyncMode);
    return res.status(200).json(result);
  } catch (error: any) {
    const known = error instanceof ApiAccessError || error instanceof AiServerError;
    const status = known ? error.statusCode : 500;
    console.error(JSON.stringify({ event: 'api_failure', route: 'generate', status }));
    return res.status(status).json({ error: known ? error.message : 'Lỗi xử lý sinh văn bản AI' });
  }
}
