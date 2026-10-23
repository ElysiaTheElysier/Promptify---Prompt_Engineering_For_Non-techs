import assert from 'node:assert/strict';
import {
  buildLessonUrl,
  readLessonId,
  resolveAuthorizedLessonId,
} from '../src/services/lessonUrlState';

const lessonA = '11111111-1111-4111-8111-111111111111';
const lessonB = '22222222-2222-4222-8222-222222222222';
const otherCourseLesson = '99999999-9999-4999-8999-999999999999';

assert.equal(readLessonId(`?lesson=${lessonB}`), lessonB, 'reads stable lesson id from URL');
assert.equal(
  resolveAuthorizedLessonId(lessonB, [lessonA, lessonB], lessonA),
  lessonB,
  'restores an authorized lesson',
);
assert.equal(
  resolveAuthorizedLessonId(otherCourseLesson, [lessonA, lessonB]),
  lessonA,
  'rejects a lesson outside the authorized course and falls back safely',
);
assert.equal(
  resolveAuthorizedLessonId('missing', [lessonA, lessonB], lessonB),
  lessonB,
  'uses the current authorized lesson for an invalid URL when available',
);
assert.equal(
  buildLessonUrl(`https://promptify.test/app?tab=learn#work`, lessonB),
  `/app?tab=learn&lesson=${lessonB}#work`,
  'updates lesson without dropping other URL state',
);
assert.equal(
  buildLessonUrl(`https://promptify.test/app?lesson=${lessonA}&tab=learn`, null),
  '/app?tab=learn',
  'can remove lesson state for browser navigation',
);

console.log('Lesson URL navigation verification passed.');
