# GDD EDD 评价流程

当前单次流程从固定 Eval Case 读取 GDD、Prompt、Rubric 和 Result Template。AI 只返回结构化评价 JSON，Node 生成三份文档，再通过玩家 Web 收集人工三维评分。单次流程只呈现数值，不自动进行基线比较或流程判断。

单次人工评价流程之外，项目提供独立的 AI-only 基线采样与差值比较。它不影响三份文档或玩家评分，也不输出通过、退化或阻断结论。

## 评分维度

1. **体验价值**：AI `0-30`，人工 `1-5`。
2. **玩法与系统**：AI `0-40`，人工 `1-5`。
3. **内容与呈现**：AI `0-30`，人工 `1-5`。

每个维度按 AI 70%、人工 30% 合并，三个维度按 30%、40%、30% 计入最终总分。

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
体验价值：22.0/30
玩法与系统：30.0/40
内容与呈现：20.0/30
总分：72.0/100
人工评分：http://127.0.0.1:<port>/?session=<token>
```

## AI 基线与比较

建立默认三次采样基线：

```bash
npm run eval:baseline -- --case paws-patience-r97 --runs 3
```

比较当前三次采样与基线：

```bash
npm run eval:compare -- --case paws-patience-r97 --runs 3
```

输出包含三个维度、总分的均值、样本标准差和当前减基线的差值。基线存放于 `baselines/<case-id>/`。同一 GDD 修订的 Prompt、Rubric、Schema 或实际模型发生变化时会列为配置变化；GDD 内容变化时必须建立新的 Eval Case 和基线。

这些命令只调用 AI，不生成 Progression、Problem、Result 或人工评分会话，也不判断 PASS/FAIL。当前只有一个 Case，因此只能观察 `paws-patience-r97` 上的评分波动。

## 数据流

```text
Eval Case 配置
  -> 固定 GDD + Prompt + Rubric
  -> AI 只返回结构化评分 JSON
  -> Node 校验 JSON 并生成 Progression / Problem / Result
  -> Node 启动玩家 Web
  -> 人工评价三个维度
  -> Node 每维计算 AI 70% + 人工 30%
  -> Node 按 30% + 40% + 30% 计算总分
  -> 分数写回 Result，Progression 只记录同步事实
```

## 三份文档

- `progress/<执行标识>-Progression.md`：真实 Prompt、资产哈希、Node/Provider 执行事实、证据路径和回读状态，不保存评分。
- `problem/<执行标识>-问题记录.md`：完整的有证据问题、影响和最小建议。
- `result/<执行标识>-评价结果.md`：三个 AI 分数及依据、问题摘要、人工分数和合并分数。

重复评价同一 GDD 修订时使用 `run2`、`run3`，不覆盖已有文档。

## Eval Cases

每个案例保存在 `eval-cases/<case-id>.json`，固定 GDD、Prompt、Rubric、Result Template、来源版本和输出文件名前缀。案例配置不保存运行分数；每次运行的 AI、人工和合并分数只由 Result 与玩家评分数据记录。

Rubric 只定义体验价值、玩法与系统、内容与呈现三个总维度。表中的评价范围只是取证检查项，不单独打分。

## 证据边界

GDD 只能证明体验目标及其设计响应是否有明确文档证据。没有实际构建或运行证据时，不得断言游戏已经可玩、视觉效果已经落地或运行质量已经达到目标。
