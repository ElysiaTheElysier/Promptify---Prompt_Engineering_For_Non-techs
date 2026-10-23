import assert from 'node:assert/strict';
import {vietnamDayStart,summarizeGenerationTelemetry} from '../src/services/governanceTelemetryService';
assert.equal(vietnamDayStart(new Date('2026-10-09T17:01:00Z')),'2026-10-09T17:00:00.000Z');
assert.equal(vietnamDayStart(new Date('2026-10-09T16:59:00Z')),'2026-10-08T17:00:00.000Z');
const report=summarizeGenerationTelemetry([
 {attempt_id:'a',tokens:100,latency_ms:200},
 {attempt_id:'b',tokens:null,latency_ms:400},
 {attempt_id:'c',tokens:-100,latency_ms:NaN},
 {attempt_id:null,tokens:1000,latency_ms:1000},
]);
assert.equal(report.completed,3);assert.equal(report.tokens,100);assert.equal(report.token_samples,1);assert.equal(report.average_latency_ms,300);assert.equal(report.latency_samples,2);
assert.equal(summarizeGenerationTelemetry([]).tokens,null,'Missing measurements are not fabricated zero usage');
assert.equal(summarizeGenerationTelemetry([],true).truncated,true);
console.log('Generation telemetry: Vietnam day boundary, incomplete runs and missing/invalid measurements passed. No live calls.');
