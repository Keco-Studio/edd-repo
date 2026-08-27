import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SAFE_EVALUATION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function createRunPaths(runsRoot, evaluationId) {
  if (typeof evaluationId !== 'string' || !SAFE_EVALUATION_ID.test(evaluationId)) {
    throw new Error(`测评 ID 无效：${evaluationId}`);
  }
  const root = join(runsRoot, evaluationId);
  const evidenceRoot = join(root, 'evidence');
  return {
    root,
    progress: join(root, 'progress.md'),
    result: join(root, 'result.md'),
    problem: join(root, 'problem.md'),
    evidenceRoot,
    request: join(evidenceRoot, 'request.json'),
    response: join(evidenceRoot, 'response.json'),
  };
}

export async function writeAtomic(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
  return path;
}

export async function writeJsonEvidence(path, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeAtomic(path, content);
  const readback = await readFile(path, 'utf8');
  if (readback !== content) throw new Error(`JSON 证据回读不一致：${path}`);
  JSON.parse(readback);
  return { path, sha256: sha256(readback) };
}

export async function verifyArtifact(path, evaluationId) {
  const content = await readFile(path, 'utf8');
  if (!content.includes(evaluationId)) throw new Error(`产物缺少测评 ID：${path}`);
  return { path, sha256: sha256(content) };
}
