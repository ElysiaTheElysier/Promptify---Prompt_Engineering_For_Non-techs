/** A run grades only the attempt returned by that generation, never a selected/history item. */
export async function generateAndJudge<T extends {saved?: {attempt?: {id?: string}}}>(steps: {
  generate: () => Promise<T>;
  publish: (generated: T, attemptId: string) => Promise<void>;
  judge: (attemptId: string) => Promise<void>;
  refresh: () => Promise<void>;
  phase: (phase: 'generating' | 'judging') => void;
}): Promise<void> {
  steps.phase('generating');
  const generated = await steps.generate();
  const attemptId = generated.saved?.attempt?.id;
  if (!attemptId) throw new Error('Generation did not return a saved attempt. Please retry Run prompt.');
  await steps.publish(generated, attemptId);
  steps.phase('judging');
  try {
    await steps.judge(attemptId);
  } finally {
    await steps.refresh();
  }
}
