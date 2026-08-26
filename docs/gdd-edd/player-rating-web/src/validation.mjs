import { access, readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXPERIENCE_VALUE_REASONS = ['unclear_goal', 'weak_motivation', 'vague_fantasy', 'low_differentiation', 'unclear_emotion'];
export const GAMEPLAY_SYSTEMS_REASONS = ['weak_loop', 'low_agency', 'weak_feedback', 'poor_difficulty', 'unbalanced_progression'];
export const CONTENT_PRESENTATION_REASONS = ['unclear_structure', 'weak_narrative', 'ui_clarity', 'visual_inconsistency', 'audio_gap'];

const fail = (message) => { throw new Error(message); };
const integer = (value, min, max, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) fail(`${label}必须为 ${min}-${max} 的整数`);
  return number;
};

export function validateRating(input = {}) {
  const experienceValueScore = integer(input.experienceValueScore, 1, 5, '体验价值评分');
  const gameplaySystemsScore = integer(input.gameplaySystemsScore, 1, 5, '玩法与系统评分');
  const contentPresentationScore = integer(input.contentPresentationScore, 1, 5, '内容与呈现评分');
  const validateReasons = (values, allowed) => {
    if (!Array.isArray(values) || values.length > allowed.length || values.some((value) => !allowed.includes(value))) fail('包含未知问题原因');
    return [...new Set(values)];
  };
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (comment.length > 300) fail('反馈最多 300 字');
  return {
    experienceValueScore,
    gameplaySystemsScore,
    contentPresentationScore,
    experienceValueReasons: validateReasons(input.experienceValueReasons || [], EXPERIENCE_VALUE_REASONS),
    gameplaySystemsReasons: validateReasons(input.gameplaySystemsReasons || [], GAMEPLAY_SYSTEMS_REASONS),
    contentPresentationReasons: validateReasons(input.contentPresentationReasons || [], CONTENT_PRESENTATION_REASONS),
    comment,
  };
}

export async function resolveResultDocument(name, root) {
  if (typeof name !== 'string' || basename(name) !== name || !name.endsWith('.md')) fail('结果文档无效');
  const rootPath = root instanceof URL ? fileURLToPath(root) : resolve(root);
  let files;
  try { files = await readdir(rootPath); } catch { fail('结果文档目录不可用'); }
  if (!files.includes(name)) fail('结果文档不在允许列表中');
  const path = resolve(rootPath, name);
  await access(path);
  return path;
}
