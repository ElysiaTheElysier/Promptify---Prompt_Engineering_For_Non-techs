import assert from 'node:assert/strict';
import generate from '../api/generate';
import evaluate from '../api/evaluate';
const logs: string[] = [];
const original = console.error;
console.error = (...args: unknown[]) => logs.push(args.map(String).join(' '));
function response() {
  return { code: 0, body: undefined as any, setHeader() {}, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
}
try {
  for (const handler of [generate, evaluate]) {
    const anon = response();
    await handler({ method: 'POST', headers: {}, body: {} }, anon);
    assert.equal(anon.code, 401);
    const failed = response();
    await handler({ method: 'POST', headers: {}, get body() { throw new Error('SYNTHETIC_PRIVATE_DETAIL'); } }, failed);
    assert.equal(failed.code, 500);
    assert.ok(!JSON.stringify(failed.body).includes('SYNTHETIC_PRIVATE_DETAIL'));
  }
  assert.equal(logs.length, 4);
  for (const line of logs) {
    assert.ok(!line.includes('SYNTHETIC_PRIVATE_DETAIL'));
    assert.deepEqual(Object.keys(JSON.parse(line)).sort(), ['event', 'route', 'status']);
  }
} finally { console.error = original; }
console.log('Compatibility HTTP PASS: anonymous rejection and private exception redaction; no DB/provider calls.');
