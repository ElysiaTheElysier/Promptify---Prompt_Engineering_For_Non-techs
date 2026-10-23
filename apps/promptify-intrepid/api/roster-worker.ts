import {validWorkerSignature,runRosterWorker} from '../src/services/rosterWorkerService.js';
export const config={maxDuration:60};
export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required.'});}
  if(!validWorkerSignature(req.headers))return res.status(401).json({error:'Unauthorized.'});
  try{return res.status(200).json(await runRosterWorker(req.headers['x-promptify-nonce']));}
  catch{return res.status(503).json({error:'Roster worker unavailable.'});}
}
