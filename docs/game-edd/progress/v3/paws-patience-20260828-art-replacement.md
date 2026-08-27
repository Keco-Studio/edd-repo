# Paws & Patience V3 全量图片替换开发记录

## 目标

将当前 Godot 运行路径中的社区地图与病弱猫图片全部替换为适合 Paws & Patience 治愈系流浪猫题材的 PixelLab 原创资产。

## 权威来源

- Keco 项目：test8-24
- Project ID：26dec3f7-19a0-4596-b7c5-0eceb1cd98cb
- V3 Folder：778ea7fc-2695-4681-87e1-b46918c1bcf9
- GDD：game-gdd revision 2
- Godot：4.7，主场景 main.tscn
- 当前工作区不是 Git 仓库；使用 Keco revision、SourceSnapshot、SHA256 与发布 manifest 追踪。

## 范围

- 完整地图：替换 res://assets/backgrounds/neighborhood.png。
- 病弱猫：替换 res://assets/cats/sick-cat.png。
- Keco Visual Assets：复用现有两个稳定 Asset Key，planned -> ready。
- 旧图：先归档哈希和字节，再从运行资源路径移除。
- V3 Slice 010：planning、progress、result、docs、data、dashboard、release 成套更新。

## 成功标准

- PixelLab 强类型生成完成，费用和 provider ID 可追踪。
- 新图经 Keco 上传、完成、回读与哈希校验后才接入 Godot。
- Godot 实际加载新图，客观资源与 V1/V2/V3 相邻功能回归通过。
- 视觉观感保持 manual_required，等待用户实际确认。

## 基线

- 旧地图：400x224，sha256:a1bf531672631d8c09434b152f66d2cd905c7a41c69abc1e1f5b1d9cfb0668cd。
- 旧猫咪：136x136，sha256:3a3f4c25ad8eb0b94615b3da3ba9113d3747fe04eea8af39073095497f167bd5。
- main.gd：sha256:6faab7a8b2067715805408739a82cb505ad23f90b3d52d31764303efea86d542。
- PixelLab：subscription active；plan generations 0；credits $4.88。

## 当前状态

- INTAKE、BASELINE、SOURCE_DISCOVERY 已通过。
- Keco Roadmap 与 Slice 010 的 spec、plan、status、EvalSpec、DataPlan、AssetPlan、DesignReview 已创建并完整回读。
- 本地 plan、run-context、Slice 文档三项 validator 已通过。
- Visual Assets 已新增 Prompt、Transparency、Provider Asset ID、Generation Cost USD、Reference Hashes、Archive Path 六个可选字段。
- 地图与猫咪两条现有资产行已转为 planned；旧 Image 对象与旧 SHA256 未删除。
- task-1001 RED 通过：不存在 Slice 010 地图和本地生成文件。
- 已创建未付费地图草案 6d560dbc-0ae2-418b-b622-16d11a67edb2，revision 0ee191b0-d62c-46bb-ba0b-6805e79cf781，saveVersion 0。
- 自动草案尺寸为 512x512，不符合固定 400x224。纠正尺寸时 update_map_draft 连续三次返回 UPSTREAM_UNAVAILABLE。
- 当前状态：blocked。没有启动 PixelLab 付费生成，没有删除或替换旧图，没有进入 task-1002。
- 恢复位置：先 read_map 核对 revision/saveVersion，再重试完整 400x224 update_map_draft；成功后 prepare 并向用户展示具体 feeNotice。

## 2026-08-28 恢复尝试

- 用户确认继续生成后，重新核对了地图身份、Keco 文档 revision、Visual Assets planned 行、计划 validator 和三个源码哈希；均未漂移。
- 独立 interaction checkpoint 已补齐并通过 validator。
- 第四次调用 update_map_draft 仍返回 UPSTREAM_UNAVAILABLE，草案继续保持 512x512、saveVersion 0。
- 未进入 PREPARE，因此没有具体 feeNotice、没有有效付费确认令牌、没有 PixelLab 提交和扣费。
- 恢复位置不变：服务恢复后先 read_map，再纠正为 400x224，随后 prepare 并展示费用原文。

## Direct PixelLab 路径

- 用户明确要求绕过不可用的 Keco Create Map 更新接口，直接使用 PixelLab 生成并写回 Keco。
- Keco Plan revision 2、AssetPlan revision 2、DesignReview revision 2 已改为 direct PixelLab Create Image Pro，并完成权威回读。
- 本地 Plan、RunContext、Slice validator 重新通过；Visual Assets 地图行已回读为 planned、400x224、opaque、create_image_pro。
- PixelLab Pro job c0d178eb-fa73-481b-b51e-a5132da85550 已提交：400x224、seed 4282026、40 generations、初始状态 processing。
- Provider Asset ID 已绑定回 Keco planned 行；Generation Cost USD 保持 null，因为 provider 只返回 generations，没有返回真实美元金额。
- Pro job 已完成并通过机器校验：400x224、完全不透明、32,216 bytes、sha256:6c96524237131e53b3fbe693c9b2ce513b8a61a1c89cf7cf9a183c46453673b1。
- Keco 上传完成并回读 ready；权威 Keco 下载与 provider 临时文件逐字节一致。
- 余额从 $4.88 降至 $4.75，Generation Cost USD 已按实际差额记录为 0.13。
- Slice 010 Visual Assets snapshot aggregate：sha256:79b699b7ce065740071b7d7b7c9276134e9bdde6e4ee040d76eb4ff3b121d32a，export/validator 均通过。
- task-1001 GREEN passed；视觉观感仍为 manual_required。
- task-1002 preflight 发现 live schema 限制：v3 不支持 quadruped；Character Pro 支持四足但最大 128px。两次均在参数校验前失败，没有角色 ID 或费用。
- AssetPlan revision 4 采用确定性画布适配：Provider 128x128 south PNG 不缩放，四边各补 4px 透明像素，最终 Keco/Godot 文件仍为 136x136。
- PixelLab Character Pro job 78fb7c8a-279e-4544-9da4-14ba53c8b690 已提交：quadruped cat、128x128、8 directions、40 generations；Provider Asset ID 已绑定 planned 行。

## 2026-08-28 猫资源完成与运行资源替换

- PixelLab Character Pro 已完成，Keco 行回读为 ready；供应商 128x128 south 图经四边各 4px 透明补边成为 136x136，未缩放或重采样。
- 猫资源最终 SHA256 为 `sha256:e65f116364a5c52c409219bf767f2e89097d9309ac5255d989d6866706d77715`，实际费用 `$0.18`；地图和猫合计 `$0.31`。
- 最终 Visual Assets snapshot 已导出并通过 validator，aggregate 为 `sha256:5c9a521e16c4f976e4a5aaa23e5e1349ac0f575bb5468fdc70977487f61edb5d`。
- 旧地图与旧猫字节已分别归档到 `data/keco/v3/archive/slice-010/`，归档哈希与替换前基线完全一致。
- Godot 两个运行资源已仅从 Keco 权威下载副本 materialize；地图和猫运行哈希分别匹配 Keco ready 行。
- task-1001、task-1002、task-1003 已完成；task-1004 进入 Godot 运行、回归、结果和发布包验证。视觉验收仍为 `manual_required`。

## 2026-08-28 运行与 Keco 完成回读

- Godot 4.7 已执行完整 `run_project -> get_debug_output -> stop_project`，`errors` 与 `finalErrors` 均为空。
- `eval-1001` 至 `eval-1004` 通过；地图探索、旧猫数值、存档、天气、庇护所和结局相邻回归通过。
- `eval-1005-art-presentation` 保持 `manual_required`，人工评分 `artStyle`、`playerFun`、`total` 均为 `null`。
- Keco status 已完成回读，revision 8；EvalReport 已创建并回读；roadmap 已完成回读，revision 5。
- 当前真实评价状态为 `partial`：实现完成，客观验证通过，视觉人工验收未完成。

## 2026-08-28 发布包

- V3 package staging 已重新同步 V1/V2/V3 记录、Slice 010 Keco 快照、生成资源、旧图归档、运行证据、结果与共享 Godot 源码。
- `test8-24-v3.zip` 已重建；最终大小、SHA256 和 required entries 由 ZIP 外部 `release/v3/test8-24-v3/manifest.json` 权威记录，避免 ZIP 自引用哈希。
- 发布验证要求 ZIP 内 required entries 无缺失，实际 ZIP 哈希与外部 manifest 一致。
