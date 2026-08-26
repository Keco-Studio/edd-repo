# GDD EDD AI 与人工评分

本地 Claude 或 Codex CLI 根据所选 Eval Case 读取 GDD 和固定标尺，只返回结构化 JSON；Node 创建三份文档，现有玩家 Web 收集人工两维度评分并写回合并数值。

## 运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run eval
```

默认执行 `paws-patience-r97`。显式选择案例或查看案例列表：

```bash
npm run eval -- --case paws-patience-r97
npm run eval -- --list-cases
```

使用 Codex：

```bash
npm run eval -- --provider codex
```

显式选择模型：

```bash
npm run eval -- --provider codex --model <model-id>
```

命令输出 AI 三项分数和人工评分链接：

```text
核心玩法：<score>/50
玩家体验：<score>/50
总分：<score>/100
人工评分：http://127.0.0.1:<port>/?session=<token>
```

## 执行链路

1. Node 加载并校验 `eval-cases/<case-id>.json`。
2. Node 读取版本化 Prompt，并将 Case 的 GDD 与 Rubric 路径填入短 Prompt。
3. AI 以只读权限读取 GDD 和 Rubric，只返回符合 JSON Schema 的结构化评价。
4. Node 校验来源、两个维度、证据和问题，并计算 AI 总分。
5. Node 生成 Progression、Problem、Result，再创建人工评分会话。
6. 人工在 Web 对核心玩法和玩家体验分别给 `1-5` 分。
7. Node 按 AI 60%、人工 40% 计算并写回 Result 与 Progression。

整个流程只生成和更新评分数值，不生成基线、退化或通过结论。

Progression 保存应用 Prompt、固定资产 SHA-256、请求/可观测模型、起止时间、耗时、Provider 的可观测状态与工具事件，以及完整结构化输出。它不保存或要求模型内部推理内容。

## 数据

- 玩家评分数据保存在 `data/store.json`。
- 同一浏览器再次提交会更新原评分，不增加样本数。
- 自由文本只保存在本地数据文件，不写入 Markdown。
- 备份或恢复时复制 `data/store.json`。

## 检查

```bash
npm test
npm run check
```

测试使用临时目录，不修改真实结果文档或运行数据。
