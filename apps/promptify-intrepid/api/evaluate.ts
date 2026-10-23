import { evaluateSavedRun,enqueueJudge } from '../src/services/rebuildRunService.js';
import {judgeAsyncEnabled} from '../src/services/judgeQueueService';
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
    const asyncMode=judgeAsyncEnabled();
    if((process.env.JUDGE_MODE==='async'||process.env.AI_WORKER_ISOLATED==='true')&&!asyncMode)throw new ApiAccessError('Asynchronous Judge is not configured.',503);
    const result = await (asyncMode?enqueueJudge:evaluateSavedRun)(req.headers?.authorization || '', body || {});
    return res.status(200).json(result);
  } catch (error: any) {
    const known = error instanceof ApiAccessError || error instanceof AiServerError;
    const status = known ? error.statusCode : 500;
    console.error(JSON.stringify({ event: 'api_failure', route: 'evaluate', status }));
    return res.status(status).json({ error: known ? error.message : 'Lỗi xử lý đánh giá AI' });
  }
}
