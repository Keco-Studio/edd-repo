# 可审计 AI 评价设计

## 目标

降低重复指令导致的幻觉和文档不一致，同时保留三份 Markdown、玩家 Web 两维度人工评分以及 AI 60% + 人工 40% 的合并方式。

## 核心边界

- 只评价“核心玩法”和“玩家体验”，每维 `0-50`，不增加二级评分。
- 使用统一客观分档；检查项只帮助取证，不单独计分或展示为指标体系。
- AI 只读取 GDD 和 Rubric，只返回符合 Schema 的 JSON，不创建或修改文件。
- Node 是 Progression、Problem、Result 的唯一生成者。
- 不增加基线、退化、风险等级、PASS/FAIL 或项目门禁。

## 固定资产

每个 Eval Case 固定引用：

1. `promptPath`：精简、版本化的应用 Prompt；
2. `rubricPath`：两个维度定义和统一 `0-50` 客观分档；
3. `resultTemplatePath`：仅负责 Result 呈现结构。

运行时记录三个文件及 GDD、Schema 的 SHA-256，避免只依赖可变文件名。

## AI 输出

每个维度只返回：

- 总分；
- 客观观察及 GDD 证据；
- 评分理由；
- 证据不足项。

问题列表单独返回维度、证据、问题影响和最小修改建议。Node 校验分数并计算 AI 总分。

## 执行记录

Progression 由 Node 根据真实运行数据生成：

- Case、Provider、请求模型和 CLI 事件中可观测到的模型；
- 开始、结束、耗时和退出状态；
- GDD、Prompt、Rubric、Schema、Result Template 的路径与 SHA-256；
- 完整应用 Prompt；
- Codex JSONL 或 Claude stream-json 中的可观测工具/状态事件摘要；
- AI 原始结构化输出和 Schema 校验结果；
- 三份输出文档路径；
- 精简的玩家评分同步状态。

不记录、不请求隐藏思维过程。思维、reasoning、thinking 内容在事件规范化时丢弃。

## 文档职责

- Progression：真实输入、输出和可观测运行记录，不复述评分规则或 AI 自述步骤。
- Problem：完整问题、影响和最小建议。
- Result：两个 AI 分数、观察、证据、理由、证据缺口、问题摘要、人工及合并分数；不重复完整问题表。

## Provider 采集

- Codex 使用 `--json` 获取 JSONL 状态事件，并继续使用 `--output-last-message` 获取最终 JSON。
- Claude 使用 `--output-format stream-json` 获取事件与最终结构化输出。
- 成功时保留规范化事件摘要；失败时抛出 Provider 错误，不生成三文档或评分会话。

## 统一评分标尺

两个维度共享：

- `0-15`：缺失或冲突直接破坏目标体验；
- `16-25`：基本成立，但有明显体验问题；
- `26-35`：达到设计目标，存在可迭代缺口；
- `36-45`：清晰完整、基本可验证，并有体验亮点；
- `46-50`：接近标杆，几乎没有明显缺口。

每个分数必须由客观观察、可定位 GDD 证据和评分理由共同支持。

## 历史数据

既有 run2 文档是过去运行记录，不回写或伪造新执行轨迹。新结构从下一次 Eval 运行开始生效。
