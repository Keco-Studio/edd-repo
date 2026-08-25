import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRating, validateSessionInput, resolveResultDocument } from '../src/validation.mjs';

test('rating accepts fixed values and rejects invalid fields', () => {
  assert.equal(validateRating({ coreScore: 1, experienceScore: 5, coreReasons: ['unclear_goal'], experienceReasons: ['ui_clarity'], comment: 'ok' }).coreScore, 1);
  assert.throws(() => validateRating({ coreScore: 0, experienceScore: 5, coreReasons: [], experienceReasons: [] }), /1.*5/);
  assert.throws(() => validateRating({ coreScore: 3, experienceScore: 3, coreReasons: ['invented'], experienceReasons: [] }), /原因/);
  assert.throws(() => validateRating({ coreScore: 3, experienceScore: 3, coreReasons: [], experienceReasons: [], comment: 'x'.repeat(301) }), /300/);
});

test('session validates limits and result document', () => {
  const value = validateSessionInput({ gameTitle: '流浪猫收养记', resultDocument: 'demo.md', aiCoreScore: 45, aiExperienceScore: 40, expiryDays: 7 });
  assert.equal(value.expiryDays, 7);
  assert.throws(() => validateSessionInput({ ...value, expiryDays: 0 }), /有效期/);
});

test('document resolver only accepts listed markdown basenames', async () => {
  const root = new URL('./fixtures-results/', import.meta.url);
  await assert.rejects(resolveResultDocument('../outside.md', root), /文档/);
  await assert.rejects(resolveResultDocument('file.txt', root), /文档/);
});
