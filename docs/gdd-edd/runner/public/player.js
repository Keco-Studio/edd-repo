const params = new URLSearchParams(location.search);
const token = params.get('session');
const form = document.querySelector('#rating-form');
const message = document.querySelector('#page-message');
const submit = document.querySelector('#submit-rating');
const comment = document.querySelector('#comment');
const anonymousKey = token ? `edd-anonymous:${token}` : '';

function anonymousId() {
  let id = localStorage.getItem(anonymousKey);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(anonymousKey, id); }
  return id;
}

function setMessage(text, kind = '') { message.textContent = text; message.className = `message ${kind}`; }
function selected(name) { return form.querySelector(`input[name="${name}"]:checked`)?.value; }
function updateForm() {
  submit.disabled = !selected('experienceValueScore') || !selected('gameplaySystemsScore') || !selected('contentPresentationScore');
  document.querySelector('#experience-value-reasons').hidden = Number(selected('experienceValueScore')) > 3 || !selected('experienceValueScore');
  document.querySelector('#gameplay-systems-reasons').hidden = Number(selected('gameplaySystemsScore')) > 3 || !selected('gameplaySystemsScore');
  document.querySelector('#content-presentation-reasons').hidden = Number(selected('contentPresentationScore')) > 3 || !selected('contentPresentationScore');
}

async function load() {
  if (!token) return setMessage('评分链接不完整，请向管理员获取完整链接。', 'error');
  try {
    const response = await fetch(`/api/public/sessions/${encodeURIComponent(token)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    document.querySelector('#game-title').textContent = data.session.gameTitle;
    if (data.session.status !== 'open') return setMessage(data.session.status === 'closed' ? '本次评分已结束。' : '评分链接已过期。', 'error');
    form.hidden = false;
    setMessage(`匿名评分 · 当前有效样本 ${data.session.aggregate.count} 份`);
  } catch (error) { setMessage(error.message || '无法读取评分链接。', 'error'); }
}

form.addEventListener('change', updateForm);
comment.addEventListener('input', () => { document.querySelector('#char-count').textContent = `${comment.value.length} / 300`; });
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submit.disabled = true;
  submit.textContent = '提交中...';
  const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
  const body = {
    anonymousId: anonymousId(),
    experienceValueScore: Number(selected('experienceValueScore')),
    gameplaySystemsScore: Number(selected('gameplaySystemsScore')),
    contentPresentationScore: Number(selected('contentPresentationScore')),
    experienceValueReasons: checked('experienceValueReasons'),
    gameplaySystemsReasons: checked('gameplaySystemsReasons'),
    contentPresentationReasons: checked('contentPresentationReasons'),
    comment: comment.value,
  };
  try {
    const response = await fetch(`/api/public/sessions/${encodeURIComponent(token)}/ratings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setMessage(`提交成功。当前有效样本 ${data.count} 份；再次提交会更新本次评分。`, 'success');
  } catch (error) { setMessage(error.message || '提交失败，请稍后重试。', 'error'); }
  submit.textContent = '更新评分';
  updateForm();
});

load();
