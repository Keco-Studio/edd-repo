import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('../result/评价模板-v5.md', root), 'utf8');
const sourceFiles = ['src/scoring.mjs', 'src/server.mjs', 'src/ai-evaluator.mjs', 'public/index.html'];
const sources = await Promise.all(sourceFiles.map((path) => readFile(new URL(path, root), 'utf8')));

assert.match(template, /核心玩法 50%/);
assert.match(template, /玩家体验 50%/);
assert.match(template, /AI 60%/);
assert.match(template, /玩家 40%/);
assert.match(template, /自主决定/);
assert.doesNotMatch(template, /最低玩家样本|至少收集 5|固定扣分档位.*-[0-9]+/);
assert.doesNotMatch(sources.join('\n'), /admin-test-token|ngrok_[A-Za-z0-9]+/);
console.log('静态检查通过：双维度、60/40 合并、无人数门槛、无内嵌密钥。');
