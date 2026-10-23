import assert from 'node:assert/strict';
import {generateAndJudge} from '../src/services/automaticJudgeService';

const events:string[]=[];
let displayed='old-attempt';
const run=()=>generateAndJudge({
  generate:async()=>{events.push('generate');return {saved:{attempt:{id:'new-saved-attempt'}}};},
  publish:async(_,id)=>{displayed=id;events.push('display');},
  phase:phase=>{events.push(phase);},
  judge:async id=>{assert.equal(id,'new-saved-attempt');assert.equal(displayed,id);events.push('judge');},
  refresh:async()=>{events.push('refresh');},
});
await run();
assert.deepEqual(events,['generating','generate','display','judging','judge','refresh']);

let gradeCalls=0, refreshCalls=0;
await assert.rejects(generateAndJudge({
  generate:async()=>{throw Error('generation failed');},
  publish:async()=>{throw Error('must not publish');},
  judge:async()=>{gradeCalls++;},refresh:async()=>{refreshCalls++;},phase:()=>{},
}),/generation failed/);
assert.equal(gradeCalls,0);
await assert.rejects(generateAndJudge({
  generate:async()=>({saved:{attempt:{id:'saved-output'}}}),
  publish:async(_,id)=>{displayed=id;},
  judge:async()=>{gradeCalls++;throw Error('judge unavailable');},
  refresh:async()=>{refreshCalls++;},phase:()=>{},
}),/judge unavailable/);
assert.equal(displayed,'saved-output');
assert.equal(gradeCalls,1);
assert.equal(refreshCalls,1);
await assert.rejects(generateAndJudge({
  generate:async()=>({}),publish:async()=>{throw Error('must not publish');},
  judge:async()=>{gradeCalls++;},refresh:async()=>{},phase:()=>{},
}),/saved attempt/);
assert.equal(gradeCalls,1);
console.log('Automatic judge sequencing, exact attempt, failure preservation and authoritative refresh: PASS');
