# GDD EDD 受控测评流程

本目录只用于测评 GDD 产物。正式流程隔离被测 Agent 和 Cloud 评分器，固定三个评分维度，并把每次运行保存到独立 Run 目录。不包含游戏构建、实际可玩性或运行质量评价。

## 隔离要求

被测 Codex 每次必须使用全新 session，上下文来源列表必须为空，且只能启用 Keco 自研 MCP 插件。被测 Agent 不得收到：

- 评分维度、Rubric、评分 Prompt 或 Schema；
- V1/V2/V3 失败案例、历史结果或预期分数；
- Superpowers、Atlassian 或其他无关插件。

启动器需要为本次实验生成隔离清单：

```json
{
  "sessionId": "gdd-run-20260827-001",
  "freshSession": true,
  "contextSources": [],
  "enabledPlugins": ["keco"],
  "createdAt": "2026-08-27T10:00:00.000Z"
}
```

`isolation/paws-patience-r97.json` 是结构示例，其 `sessionId` 以 `fixture-` 开头，Runner 会拒绝将它用于正式测评。运行前必须用启动器产生的当次证据替换该文件，或建立指向当次隔离清单的新 Eval Case。

## 固定评分

| 维度 | 满分 |
| --- | ---: |
| 体验价值 | 30 |
| 玩法与系统 | 40 |
| 内容与呈现 | 30 |

AI 和人工使用同一刻度，不创建二级分数。固定权重为 AI 40% + 人工 60%，每个维度按以下公式合并：

```text
合并维度分 = AI 维度分 * 0.40 + 人工维度分 * 0.60
最终总分 = 三个合并维度分之和
```

AI 必须对每个维度输出 GDD 证据、评分理由和证据缺口。人工评分前，AI 分数只是暂定结果。

## 使用

```bash
cd docs/gdd-edd/runner
npm install
npm run eval -- --case paws-patience-r97 --provider codex --model <model-id>
```

命令输出测评 ID 和 `result.md` 路径。直接编辑该 Result 的六个人工字段：

```markdown
- 评分人：`Li`
- 评分时间：`2026-08-27T18:00:00+08:00`
- 体验价值（0-30）：`20`
- 玩法与系统（0-40）：`35`
- 内容与呈现（0-30）：`25`
- 评分理由：`核心循环明确，但体验目标仍需收紧。`
```

然后运行：

```bash
npm run finalize -- --run <evaluation-id>
```

finalize 校验三个人工分数，只替换 Result 的最终评分标记区，并向 Progress 追加终结事实。无效人工输入不会修改 Result，但会生成 `problem.md` 说明恢复动作。

## Cloud 输入边界

Cloud 只获得四类评分输入：当前 GDD、固定 Rubric、固定评分 Prompt 和固定输出 Schema。`evidence/request.json` 保存实际消息、参数和输入哈希；`evidence/response.json` 保存未改写的 Cloud 结构化响应。

## 固定产物

```text
runs/<evaluation-id>/
|-- progress.md
|-- result.md
|-- problem.md              # 只在阻断时存在
`-- evidence/
    |-- request.json
    `-- response.json       # Cloud 有响应时存在
```

- `result.md` 是唯一面向用户的报告，包含简要总结、AI 证据评价、人工填写区和最终分。
- `progress.md` 保存完整评价依据、实际 Cloud 消息、模型参数、隔离校验、哈希和执行事件。
- `problem.md` 只记录输入冲突、工具失败、Schema 无效或人工分数无效等操作性阻断。GDD 本身的缺点仍写在 Result。

## 生效契约

- Rubric：`rubrics/gdd-v1.md`
- Prompt：`prompts/evaluator-v1.md`
- Schema：`schemas/evaluation-v1.schema.json`
- Runner：`runner/`

历史模板、旧评分逻辑和以前运行产物只通过 Git 历史查看，不进入正式测评上下文。
