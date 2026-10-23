import {timeProductRequest} from '../src/services/requestTimingService.js';
import { handleProductRequest } from '../src/services/productionServerService.js';
import { ApiAccessError } from '../src/services/apiAuthorizationService.js';
import { AiServerError } from '../src/services/apiServerService.js';
export const config = { maxDuration: 60 };
export default async function handler(req: any, res: any) {
  const started=performance.now();
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST required.' }); }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (JSON.stringify(body || {}).length > 3000000) return res.status(413).json({ error: 'Request is too large.' });
    const timed=await timeProductRequest(()=>handleProductRequest(req.headers.authorization || '',body));const result=timed.value;
    if((process.env.PROMPTIFY_LOCAL_TIMING==='true'||process.env.NODE_ENV==='development'))console.info(JSON.stringify({event:'product-timing',action:body?.action,totalMs:Math.round(timed.totalMs),sqlTransactions:timed.metrics.sqlTransactions,sqlMs:Math.round(timed.metrics.sqlMs),authMs:Math.round(timed.metrics.authMs)}));
    res.setHeader('Server-Timing',`product;dur=${(performance.now()-started).toFixed(1)}`);
    return res.status(200).json(result);
  } catch (error) {
    const known = error instanceof ApiAccessError || error instanceof AiServerError;
    return res.status(known ? error.statusCode : error instanceof SyntaxError ? 400 : 500).json({ error: known ? error.message : 'The server could not complete this request.' });
  }
}
