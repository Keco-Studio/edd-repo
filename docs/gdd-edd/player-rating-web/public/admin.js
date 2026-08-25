const token = new URLSearchParams(location.hash.slice(1)).get('token');
const message = document.querySelector('#admin-message');
const form = document.querySelector('#session-form');
const list = document.querySelector('#session-list');
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

function setMessage(text, kind = '') { message.textContent = text; message.className = `message ${kind}`; }
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

async function refresh() {
  if (!token) return setMessage('管理链接缺少令牌，请使用服务启动时打印的完整管理地址。', 'error');
  try {
    const sessions = await api('/api/admin/sessions');
    form.hidden = false;
    list.innerHTML = sessions.sessions.length ? sessions.sessions.map(renderSession).join('') : '<p class="empty">尚未生成评分链接。</p>';
    setMessage('已连接。管理员令牌只保留在当前地址的 # 后，不会发送给静态页面服务器。', 'success');
  } catch (error) { setMessage(error.message, 'error'); }
}

function renderSession(session) {
  const publicUrl = `${location.origin}/?session=${encodeURIComponent(session.publicToken)}`;
  const score = session.combined.final == null ? '暂无玩家评分' : `${session.combined.final.toFixed(1)} 分`;
  return `<article class="session-item ${session.status}">
    <div class="session-title"><h3>${escapeHtml(session.gameTitle)}</h3><strong>${session.status === 'open' ? '收集中' : '已结束'}</strong></div>
    <p>${escapeHtml(session.resultDocument)} · ${session.aggregate.count} 份 · 合并总分 ${score}</p>
    <div class="session-actions"><button type="button" data-copy="${escapeHtml(publicUrl)}">复制公开链接</button><button type="button" class="secondary" data-sync="${session.id}">重新写回</button>${session.status === 'open' ? `<button type="button" class="secondary" data-close="${session.id}">结束评分</button>` : ''}</div>
  </article>`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(form));
    for (const key of ['aiCoreScore', 'aiExperienceScore', 'expiryDays']) values[key] = Number(values[key]);
    values.issues = [...document.querySelectorAll('.issue-row')].map((row) => Object.fromEntries([...row.querySelectorAll('[data-field]')].map((input) => [input.dataset.field, input.dataset.field === 'deduction' ? Number(input.value) : input.value])));
    const data = await api('/api/admin/workflows', { method: 'POST', body: JSON.stringify(values) });
    const url = `${location.origin}/?session=${encodeURIComponent(data.session.publicToken)}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setMessage(`已生成 ${data.documents.progress}、${data.documents.problem}、${data.documents.result}；玩家链接已复制：${url}`, 'success');
    await refresh();
  } catch (error) { setMessage(error.message, 'error'); }
  button.disabled = false;
});

list.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  try {
    if (button.dataset.copy) { await navigator.clipboard.writeText(button.dataset.copy); return setMessage('公开链接已复制。', 'success'); }
    const id = button.dataset.close || button.dataset.sync;
    const action = button.dataset.close ? 'close' : 'sync';
    await api(`/api/admin/sessions/${id}/${action}`, { method: 'POST', body: '{}' });
    setMessage(action === 'close' ? '评分已结束并写回文档。' : '结果已重新写回文档。', 'success');
    await refresh();
  } catch (error) { setMessage(error.message, 'error'); }
});
document.querySelector('#refresh').addEventListener('click', refresh);
document.querySelector('#add-issue').addEventListener('click', () => document.querySelector('#issue-list').append(document.querySelector('#issue-template').content.cloneNode(true)));
document.querySelector('#issue-list').addEventListener('click', (event) => event.target.closest('.remove-issue')?.closest('.issue-row')?.remove());
refresh();
