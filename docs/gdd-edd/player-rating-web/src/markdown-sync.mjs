import { randomBytes } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';

const REASON_LABELS = {
  unclear_goal: '目标不清晰', repetitive: '玩法重复', weak_feedback: '反馈不足', poor_pacing: '节奏不佳', low_agency: '选择影响弱',
  ui_clarity: 'UI 信息不清', visual_style: '视觉风格不协调', controls: '操作不顺畅', difficulty: '难度不合理', low_engagement: '吸引力不足',
  loop: '循环问题', ui: 'UI 问题', feedback: '反馈不足',
};

const distributionLine = (values) => [1, 2, 3, 4, 5].map((score) => `${score}分 ${values?.[score] || 0} 人`).join(' / ');
const reasonsLine = (items = []) => items.length ? items.slice(0, 5).map(({ reason, count }) => `${REASON_LABELS[reason] || reason} ${count} 次`).join('；') : '无';
const score = (value) => value == null ? '暂无玩家评分' : `${value.toFixed(1)} 分`;
const decimal = (value) => Number.isFinite(value) ? value.toFixed(1) : '暂无';

export function renderRatingSection(session, aggregate, combined, syncedAt = new Date().toISOString()) {
  return `## 玩家评分与合并结果

- 游戏：${session.gameTitle}
- 有效样本：${aggregate.count}
- 数据状态：${combined.provisional ? '暂无玩家评分，不生成合并总分' : '已生成合并结果'}
- 同步时间：${syncedAt}

### 核心玩法（50%）

- 玩家均分：${aggregate.coreAverage == null ? '暂无' : `${aggregate.coreAverage.toFixed(1)} / 5`}
- 分布：${distributionLine(aggregate.coreDistribution)}
- 高频原因：${reasonsLine(aggregate.coreReasons)}
- AI 得分：${session.aiCoreScore.toFixed(1)} / 50（换算 ${decimal(combined.aiCorePercent)} / 100）
- 合并维度分：${score(combined.core)}

### 玩家体验（50%，含 UI 视觉风格与可玩性）

- 玩家均分：${aggregate.experienceAverage == null ? '暂无' : `${aggregate.experienceAverage.toFixed(1)} / 5`}
- 分布：${distributionLine(aggregate.experienceDistribution)}
- 高频原因：${reasonsLine(aggregate.experienceReasons)}
- AI 得分：${session.aiExperienceScore.toFixed(1)} / 50（换算 ${decimal(combined.aiExperiencePercent)} / 100）
- 合并维度分：${score(combined.experience)}

### 合并总分

- 公式：每个维度 = AI 百分制 × 60% + 玩家百分制 × 40%；总分 = 核心玩法 × 50% + 玩家体验 × 50%
- 正式总分：${score(combined.final)}
`;
}

export function replaceRatingSection(markdown, sessionId, section) {
  const start = `<!-- EDD_PLAYER_RATINGS_START:${sessionId} -->`;
  const end = `<!-- EDD_PLAYER_RATINGS_END:${sessionId} -->`;
  const markers = [...markdown.matchAll(/<!-- EDD_PLAYER_RATINGS_(START|END):([^ ]+) -->/g)];
  let open = null;
  for (const marker of markers) {
    if (marker[1] === 'START') {
      if (open) throw new Error('玩家评分标记不完整');
      open = marker[2];
    } else {
      if (!open || open !== marker[2]) throw new Error('玩家评分标记与会话不匹配');
      open = null;
    }
  }
  if (open) throw new Error('玩家评分标记不完整');
  if (markers.filter((marker) => marker[1] === 'START' && marker[2] === sessionId).length > 1) throw new Error('玩家评分标记重复');
  const ownStart = markdown.indexOf(start);
  const ownEnd = markdown.indexOf(end);
  if ((ownStart >= 0) !== (ownEnd >= 0) || ownStart > ownEnd) throw new Error('玩家评分标记不完整');
  const block = `${start}\n${section.trim()}\n${end}`;
  if (ownStart >= 0) return `${markdown.slice(0, ownStart)}${block}${markdown.slice(ownEnd + end.length)}`;
  return `${markdown.trimEnd()}\n\n${block}\n`;
}

export async function syncResultDocument(path, sessionId, section) {
  const markdown = await readFile(path, 'utf8');
  const updated = replaceRatingSection(markdown, sessionId, section);
  const temp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temp, updated, 'utf8');
  await rename(temp, path);
  return updated;
}
