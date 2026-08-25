import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceRatingSection, renderRatingSection } from '../src/markdown-sync.mjs';

const session = { id: 'abc', gameTitle: '流浪猫收养记', aiCoreScore: 45, aiExperienceScore: 40 };
const aggregate = { count: 4, coreAverage: 4.2, experienceAverage: 3.8, coreDistribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 }, experienceDistribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 1 }, coreReasons: [{ reason: 'feedback', count: 2 }], experienceReasons: [] };

test('renders distributions and provisional state without comments', () => {
  const section = renderRatingSection(session, aggregate, { provisional: true, final: null }, '2026-08-25T00:00:00.000Z');
  assert.match(section, /暂无玩家评分|正式合并总分/);
  assert.match(section, /1分 0.*5分 2/);
  assert.doesNotMatch(section, /玩家自由文本/);
});

test('appends then replaces only matching marker block', () => {
  const first = replaceRatingSection('# Title\n\nTail', 'abc', 'ONE');
  assert.match(first, /Title[\s\S]*Tail[\s\S]*ONE/);
  const second = replaceRatingSection(first, 'abc', 'TWO');
  assert.doesNotMatch(second, /ONE/);
  assert.match(second, /Title[\s\S]*Tail[\s\S]*TWO/);
});

test('rejects mismatched or incomplete markers', () => {
  assert.throws(() => replaceRatingSection('<!-- EDD_PLAYER_RATINGS_START:abc -->', 'abc', 'x'), /标记/);
  assert.throws(() => replaceRatingSection('<!-- EDD_PLAYER_RATINGS_START:other -->\nx\n<!-- EDD_PLAYER_RATINGS_END:abc -->', 'abc', 'x'), /标记/);
});

test('preserves complete blocks from other sessions', () => {
  const existing = '# Result\n\n<!-- EDD_PLAYER_RATINGS_START:old -->\nOLD\n<!-- EDD_PLAYER_RATINGS_END:old -->\n';
  const updated = replaceRatingSection(existing, 'new', 'NEW');
  assert.match(updated, /START:old[\s\S]*OLD[\s\S]*END:old/);
  assert.match(updated, /START:new[\s\S]*NEW[\s\S]*END:new/);
});
