import { randomBytes } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';

const REASON_LABELS = {
  unclear_goal: '体验目标不清', weak_motivation: '玩家动机不足', vague_fantasy: '核心幻想模糊', low_differentiation: '差异化不足', unclear_emotion: '预期情绪不清',
  weak_loop: '核心循环薄弱', low_agency: '选择影响弱', weak_feedback: '反馈不足', poor_difficulty: '难度不合理', unbalanced_progression: '成长或平衡有问题',
  unclear_structure: '内容结构不清', weak_narrative: '叙事支撑不足', ui_clarity: 'UI 信息不清', visual_inconsistency: '视觉风格不一致', audio_gap: '音频设计不足',
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

### 体验价值（30%）

- 玩家均分：${aggregate.experienceValueAverage == null ? '暂无' : `${aggregate.experienceValueAverage.toFixed(1)} / 5`}
- 分布：${distributionLine(aggregate.experienceValueDistribution)}
- 高频原因：${reasonsLine(aggregate.experienceValueReasons)}
- AI 得分：${session.aiExperienceValueScore.toFixed(1)} / 30（换算 ${decimal(combined.aiExperienceValuePercent)} / 100）
- 合并维度分：${score(combined.experienceValue)}

### 玩法与系统（40%）

- 玩家均分：${aggregate.gameplaySystemsAverage == null ? '暂无' : `${aggregate.gameplaySystemsAverage.toFixed(1)} / 5`}
- 分布：${distributionLine(aggregate.gameplaySystemsDistribution)}
- 高频原因：${reasonsLine(aggregate.gameplaySystemsReasons)}
- AI 得分：${session.aiGameplaySystemsScore.toFixed(1)} / 40（换算 ${decimal(combined.aiGameplaySystemsPercent)} / 100）
- 合并维度分：${score(combined.gameplaySystems)}

### 内容与呈现（30%）

- 玩家均分：${aggregate.contentPresentationAverage == null ? '暂无' : `${aggregate.contentPresentationAverage.toFixed(1)} / 5`}
- 分布：${distributionLine(aggregate.contentPresentationDistribution)}
- 高频原因：${reasonsLine(aggregate.contentPresentationReasons)}
- AI 得分：${session.aiContentPresentationScore.toFixed(1)} / 30（换算 ${decimal(combined.aiContentPresentationPercent)} / 100）
- 合并维度分：${score(combined.contentPresentation)}

### 合并总分

- 公式：每个维度 = AI 百分制 × 70% + 玩家百分制 × 30%；总分 = 体验价值 × 30% + 玩法与系统 × 40% + 内容与呈现 × 30%
- 正式总分：${score(combined.final)}
`;
}

export function renderProgressRatingSection(session, aggregate, combined, syncedAt = new Date().toISOString()) {
  return `## 玩家评分同步

- 同步时间：${syncedAt}
- 有效样本：${aggregate.count}
- 状态：Result 已更新
- Result：../result/${session.resultDocument}
`;
}

export function updateResultSummary(markdown, aggregate, combined) {
  const values = {
    玩家有效样本: String(aggregate.count),
    最终体验价值: combined.experienceValue == null ? '暂无玩家评分' : `${combined.experienceValue.toFixed(1)}/100`,
    最终玩法与系统: combined.gameplaySystems == null ? '暂无玩家评分' : `${combined.gameplaySystems.toFixed(1)}/100`,
    最终内容与呈现: combined.contentPresentation == null ? '暂无玩家评分' : `${combined.contentPresentation.toFixed(1)}/100`,
    最终总分: combined.final == null ? '暂无玩家评分' : `${combined.final.toFixed(1)}/100`,
  };
  let updated = markdown;
  for (const [label, value] of Object.entries(values)) {
    updated = updated.replace(new RegExp(`^- ${label}：.*$`, 'm'), `- ${label}：${value}`);
  }
  return updated;
}

function replaceManagedSection(markdown, sessionId, section, kind, label) {
  const start = `<!-- EDD_PLAYER_${kind}_START:${sessionId} -->`;
  const end = `<!-- EDD_PLAYER_${kind}_END:${sessionId} -->`;
  const markers = [...markdown.matchAll(new RegExp(`<!-- EDD_PLAYER_${kind}_(START|END):([^ ]+) -->`, 'g'))];
  let open = null;
  for (const marker of markers) {
    if (marker[1] === 'START') {
      if (open) throw new Error(`${label}标记不完整`);
      open = marker[2];
    } else {
      if (!open || open !== marker[2]) throw new Error(`${label}标记与会话不匹配`);
      open = null;
    }
  }
  if (open) throw new Error(`${label}标记不完整`);
  if (markers.filter((marker) => marker[1] === 'START' && marker[2] === sessionId).length > 1) throw new Error(`${label}标记重复`);
  const ownStart = markdown.indexOf(start);
  const ownEnd = markdown.indexOf(end);
  if ((ownStart >= 0) !== (ownEnd >= 0) || ownStart > ownEnd) throw new Error(`${label}标记不完整`);
  const block = `${start}\n${section.trim()}\n${end}`;
  if (ownStart >= 0) return `${markdown.slice(0, ownStart)}${block}${markdown.slice(ownEnd + end.length)}`;
  return `${markdown.trimEnd()}\n\n${block}\n`;
}

export function replaceRatingSection(markdown, sessionId, section) {
  return replaceManagedSection(markdown, sessionId, section, 'RATINGS', '玩家评分');
}

export function replaceProgressRatingSection(markdown, sessionId, section) {
  return replaceManagedSection(markdown, sessionId, section, 'PROGRESS', '玩家评分同步');
}

async function writeMarkdown(path, updated) {
  const temp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temp, updated, 'utf8');
  await rename(temp, path);
  return updated;
}

export async function syncResultDocument(path, sessionId, section, aggregate, combined) {
  const markdown = await readFile(path, 'utf8');
  const withSection = replaceRatingSection(markdown, sessionId, section);
  return writeMarkdown(path, aggregate && combined ? updateResultSummary(withSection, aggregate, combined) : withSection);
}

export async function syncProgressDocument(path, sessionId, section) {
  const markdown = await readFile(path, 'utf8');
  return writeMarkdown(path, replaceProgressRatingSection(markdown, sessionId, section));
}
