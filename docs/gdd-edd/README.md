# GDD EDD 评价流程

当前流程从固定 Eval Case 读取 GDD、Prompt、Rubric 和 Result Template。AI 只返回结构化评价 JSON，Node 生成三份文档，再通过现有玩家 Web 收集人工两维度评分。最终只呈现数值，不进行基线比较或流程判断。

## 评分维度

1. **核心玩法**：AI `0-50`，人工 `1-5`。
2. **玩家体验**：AI `0-50`，人工 `1-5`，包含 UI 视觉风格和预期可玩性。

每个维度按 AI 60%、人工 40% 合并，两个维度各占最终总分 50%。

## 使用

```bash
cd docs/gdd-edd/player-rating-web
npm install
npm run eval
```

默认执行 Gold Case `paws-patience-r97`。显式选择或查看案例：

```bash
npm run eval -- --case paws-patience-r97
npm run eval -- --list-cases
```

默认使用 Claude。显式使用 Codex：

```bash
npm run eval -- --provider codex
```

需要显式锁定模型时：

```bash
npm run eval -- --provider codex --model <model-id>
```

终端输出示例：

```text
核心玩法：24.0/50
玩家体验：30.0/50
总分：54.0/100
人工评分：http://127.0.0.1:<port>/?session=<token>
```

## 数据流

```text
Eval Case 配置
  -> 固定 GDD + Prompt + Rubric
  -> AI 只返回结构化评分 JSON
  -> Node 校验 JSON 并生成 Progression / Problem / Result
  -> Node 启动玩家 Web
  -> 人工评价两个维度
  -> Node 计算 AI 60% + 人工 40%
  -> 写回 Result 和 Progression 的数值
```

## 三份文档

- `progress/<执行标识>-Progression.md`：真实 Prompt、资产哈希、Provider 事件、耗时和结构化输出。
- `problem/<执行标识>-问题记录.md`：完整的有证据问题、影响和最小建议。
- `result/<执行标识>-评价结果.md`：两个 AI 分数及依据、问题摘要、人工分数和合并分数。

重复评价同一 GDD 修订时使用 `run2`、`run3`，不覆盖已有文档。

## Eval Cases

每个案例保存在 `eval-cases/<case-id>.json`，固定 GDD、Prompt、Rubric、Result Template、来源版本和输出文件名前缀。案例配置不保存运行分数；每次运行的 AI、人工和合并分数仍由三份文档与玩家评分数据记录。

Rubric 只定义两个总维度和共享的 `0-50` 客观分档。核心循环、UI、节奏等只是取证检查项，不单独打分。

## 证据边界

GDD 只能证明设计是否清楚定义核心玩法和预期玩家体验。没有实际构建或运行证据时，不得断言游戏已经可玩、视觉效果已经落地或运行质量已经达到目标。
