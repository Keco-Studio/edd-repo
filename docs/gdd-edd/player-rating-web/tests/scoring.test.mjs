import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRatings, combineScores, distribution } from '../src/scoring.mjs';

test('distribution always contains all five labels', () => {
  assert.deepEqual(distribution([1, 1, 3, 5]), { 1: 2, 2: 0, 3: 1, 4: 0, 5: 1 });
});

test('aggregates averages, distributions, and reasons', () => {
  const result = aggregateRatings([
    { coreScore: 4, experienceScore: 3, coreReasons: ['loop'], experienceReasons: ['ui'] },
    { coreScore: 5, experienceScore: 4, coreReasons: ['loop'], experienceReasons: [] },
  ]);
  assert.equal(result.count, 2);
  assert.equal(result.coreAverage, 4.5);
  assert.equal(result.experienceAverage, 3.5);
  assert.deepEqual(result.coreReasons, [{ reason: 'loop', count: 2 }]);
});

test('combines AI 60%, players 40%, and dimensions equally from the first response', () => {
  const aggregate = { count: 1, coreAverage: 4, experienceAverage: 3 };
  const result = combineScores({ aiCoreScore: 40, aiExperienceScore: 45, aggregate });
  assert.deepEqual(result, {
    provisional: false,
    aiCorePercent: 80,
    aiExperiencePercent: 90,
    playerCorePercent: 80,
    playerExperiencePercent: 60,
    core: 80,
    experience: 78,
    final: 79,
  });
});

test('clamps AI scores and withholds final only when there are no player ratings', () => {
  const result = combineScores({
    aiCoreScore: 60,
    aiExperienceScore: -3,
    aggregate: { count: 0, coreAverage: null, experienceAverage: null },
  });
  assert.equal(result.aiCorePercent, 100);
  assert.equal(result.aiExperiencePercent, 0);
  assert.equal(result.provisional, true);
  assert.equal(result.final, null);
});
