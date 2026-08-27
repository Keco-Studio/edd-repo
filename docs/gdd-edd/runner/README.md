# GDD EDD AI 与人工评分

本地 Claude 或 Codex CLI 根据所选 Eval Case 读取 GDD 和固定标尺，只返回结构化 JSON；Node 创建三份文档，玩家 Web 收集人工三维评分并写回合并数值。

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
体验价值：<score>/30
玩法与系统：<score>/40
内容与呈现：<score>/30
总分：<score>/100
人工评分：http://127.0.0.1:<port>/?session=<token>
```

## 执行链路

1. Node 加载并校验 `eval-cases/<case-id>.json`。
2. Node 读取版本化 Prompt，并将 Case 的 GDD 与 Rubric 路径填入短 Prompt。
3. AI 以只读权限读取 GDD 和 Rubric，只返回符合 JSON Schema 的结构化评价。
4. Node 校验来源、三个维度、证据和问题，并计算 AI 总分。
5. Node 生成 Progression、Problem、Result，再创建人工评分会话。
6. 人工在 Web 对体验价值、玩法与系统、内容与呈现分别给 `1-5` 分。
7. Node 每维按 AI 70%、人工 30% 合并，再按 30%、40%、30% 加权写回 Result；Progression 只记录同步事实。

单次 `npm run eval` 只生成和更新评分数值，不自动运行基线比较，也不生成退化或通过结论。

## AI 分数基线

正式版本可以只运行 AI 三次并保存统计基线，不创建三份 Markdown、人工评分会话或玩家分数：

```bash
npm run eval:baseline -- --case paws-patience-r97 --runs 3
```

后续使用相同 GDD、Provider 和请求模型采样并比较：

```bash
npm run eval:compare -- --case paws-patience-r97 --runs 3
```

`--runs` 默认为 `3`，允许 `2-20`。基线已存在时默认拒绝覆盖，需要明确添加 `--force`：

```bash
npm run eval:baseline -- --case paws-patience-r97 --runs 3 --force
```

基线保存在 `../baselines/<case-id>/<provider>-<model>.json`，记录每次 AI 分数、均值、样本标准差、最小值、最大值、输入哈希和请求/可观测模型。比较输出只显示基线、当前值、差值和配置变化，不生成 PASS/FAIL、退化结论或合并阻断。

采样按顺序调用 AI。以当前一次约 2.6 分钟计算，三次约需 8 分钟并产生三次模型调用费用。当前只有一个 `paws-patience-r97` Case，统计结果只代表该 GDD 上的波动，不代表评价器对所有 GDD 的准确性。

Progression 保存应用 Prompt、固定资产 SHA-256、请求/可观测模型、起止时间、Node/Provider 可观测执行事实、证据路径和回读状态。完整结构化输出单独保存到 `progress/evidence/`，Progression 不保存评分或模型内部推理内容。

## 数据

- 玩家评分数据保存在 `data/store.json`。
- AI 分数基线保存在 `../baselines/`。
- 同一浏览器再次提交会更新原评分，不增加样本数。
- 自由文本只保存在本地数据文件，不写入 Markdown。
- 备份或恢复时复制 `data/store.json`。

## 检查

```bash
npm test
npm run check
```

测试使用临时目录，不修改真实结果文档或运行数据。
