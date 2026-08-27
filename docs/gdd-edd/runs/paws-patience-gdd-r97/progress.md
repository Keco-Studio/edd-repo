# GDD EDD 执行记录

- 测评 ID：paws-patience-gdd-r97
- 状态：awaiting_human
- Eval Case：paws-patience-r97
- 评价对象：Paws & Patience
- 目标：根据固定 GDD、Prompt 和 Rubric 生成可人工复核的评价文档
- Provider：claude
- 请求模型：sonnet
- 可观测模型：claude-opus-4-8
- 开始时间：2026-08-27T11:28:15.488Z
- 结束时间：2026-08-27T11:30:34.034Z
- 耗时：138546 ms
- 退出码：0
- Schema 校验：通过

## 评分参数

- 固定维度：体验价值 30 分、玩法与系统 40 分、内容与呈现 30 分
- 合并权重：AI 40%，人工 60%
- 计算公式：合并维度分 = AI 维度分 * 0.40 + 人工维度分 * 0.60
- 最终总分：三个合并维度分之和
- 推理强度：medium
- 隔离清单：fixture-paws-patience-r97
- 清单插件：keco

## 固定输入

| 输入 | 路径 | SHA-256 |
| --- | --- | --- |
| GDD | docs/gdd-edd/gdd/paws-patience-gdd-r97.md | 04d31395fac4ca9f3bf96f0e1df56547501e872bae0017fda7994999afb1a459 |
| Prompt | docs/gdd-edd/prompts/evaluator-v1.md | 9b6a38a655c4c4a173bcae22d53df318f921de2fbd52d055822e1c1d92c4c3ba |
| Rubric | docs/gdd-edd/rubrics/gdd-v1.md | a39b052fa0fac1261361a0b8eeb76c8c0c887b982a93bbe26dc5c0cca172df70 |
| Schema | docs/gdd-edd/schemas/evaluation-v1.schema.json | 13caab707e4b053bd5cec4e02ddfa02ef9f0d9bdfcb48e1444040a630f4bc185 |
| Isolation | docs/gdd-edd/isolation/paws-patience-r97.json | 3964c05db65cbb08424e08c91f6764341a9a7a2c7f2e500ce1578aaec3cdb015 |

## 执行事实

| # | 组件 | 动作 | 状态 | 结果摘要 |
| ---: | --- | --- | --- | --- |
| 1 | Node | 加载 Eval Case 与固定输入 | completed | paws-patience-r97；固定资产已读取并计算哈希 |
| 2 | AI | AI 评价 | completed | claude 返回结构化结果，AI 总分 71.0/100 |
| 3 | Provider | system | observed | init |
| 4 | Provider | result | observed | success |
| 5 | Node | Schema 校验 | completed | 来源、三个维度、证据与问题结构通过校验 |
| 6 | Node | 写入评价文档 | completed | Result、Progress 与 Evidence 按固定结构写入 |

## 输入提示词

### User Prompt

下面展示本次使用的 User Prompt 模板。运行时已注入本次 GDD 和固定 Rubric；Progress 仅保留占位符版本：

<pre>你是 GDD 证据评价器，评价《{{title}}》。

仅使用本次 GDD 和固定标尺，按体验价值、玩法与系统、内容与呈现三个固定维度评分。面向 GDD 提交者具体总结主要优点、缺点和改进方向。缺失内容记为证据缺口，不得补全；同一问题不得跨维度重复计分或扣分。

&lt;fixed-rubric&gt;
{{rubric}}
&lt;/fixed-rubric&gt;

&lt;current-gdd&gt;
{{gdd}}
&lt;/current-gdd&gt;

不得修改文件。只返回符合指定 JSON Schema 的 JSON。
</pre>

完整实际请求保存在 <code>evidence/request.json</code>。

## 审计证据与产物

| 类型 | 路径 | SHA-256 |
| --- | --- | --- |
| Request | evidence/request.json | e86b8f8d8b91390f3b02342a7c2f8cf695ddcf34e03861acfafe7799ebf893ec |
| Response | evidence/response.json | ba8a1a80e1439ca2d4b4d327b1fdd0a1e9e22343d7788aba5fba689890fef523 |

- Progress：progress.md
- Problem：未生成
- Result：result.md
- 下一人工动作：查看 Result，填写人工评分并运行 finalize
