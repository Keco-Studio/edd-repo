# Progression 简洁执行审计要求

## 1. 用途与边界

每次 GDD 评价都生成一份中文 `Progression.md`，用于人工复核可观测执行事实。

Progression 不保存正式评分、问题详情或完整 AI JSON：

- 分数和评分理由只保存在 `Result.md`；
- 问题证据与建议只保存在 `Problem.md`；
- 完整 AI JSON 保存为 `progress/evidence/<执行标识>-ai-output.json`；
- Progression 只记录证据路径与 SHA-256。

## 2. 成功记录

成功 Progression 必须包含：

1. **执行身份**：评价标识、Eval Case、目标、Provider、请求模型、可观测模型、起止时间、耗时、状态和退出码；
2. **固定输入**：GDD、Prompt、Rubric、Schema、Result Template 的路径与 SHA-256；
3. **应用 Prompt**：CLI 实际发送给 Provider 的完整 Prompt；
4. **执行事实**：Node 和 Provider 可观测步骤的真实顺序、状态与简要结果；
5. **证据与产物**：AI JSON sidecar 路径和哈希、三份 Markdown 路径；
6. **下一动作**：查看 Result、分发人工评分链接或明确的恢复位置。

以下内容仅在实际发生时增加：失败、重试、暂停、跳过、改道、明确假设和未解决的不确定性。不得为了填满模板虚构这些内容。

## 3. 执行事实规则

- 记录 Eval Case 与固定资产加载、AI 调用、Schema 校验、证据写入与回读、文档写入与回读、评分会话创建；
- Provider 工具事件按可观测顺序逐次记录，不合并失败与重试；
- 大型返回内容只记录摘要、稳定路径和 SHA-256；
- 只记录 CLI 实际获得的事件，不声称捕获未提供的会话历史或内部步骤；
- 成功记录必须包含 Problem 与 Result 的回读验证；
- Progression 的最终化采用原子写入。

## 4. 失败记录

评价标识确定后发生失败，仍必须生成对应 Progression，记录：

- 已完成步骤和失败步骤；
- 脱敏后的错误摘要；
- 已生成与未完成的产物；
- 可直接执行的重试命令。

如果失败 Progression 自身无法写入，CLI 必须同时报告原始失败与审计写入失败，不得声称记录已保存。Eval Case 尚未通过校验、无法分配评价标识的输入错误不创建运行记录。

## 5. 人工评分同步

人工评分后，Progression 只更新以下执行事实：

- 同步时间；
- 有效样本数；
- Result 已更新状态；
- Result 路径。

AI 分数、玩家维度分和最终合并分只写入 Result，不复制到 Progression。

## 6. 安全和推理边界

- 不记录访问令牌、Cookie、密码、私钥、授权头、签名 URL、公开评分令牌或其他凭据；
- 审计字符串中的敏感值必须替换为“已脱敏”；
- 不要求、保存或展示模型隐藏思维链、reasoning 或 thinking tokens；
- `StructuredOutput` 工具载荷不重复写入事件表，完整内容以 sidecar 为准；
- 不能用“模型认为”代替 GDD 证据或工具结果。

## 7. 完整性检查

出现以下任一情况时，Progression 不完整：

- 成功记录缺少固定输入哈希、真实 Prompt、AI 证据路径或输出路径；
- 成功记录缺少 Problem/Result 回读事实；
- 发生失败或重试但记录被删除；
- Progression 包含正式评分或完整 AI JSON；
- 声称执行了 CLI 未观察到的工具；
- 泄露凭据或包含隐藏思维链。
