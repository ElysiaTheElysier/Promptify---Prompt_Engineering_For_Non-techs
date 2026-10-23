import assert from 'node:assert/strict';
import { attemptComparisonLabels, defaultAttemptVersions } from '../src/services/attemptComparisonService';

assert.deepEqual(defaultAttemptVersions([{ attempt_number: 3 }, { attempt_number: 1 }, { attempt_number: 2 }]), {
  baseline: 2,
  comparison: 3,
});
assert.deepEqual(defaultAttemptVersions([{ attempt_number: 4 }, { attempt_number: 3 }]), {
  baseline: 3,
  comparison: 4,
});
assert.deepEqual(defaultAttemptVersions([{ attempt_number: 7 }]), {
  baseline: 7,
  comparison: 7,
});
assert.deepEqual(defaultAttemptVersions([]), { baseline: 0, comparison: 0 });
assert.deepEqual(attemptComparisonLabels(3, 5), { baseline: 'OLDER', comparison: 'NEWER' });
assert.deepEqual(attemptComparisonLabels(5, 3), { baseline: 'NEWER', comparison: 'OLDER' });
assert.deepEqual(attemptComparisonLabels(5, 5), { baseline: 'SAME', comparison: 'SAME' });

console.log('Attempt comparison ordering and relative labels PASS.');
