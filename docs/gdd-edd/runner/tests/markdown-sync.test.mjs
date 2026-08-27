import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceRatingSection, renderProgressRatingSection, renderRatingSection } from '../src/markdown-sync.mjs';

const session = { id: 'abc', gameTitle: '流浪猫收养记', resultDocument: 'evaluation-评价结果.md', aiExperienceValueScore: 24, aiGameplaySystemsScore: 32, aiContentPresentationScore: 27 };
const aggregate = {
  count: 4,
  experienceValueAverage: 4.2, gameplaySystemsAverage: 3.8, contentPresentationAverage: 4.5,
  experienceValueDistribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 }, gameplaySystemsDistribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 1 }, contentPresentationDistribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 2 },
  experienceValueReasons: [{ reason: 'unclear_goal', count: 2 }], gameplaySystemsReasons: [], contentPresentationReasons: [],
};

test('renders distributions and provisional state without comments', () => {
  const section = renderRatingSection(session, aggregate, { provisional: true, final: null }, '2026-08-25T00:00:00.000Z');
  assert.match(section, /暂无玩家评分|正式合并总分/);
  assert.match(section, /1分 0.*5分 2/);
  assert.doesNotMatch(section, /玩家自由文本/);
  assert.doesNotMatch(section, /结论|通过|不通过/);
});

test('renders a concise player status for Progression', () => {
  const section = renderProgressRatingSection(session, aggregate, { experienceValue: 83.4, gameplaySystems: 78.2, contentPresentation: 88, final: 82.5 }, '2026-08-25T00:00:00.000Z');
  assert.match(section, /## 玩家评分同步/);
  assert.match(section, /有效样本：4/);
  assert.match(section, /Result 已更新/);
  assert.match(section, /Result/);
  assert.doesNotMatch(section, /83\.4|78\.2|88\.0|82\.5|最终|合并|AI 体验价值/);
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
