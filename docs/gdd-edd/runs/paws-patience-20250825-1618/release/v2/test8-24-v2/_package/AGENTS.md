# test8-24 Codex 交付约束

本文件是 Keco 项目 `test8-24` 的项目级交付门禁。后续 Codex 在本目录开发、评价或打包时必须先读取并遵守本文件。用户只提出一个局部修改时，也必须按整套版本记录和交付门禁处理，不能只改被点名的单个文件。

## 1. 权威来源与版本边界

- Keco 项目：`test8-24`，Project ID `26dec3f7-19a0-4596-b7c5-0eceb1cd98cb`。
- V1 是只读基线和记录范式；不得删除、覆盖或重新解释 V1 证据。
- 新开发只能进入 Keco `V2` Folder（`0059bc39-8d53-4252-b239-395935947901`），并在本地使用对应的 `v2` 路径。
- 版本化目录必须成套存在并保持对齐：
  - `progress/v1/`、`progress/v2/`
  - `planning/v1/`、`planning/v2/`
  - `result/v1/`、`result/v2/`
  - `data/keco/v1/`、`data/keco/v2/`
  - `docs/keco-godot-slices/v1/`、`docs/keco-godot-slices/v2/`
  - `review-dashboard/v1/`、`review-dashboard/v2/`
  - `release/v1/`、`release/v2/`
- 共享 Godot 源码仍在 `paws_patience/`，不得复制出会分叉的 V1/V2 源码目录。每次变化必须记录 Keco revision、SourceSnapshot 和 SHA256。
- 当前工作区可能不是 Git 仓库；此时不得声称“已提交 Git”。使用 Keco revision、progress、结果文件、快照哈希和发布 manifest 做版本追踪。

## 2. 开始工作前的必做检查

1. 阅读本文件、`docs/development-index.md` 和 `docs/version-layout.md`。
2. 查看 V1 对应的 progress、planning、result 和 Slice 文档，沿用其记录粒度和文件配对方式。
3. 通过 Keco MCP 读取项目结构、V2 Folder、源 GDD、当前 roadmap、目标 Slice plan/status/eval-report；不要把本地旧副本当成唯一权威。
4. 确认当前 source revision、dirty paths、Godot 项目路径、Godot 版本、主场景和源码 SHA256。
5. 先在 progress 的 Markdown + JSONL 中登记目标、来源、范围、成功标准、当前 Slice 和下一步，再进行开发写入。
6. 任何范围、权限、费用、外部评价提供方或验收标准不明确时，先问用户；不得自行猜测后把猜测写成事实。

## 3. 计划与实现交付

- 每个新 Slice 必须有完整配对：`spec.md`、`plan.md`、`status.json`、`eval-report.json`；需要时补 `run-context.json`、`development-record.md` 和 `claude-review.md`。
- 每个计划必须说明目标、依赖、允许修改文件、验证方式、回滚/失败处理和完成标准。不得把实现、评价、人工确认混成一个状态。
- 只修改允许文件；发现计划范围或源 revision 改变时，暂停并更新计划与 checkpoint，再继续。
- 实现完成不等于交付完成。必须完成运行验证、回归验证、结果汇总、可读 Markdown、机器 JSON、progress 追加和发布包更新。
- 原有文件不得因为“整理格式”被删除。需要迁移时先复制/归档，并在 progress 说明原路径、新路径和保留位置。

## 4. 运行验证与证据

- Godot 验证通常必须实际执行：`run_project -> get_debug_output -> stop_project`。
- 保存原始 `KECO_EVAL` 记录或等价机器证据，包含 build hash、snapshot hash、evalId、expected、actual、status 和 errors。
- 运行错误、`manual_required`、`blocked`、`not_evaluated` 必须原样记录；不能为了让结果看起来通过而删掉。
- V2 Slice 必须同时检查新增功能和 V1 相邻回归。旧猫咪数值、存档迁移、天气、庇护所、结局等回归不能只口头声明。
- 视觉没有截图或人工确认时，不能声明“视觉完成”“美术通过”；资源复用必须在 `data/keco/v2/resource-provenance.json` 记录来源、策略、哈希、成本和临时状态。

## 5. Claude 机器评价规则

- “机器评价”必须由实际 Claude Code CLI 或用户指定的真实 Claude 能力执行。Codex 不得代填 Claude 分数、伪造 `rawResponse` 或把自己的判断标为 Claude。
- 保存三层文件：
  - `docs/keco-game-evaluations/<evaluationId>/claude-review.raw.json`：Claude 原始结构化返回和调用元数据。
  - `evidence.json`：绑定 profile、GDD revision、roadmap revision、SourceSnapshot、Godot build hash、Slice EvalReport 和运行证据。
  - `report.json`：由评价脚本生成并经过 validator 校验的高层报告。
- 现行评价合同固定为 `artStyle` 50 分 + `playerFun` 50 分，共八个子项；不得沿用 V1 的 30 分美术/趣味/Token 旧量表，也不得把 Token 效率塞进新合同。
- Slice quick evaluation 只评价本 Slice 直接影响项、相邻回归和相关 P0/P1 风险。证据不足必须 `status: not_evaluated`、`score: null`、`evidence: []`。
- 没有玩家试玩/留存记录时，Claude 可以评价机制是否提供潜在动机，但不得声称“玩家觉得好玩”“玩家愿意继续”。限制必须写明。
- 人工评价始终与 Claude 分开保存；没有用户实际填写时，`humanReview.artStyle`、`humanReview.playerFun`、`humanReview.total` 全部为 `null`。
- 只有八项全部 `evaluated` 且 validator 通过时，才能报告完整 100 分总分。任何覆盖不足、视觉人工待确认或门禁未完成，都必须使用 `partial`/`pending` 等真实状态。
- Claude 原始返回失败、为空、编码损坏或格式不符合合同，必须记为失败并重试/请求用户，不得用 Codex 补写成 Claude 结果。

## 6. 结果与进度记录格式

- 每轮至少更新：
  - `progress/v2/<run>.md`：按 V1 风格写可读过程、目标、来源、步骤、运行结果、错误、评价、限制、下一步。
  - `progress/v2/<run>.jsonl`：追加不可变事件，不重排、不覆盖旧事件。
  - `result/v2/<run>.json`：实现、运行、评价状态、人工空位、证据路径和残余风险。
  - `result/v2/<run>-evaluation.md`：面向人阅读的评价结论、分项结果、限制和验收条件。
- Markdown 与 JSON 必须互相引用，路径使用实际相对路径；机器 JSON 必须是合法 UTF-8 JSON。
- 评价、运行、打包每发生一次，就在 progress 追加一条事件；不要只改最终汇总而没有过程证据。
- 失败也要交付可追溯记录：写清失败点、已完成写入、原因、用户动作、恢复位置和需要重验的身份哈希。

## 7. 发布包门禁

- V2 发布目录固定为 `release/v2/test8-24-v2/`，必须同时保留 V1/V2 记录和归档说明。
- 每次结果或评价更新后必须重新复制 package staging、重建 `test8-24-v2.zip`，不能继续使用旧 ZIP。
- `manifest.json` 必须列出所有 required entries，包括 V1/V2 progress、planning、result、Slice 文档、评价目录、资源 provenance、源码和 baseline。
- ZIP 哈希记录在 ZIP 外部 `manifest.json`；因为 manifest 不应产生自引用哈希，所以更新顺序是：重建 ZIP -> 计算 SHA256 -> 更新 manifest -> 再验证实际 ZIP 哈希与 manifest 一致。
- 发布前必须验证：所有 required entries 存在、评价报告 validator 通过、JSON 可解析、源码哈希与报告/manifest 一致、ZIP 哈希一致。
- 交付消息必须明确列出：完成内容、真实状态、未完成/人工待确认项、评价提供方、报告路径、发布包路径和最终哈希。

## 8. 禁止事项

- 禁止只修改用户点名的一个文件而不更新相关 planning、progress、result、docs、manifest 和 release。
- 禁止删除 V1 记录、扁平旧记录或用户已有改动；迁移只能复制并归档。
- 禁止把 Slice 客观 `EvalReport` 冒充高层游戏评价；两者必须分别存在并互相引用。
- 禁止伪造 Claude、玩家、人工评分、截图、运行通过、无错误或 Token 节省。
- 禁止把 `manual_required` 改成 `passed`，禁止为了通过门禁降低阈值或修改锁定 profile。
- 禁止在未询问用户时扩展到付费生成、真实玩家测试、外部发布、Git 提交或其他超出当前范围的操作。

## 9. 最终交付自检清单

- [ ] V1 基线未丢失，V2 所有产物位于对应 `v2` 路径。
- [ ] Keco 源文档、revision、Folder、Slice 和源码哈希已核对。
- [ ] 计划、规格、状态、EvalReport、progress、result 全部同步。
- [ ] Godot 运行和 V1 回归有原始证据，errors 已明确记录。
- [ ] Claude 若被要求评价，存在真实 raw JSON、evidence、validated report；未评价项和限制真实保留。
- [ ] 人工评价没有用户填写时全部为 `null`。
- [ ] 评价脚本和 validator 通过；没有宣称证据不支持的总分或阶段结论。
- [ ] 发布 ZIP 已重建，manifest required entries 无缺失，哈希一致。
- [ ] 最终回复能让用户直接找到结果、评价、progress 和 ZIP，不需要用户再次追问“其他文件在哪里”。
