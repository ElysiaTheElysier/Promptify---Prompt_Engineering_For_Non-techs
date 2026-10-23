import assert from 'node:assert/strict';
import {authoredLessonText} from '../src/services/learnerContentLanguageService';
assert.equal(authoredLessonText('Read the brief. / Đọc yêu cầu.','en'),'Read the brief.');
assert.equal(authoredLessonText('Read the brief. / Đọc yêu cầu.','vi'),'Đọc yêu cầu.');
assert.equal(authoredLessonText('Use A / B exactly.','vi'),'Use A / B exactly.');
assert.equal(authoredLessonText('Untranslated source facts','vi'),'Untranslated source facts');
console.log('Authored EN/VI lesson display and unchanged untranslated facts passed.');
