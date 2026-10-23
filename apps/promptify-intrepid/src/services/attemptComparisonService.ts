export type AttemptComparisonLabel = 'OLDER' | 'NEWER' | 'SAME';

export function defaultAttemptVersions(attempts: readonly { attempt_number: number }[]) {
  const latest = [...attempts]
    .map(attempt => attempt.attempt_number)
    .sort((left, right) => left - right)
    .slice(-2);

  return {
    baseline: latest[0] ?? 0,
    comparison: latest[1] ?? latest[0] ?? 0,
  };
}

export function attemptComparisonLabels(
  baseline: number,
  comparison: number,
): { baseline: AttemptComparisonLabel; comparison: AttemptComparisonLabel } {
  return {
    baseline: baseline < comparison ? 'OLDER' : baseline > comparison ? 'NEWER' : 'SAME',
    comparison: comparison < baseline ? 'OLDER' : comparison > baseline ? 'NEWER' : 'SAME',
  };
}
