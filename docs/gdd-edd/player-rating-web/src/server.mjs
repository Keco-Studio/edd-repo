import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { access, readFile } from 'node:fs/promises';
import { aggregateRatings, combineScores } from './scoring.mjs';
import { renderProgressRatingSection, renderRatingSection, syncProgressDocument, syncResultDocument } from './markdown-sync.mjs';
import { createRateLimiter } from './rate-limit.mjs';
import { JsonStore, hashRespondent } from './store.mjs';
import { resolveResultDocument, validateRating } from './validation.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_RESULT_ROOT = fileURLToPath(new URL('../../result/', import.meta.url));
const DEFAULT_PROGRESS_ROOT = fileURLToPath(new URL('../../progress/', import.meta.url));
const DEFAULT_PROBLEM_ROOT = fileURLToPath(new URL('../../problem/', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

function send(response, status, payload, extraHeaders = {}) {
  const body = payload == null ? '' : JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'",
    ...extraHeaders,
  });
  response.end(body);
}

async function bodyJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw Object.assign(new Error('请求内容过大'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON 格式无效'), { status: 400 }); }
}

function statusOf(session) {
  if (session.status === 'closed') return 'closed';
  if (Date.parse(session.expiresAt) <= Date.now()) return 'expired';
  return 'open';
}

const usesCurrentRatingSchema = (session) => session.ratingSchemaVersion === 2;

export async function createRatingServer(options = {}) {
  const host = options.host || process.env.EDD_HOST || '0.0.0.0';
  const port = Number(options.port ?? process.env.EDD_PORT ?? 4178);
  const resultRoot = options.resultRoot || process.env.EDD_RESULT_ROOT || DEFAULT_RESULT_ROOT;
  const progressRoot = options.progressRoot || process.env.EDD_PROGRESS_ROOT || DEFAULT_PROGRESS_ROOT;
  const problemRoot = options.problemRoot || process.env.EDD_PROBLEM_ROOT || DEFAULT_PROBLEM_ROOT;
  const publicRoot = options.publicRoot instanceof URL ? fileURLToPath(options.publicRoot) : (options.publicRoot || join(PROJECT_ROOT, 'public'));
  const dataFile = options.dataFile || process.env.EDD_DATA_FILE || join(PROJECT_ROOT, 'data', 'store.json');
  const store = options.store || await new JsonStore(dataFile).init();
  const limiter = createRateLimiter({ limit: options.rateLimit || 30 });

  const summary = (session, includePrivate = false) => {
    const aggregate = aggregateRatings(store.getRatings(session.id));
    const combined = combineScores({
      aiExperienceValueScore: session.aiExperienceValueScore,
      aiGameplaySystemsScore: session.aiGameplaySystemsScore,
      aiContentPresentationScore: session.aiContentPresentationScore,
      aggregate,
    });
    const publicFields = {
      id: session.id, gameTitle: session.gameTitle, status: statusOf(session), expiresAt: session.expiresAt, aggregate,
      combined: { provisional: combined.provisional, experienceValue: combined.experienceValue, gameplaySystems: combined.gameplaySystems, contentPresentation: combined.contentPresentation, final: combined.final },
    };
    return includePrivate ? { ...session, ...publicFields, aggregate, combined } : publicFields;
  };

  async function sync(session) {
    try {
      const aggregate = aggregateRatings(store.getRatings(session.id));
      const combined = combineScores({
        aiExperienceValueScore: session.aiExperienceValueScore,
        aiGameplaySystemsScore: session.aiGameplaySystemsScore,
        aiContentPresentationScore: session.aiContentPresentationScore,
        aggregate,
      });
      const syncedAt = new Date().toISOString();
      const resultPath = await resolveResultDocument(session.resultDocument, resultRoot);
      const progressPath = await resolveResultDocument(session.progressDocument, progressRoot);
      const resultSection = renderRatingSection(session, aggregate, combined, syncedAt);
      const progressSection = renderProgressRatingSection(session, aggregate, combined, syncedAt);
      await syncResultDocument(resultPath, session.id, resultSection, aggregate, combined);
      await syncProgressDocument(progressPath, session.id, progressSection);
      if (session.lastSyncError) await store.setSyncError(session.id, null);
      return { aggregate, combined };
    } catch (error) {
      await store.setSyncError(session.id, error.message).catch(() => {});
      throw error;
    }
  }

  async function createSessionForDocuments(input) {
    if (!/^[\p{L}\p{N}._-]+$/u.test(input.evaluationId || '')) throw new Error('执行标识无效');
    const names = {
      progress: `${input.evaluationId}-Progression.md`,
      problem: `${input.evaluationId}-问题记录.md`,
      result: `${input.evaluationId}-评价结果.md`,
    };
    await Promise.all([
      access(join(progressRoot, names.progress)),
      access(join(problemRoot, names.problem)),
      access(join(resultRoot, names.result)),
    ]);
    const score = (value, maximum, label) => {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0 || number > maximum) throw new Error(`${label}无效`);
      return number;
    };
    const expiryDays = Number(input.expiryDays || 7);
    const session = await store.createSession({
      ratingSchemaVersion: 2,
      gameTitle: input.gameTitle,
      resultDocument: names.result,
      aiExperienceValueScore: score(input.aiExperienceValueScore, 30, 'AI 体验价值得分'),
      aiGameplaySystemsScore: score(input.aiGameplaySystemsScore, 40, 'AI 玩法与系统得分'),
      aiContentPresentationScore: score(input.aiContentPresentationScore, 30, 'AI 内容与呈现得分'),
      expiryDays,
      evaluationId: input.evaluationId,
      progressDocument: names.progress,
      problemDocument: names.problem,
      expiresAt: new Date(Date.now() + expiryDays * 86_400_000).toISOString(),
    });
    await sync(session);
    return { session: summary(session, true), documents: names };
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const ip = request.socket.remoteAddress || 'unknown';
    try {
      if (url.pathname.startsWith('/api/')) {
        if (!limiter.allow(`${ip}:${url.pathname.split('/').slice(0, 5).join('/')}`)) return send(response, 429, { error: '请求过于频繁，请稍后再试' });

        const publicRead = url.pathname.match(/^\/api\/public\/sessions\/([^/]+)$/);
        if (request.method === 'GET' && publicRead) {
          const session = store.getSessionByToken(publicRead[1]);
          if (!session) return send(response, 404, { error: '评分链接不存在' });
          if (!usesCurrentRatingSchema(session)) return send(response, 410, { error: '旧评分链接不兼容，请创建新的三维评价' });
          return send(response, 200, { session: summary(session) });
        }
        const publicRating = url.pathname.match(/^\/api\/public\/sessions\/([^/]+)\/ratings$/);
        if (request.method === 'POST' && publicRating) {
          const session = store.getSessionByToken(publicRating[1]);
          if (!session) return send(response, 404, { error: '评分链接不存在' });
          if (!usesCurrentRatingSchema(session)) return send(response, 410, { error: '旧评分链接不兼容，请创建新的三维评价' });
          if (statusOf(session) !== 'open') return send(response, 409, { error: statusOf(session) === 'closed' ? '评分会话已关闭' : '评分会话已过期' });
          const input = await bodyJson(request);
          if (typeof input.anonymousId !== 'string' || input.anonymousId.length < 12 || input.anonymousId.length > 128) throw Object.assign(new Error('匿名标识无效'), { status: 400 });
          const rating = validateRating(input);
          await store.upsertRating(session.id, hashRespondent(session.id, input.anonymousId), rating);
          const result = await sync(session);
          return send(response, 200, { ok: true, count: result.aggregate.count, updated: true });
        }
        return send(response, 404, { error: '接口不存在' });
      }

      const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const safe = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = join(publicRoot, safe);
      let content;
      try { content = await readFile(filePath); }
      catch { return send(response, 404, { error: '页面不存在' }); }
      const type = MIME[extname(filePath)] || 'application/octet-stream';
      response.writeHead(200, { 'content-type': type, 'content-length': content.length, 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'" });
      response.end(content);
    } catch (error) {
      const validation = /必须|无效|未知|最多|不在允许/.test(error.message);
      send(response, error.status || (validation ? 400 : 500), { error: error.message || '服务错误' });
    }
  });

  const app = {
    server, store, baseUrl: null, createSessionForDocuments,
    async listen() {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
      const address = server.address();
      const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host;
      app.baseUrl = `http://${displayHost}:${address.port}`;
      return app;
    },
    close() { return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); },
  };
  return app;
}

async function startCli() {
  const app = await createRatingServer();
  await app.listen();
  console.log(`玩家评分：${app.baseUrl}/`);
  const port = app.server.address().port;
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses || []) if (address.family === 'IPv4' && !address.internal) console.log(`局域网：http://${address.address}:${port}/`);
  }
  let tunnel;
  if (process.argv.includes('--share')) {
    try {
      const ngrok = await import('@ngrok/ngrok');
      tunnel = await ngrok.forward({ addr: port, authtoken_from_env: true });
      console.log(`公网评分入口：${tunnel.url()}/`);
      console.log('创建会话后，将公开令牌拼接为 ?session=<令牌>');
    } catch (error) {
      console.error(`无法创建公网链接：${error.message}`);
      await app.close();
      process.exitCode = 1;
      return;
    }
  }
  const shutdown = async () => { if (tunnel) await tunnel.close(); await app.close(); process.exit(0); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startCli();
