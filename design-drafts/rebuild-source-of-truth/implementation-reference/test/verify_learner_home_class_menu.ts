import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile('src/App.tsx', 'utf8');
const homeSource = await readFile('src/components/dashboard/LearnerHome.tsx', 'utf8');
const pathSource = await readFile('src/components/dashboard/LearnerDashboard.tsx', 'utf8');

assert.match(appSource, /currentView === 'dashboard'[\s\S]*?<LearnerHome/);
assert.match(appSource, /currentView === 'learning_path'[\s\S]*?<LearnerDashboard/);
assert.doesNotMatch(appSource, /currentView === 'dashboard' \|\| currentView === 'learning_path'/);
assert.match(homeSource, /Xin chào,/);
assert.match(homeSource, /Lớp học của bạn/);
assert.match(homeSource, /cohorts\.map/);
assert.match(homeSource, /Xem lộ trình lớp này/);
assert.match(pathSource, /Lộ trình \{totalCount\} bài học/);
assert.doesNotMatch(pathSource, /Xin chào,/);

console.log('Learner home class menu and class-specific learning path are separated.');
