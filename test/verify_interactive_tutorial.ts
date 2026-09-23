import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = await readFile('src/services/tutorialConfig.ts', 'utf8');
const walkthrough = await readFile('src/components/common/GuidedWalkthrough.tsx', 'utf8');
const brief = await readFile('src/components/lesson/LessonBriefPanel.tsx', 'utf8');
const hybrid = await readFile('src/components/hybrid/HybridView.tsx', 'utf8');
const coach = await readFile('src/components/common/AiCoach.tsx', 'utf8');
const compare = await readFile('src/components/common/ABCompareModal.tsx', 'utf8');
const save = await readFile('src/components/common/SavePromptModal.tsx', 'utf8');

for (const action of ['show-data', 'show-prompt', 'show-run', 'show-output', 'show-coach', 'show-compare', 'show-library']) {
  assert.match(config, new RegExp(`demoAction: '${action}'`));
}

assert.match(walkthrough, /promptify:tutorial-step/);
assert.match(walkthrough, /locateTarget\(attempt \+ 1\)/);
assert.match(brief, /data-tour="tour-data-trigger"/);
assert.match(brief, /DỮ LIỆU MINH HỌA — chỉ dùng trong hướng dẫn/);
assert.match(hybrid, /tutorialSnapshotRef/);
assert.match(hybrid, /simulatedBaselineOutput/);
assert.match(hybrid, /setIsABModalOpen\(true\)/);
assert.match(hybrid, /setIsSaveModalOpen\(true\)/);
assert.match(coach, /data-tour="tour-coach-panel"/);
assert.match(compare, /data-tour="tour-compare-demo"/);
assert.match(save, /data-tour="tour-library-demo"/);

console.log('Interactive tutorial targets, mock states, and cleanup snapshot are wired.');
