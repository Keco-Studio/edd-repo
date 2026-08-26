# 通用 Eval Case 设计

> 后续的 AI 输出与文档职责已由 `2026-08-26-auditable-ai-evaluation-design.md` 取代；本文件仅保留通用 Case 入口设计背景。

## 目标

把当前写死为 `Paws & Patience` 的单案例评价命令改为通用 Eval Case 入口。首个案例为 `paws-patience-r97`，继续使用 v6 模板、三份 Markdown 文档和现有玩家 Web 两维度人工评分。

本次只解决案例选择和复用问题，不增加基线、退化判断、PASS/FAIL、准入门、风险门禁或原型启动决策。

## 使用方式

```bash
# 执行默认案例
npm run eval

# 显式选择案例
npm run eval -- --case paws-patience-r97

# 查看可用案例
npm run eval -- --list-cases
```

`npm run eval` 默认执行 `paws-patience-r97`。未知案例必须立即失败，并在错误信息中列出可用案例 ID。

## 文件结构

```text
docs/gdd-edd/
├── eval-cases/
│   └── paws-patience-r97.json
├── gdd/
│   └── paws-patience-gdd-r97.md
├── progress/
├── problem/
├── result/
│   └── 评价模板-v6.md
└── player-rating-web/
    └── src/
        ├── eval-case.mjs
        ├── ai-evaluator.mjs
        └── evaluate-case.mjs
```

每个案例使用独立 JSON 文件。配置只保存固定输入和来源元数据，不保存某次运行得分。

## Case 配置

`eval-cases/paws-patience-r97.json`：

```json
{
  "id": "paws-patience-r97",
  "type": "gold",
  "title": "Paws & Patience",
  "gddPath": "docs/gdd-edd/gdd/paws-patience-gdd-r97.md",
  "projectId": "5165dbe5-8570-46df-bb40-3224f8bef93e",
  "documentId": "8d45eaa5-bb69-4d74-9d44-c9a93492b13f",
  "revision": 97,
  "templatePath": "docs/gdd-edd/result/评价模板-v6.md",
  "outputStem": "paws-patience-gdd-r97"
}
```

字段约束：

- `id` 必须与文件名一致，只允许小写字母、数字和连字符。
- `type` 当前只接受 `gold`，用于表明这是固定、可重复使用的评价案例。
- `gddPath` 和 `templatePath` 必须是仓库内存在的文件，禁止绝对路径和目录穿越。
- `projectId`、`documentId`、`revision` 和 `title` 用于校验 AI 返回的来源信息。
- `outputStem` 决定三份文档的基础文件名，并使用同样的安全字符规则。

Gold Case 在本项目中表示输入、来源、模板和评价方式已经锁定。它不表示自动通过，也不包含预期分数。

## 组件职责

### Case Loader

`eval-case.mjs` 负责：

1. 扫描 `eval-cases/*.json` 并返回案例列表；
2. 根据 ID 读取一个案例；
3. 校验必填字段、字段类型、文件名一致性和路径安全；
4. 确认 GDD 与模板文件存在；
5. 返回冻结的规范化 Case 对象。

Case Loader 不调用 AI、不生成文档，也不处理玩家评分。

### AI Evaluator

`ai-evaluator.mjs` 不再包含 `PAWS_SOURCE`。调用方必须传入已校验的 Case：

- Prompt 使用 Case 的 `title`、`gddPath` 和 `templatePath`；
- AI 返回的来源信息与 Case 的项目、文档、修订和标题逐项匹配；
- 仍只评价核心玩法和玩家体验，每维 `0-50`；
- AI 仍必须创建 Progression、Problem、Result 三份文档。

### Evaluation Command

`evaluate-case.mjs` 负责 CLI 和一次完整运行：

1. 解析 `--case` 或 `--list-cases`；
2. 加载 Case；
3. 根据 `outputStem` 分配评价标识；
4. 调用 AI 评价器创建三份文档；
5. 确认三份文档存在；
6. 创建人工评分会话并启动玩家 Web；
7. 输出 AI 三项分数和人工评分链接。

同一 Case 重复运行时继续使用 `run2`、`run3` 后缀，不覆盖已有文档。

## 数据流

```text
--case <id>
  -> Case Loader 读取并校验 JSON
  -> AI Evaluator 读取固定 GDD + v6 模板
  -> 创建 Progression / Problem / Result
  -> Node 校验 AI JSON 与三份文档
  -> 玩家 Web 收集两个 1-5 分
  -> AI 60% + 人工 40%
  -> 写回 Result 和 Progression 的最终数值
```

人工评分服务、评分公式和 Markdown 写回协议保持不变。

## 错误处理

- 未传 `--case`：使用默认 Case。
- 未知 Case：退出码非零，并列出有效 ID。
- Case JSON 无法解析或字段非法：退出码非零，指出文件和字段。
- GDD 或模板不存在：在调用 AI 前失败。
- AI 来源信息与 Case 不一致：拒绝创建人工评分会话。
- AI 未创建完整三文档：沿用现有失败清理逻辑，不留下无效会话。

## 测试策略

采用测试先行：

1. Case Loader 测试：列举、默认选择、显式选择、未知 ID、非法 JSON、路径越界和缺失文件；
2. Prompt 测试：确认内容来自所选 Case，不再依赖 Paws 常量；
3. AI 响应校验测试：来源匹配成功，任一来源字段不匹配时失败；
4. CLI 测试：默认 Case、`--case`、`--list-cases` 和清晰错误输出；
5. 端到端测试：所选 Case 创建三份文档并返回人工评分链接；
6. 全量检查：现有 AI 60% + 人工 40%、两维度评分和 Markdown 写回测试必须继续通过。

## 非目标

- 不批量运行多个 Case；
- 不保存或比较历史基线；
- 不计算退化；
- 不生成 PASS/FAIL 或是否进入原型的结论；
- 不修改玩家评分页面和两维度问卷；
- 不改变 v6 模板及三份文档职责；
- 不增加评审委员会、模块分片或风险红黄绿流程。
