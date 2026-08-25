# 从 MCP 到 GDD 的完整现有流程

> 文档用途：供人工审查现有 Skill 调用逻辑和工具职责。仅根据 `dev-ting` 当前代码与公开调用契约整理，不新增 Skill、MCP 工具或业务能力，也不展开工具底层实现。

## 0. 梳理范围

本文回答三个问题：

1. 现有 Skill 如何通过 Keco MCP 生成并绑定 Game Design System（GDS）；
2. 这条流程涉及的 MCP 工具分别用于什么；
3. 已绑定 GDS 后，Keco Studio 如何经 `/gdd-generation-jobs` API 和后台 worker 最终生成 GDD。

本文不是一次真实生成任务的执行记录，不会调用 MCP 创建 GDS、绑定项目或生成 GDD。工具部分只说明名称、调用顺序、输入边界和用途，不分析内部 API、RPC、数据库或函数实现。

## 1. 结论

当前系统不是通过一条 MCP 调用直接生成 GDD，而是由两段已有流程衔接完成：

```text
Codex / Claude
  -> Keco MCP 生成 Game Design System（GDS）
  -> Keco MCP 将明确的 GDS 版本绑定到项目
  -> 人工进入 Keco Studio 发起 GDD 生成
  -> Studio 调用 /gdd-generation-jobs API
  -> 后台 GDD worker 生成、校验并保存 GDD
  -> Studio 轮询任务并打开最终 GDD 文档
```

边界如下：

- MCP 当前能够生成、读取、版本化和绑定 GDS。
- MCP 当前没有 `generate_gdd`、`get_gdd_generation` 或同类 GDD 工具。
- GDD 的实际生成入口位于 Studio 页面和项目 API，不在现有 MCP Skill 中。
- 因此，“通过现有能力最终得到 GDD”的完整路径是 `MCP GDS 流程 + Studio GDD 流程`。

## 2. 现有 Skill 的调用逻辑

负责 GDS 的现有 Skill 是：

```text
plugins/keco-codex/skills/keco-manage-game-design-system/SKILL.md
```

### 2.1 触发条件

当用户要求发现、查看、创建、AI 生成、创建新版本或绑定 Keco Game Design System 时触发。

以下请求不属于该 Skill：

- 删除 GDS；现有 MCP 不提供删除操作。
- 编辑普通项目文档或表格。
- 直接生成 GDD；现有 MCP 没有对应工具。

### 2.2 强制状态顺序

原 Skill 的调用状态机翻译如下：

```text
发现 -> 读取 -> 规划 -> 修改 -> 轮询 -> 回读验证 -> 报告
```

1. **发现（DISCOVER）**
   检查可用工具。需要绑定项目时先调用 `list_projects` 确定唯一项目；调用 `list_game_design_systems` 分页查找 GDS。不得只凭标题猜测系统 ID。
2. **读取（READ）**
   调用 `read_game_design_system` 读取目标系统及版本。涉及项目绑定时，同时调用 `read_project_game_design_system` 读取当前绑定。
3. **规划（PLAN）**
   明确本次是新建、AI 生成、创建版本还是绑定。保留读取到的系统 ID、版本 ID 和父版本 ID。新的生成意图使用新的幂等键；只有完全相同的请求才能复用原幂等键。
4. **修改（MUTATE）**
   每次只执行一种明确修改。生成新 GDS 使用 `generate_game_design_system`；将版本应用到项目使用 `set_project_game_design_system`。
5. **轮询（POLL）**
   AI 生成返回任务后，调用 `get_game_design_system_generation`，有限次数轮询至 `completed` 或 `failed`。任务进入队列不等于生成成功。
6. **回读验证（READ_BACK）**
   生成完成后重新调用 `read_game_design_system`。绑定完成后重新调用 `read_project_game_design_system`。不能只根据写操作响应宣布成功。
7. **报告（REPORT）**
   只报告已经回读确认的系统、版本、项目绑定和任务结果，并区分已完成、待处理和失败状态。

### 2.3 为最终生成 GDD 所需的最短 GDS 流程

```text
list_projects
  -> list_game_design_systems
  -> generate_game_design_system
  -> get_game_design_system_generation（循环至终态）
  -> read_game_design_system
  -> read_project_game_design_system
  -> set_project_game_design_system
  -> read_project_game_design_system（验证绑定）
```

如果项目已经绑定了满足要求的 GDS 版本，可跳过生成和绑定，但必须先回读确认绑定。

## 3. GDS 相关 MCP 工具用途

下表仅说明公开用途，不展开底层 API、RPC 或数据库实现。

| 工具 | 用途 | 在本流程中的位置 |
|---|---|---|
| `list_projects` | 分页列出当前账号可访问的项目及权限，用稳定 `projectId` 消除同名项目歧义 | 选择最终承载 GDD 的项目 |
| `list_game_design_systems` | 分页列出当前账号可见的 GDS | 查找已有系统或确认没有重复目标 |
| `read_game_design_system` | 读取一个 GDS 及其有限版本历史 | 生成前读取基础系统，生成后验证结果 |
| `read_project_game_design_system` | 读取项目当前绑定的 GDS 和版本 | 绑定前检查，绑定后验证 |
| `get_game_design_system_generation` | 查询一个 GDS AI 生成任务的当前状态 | 将排队任务轮询到成功或失败 |
| `create_game_design_system` | 用完整结构化规则直接创建 GDS | 已有完整规则集时使用，不调用 AI 生成 |
| `generate_game_design_system` | 根据标题、类型、理念、描述、参考资料、参考游戏和美术风格启动幂等的 AI GDS 生成任务 | 本流程的 GDS 生成入口 |
| `create_game_design_system_version` | 在指定父版本下创建不可变的新版本，并校验当前版本未发生变化 | 需要修改已生成 GDS 时使用 |
| `set_project_game_design_system` | 将明确的 GDS 版本绑定到项目 | GDD 生成的必要前置条件 |
| `clear_project_game_design_system` | 清除项目绑定，不删除 GDS 或版本 | 不属于正常 GDD 生成路径 |

### 3.1 `generate_game_design_system` 的公开输入范围

现有工具接受以下内容：

- `title`：GDS 标题；
- `genres`：游戏类型列表；
- `philosophies`：设计理念列表；
- `description`：设计描述；
- `suitableFor`：适用范围；
- `baseSystemId`：可选基础 GDS；
- `pastedMarkdown`：可选粘贴文本；
- `references`：最多 10 个 Keco 文档或表格引用；
- `referenceGames`：参考游戏及希望借鉴、避免的内容；
- `artStyle`：美术风格；
- `idempotencyKey`：本次生成意图的幂等键。

该工具只返回 GDS 生成任务。必须继续轮询并回读生成后的系统。

## 4. 从已绑定 GDS 到最终 GDD

这一段是现有 Studio 工作流，不是 MCP Skill。

### 4.1 人工入口

1. 用户在 Studio 的 Game Design System 工作区选择项目。
2. 页面确认所选 GDS 版本正绑定到该项目。
3. 用户点击 `Generate GDD + maps`。
4. 用户选择：
   - `professional`：较完整的专业 GDD；
   - `quick`：较短的核心设计草稿。
5. 用户可填写最长 4,000 字符的 `creativeBrief`。

当前页面同时提示：此操作生成 GDD，并自动提交 GDD 中描述的最多 3 张付费地图图片；地图图片不包含碰撞网格。这是现有行为，不能把它描述成仅生成纯文本 GDD。

### 4.2 Studio API 调用

页面通过以下请求创建任务：

```http
POST /api/projects/{projectId}/gdd-generation-jobs
Idempotency-Key: <8-128 字符的有效幂等键>
Content-Type: application/json

{
  "designSystemId": "<已绑定的 GDS ID>",
  "versionId": "<已绑定的版本 ID>",
  "mode": "quick | professional",
  "creativeBrief": "<可选>"
}
```

API 在创建任务前执行以下公开校验：

- 当前用户必须是项目 `admin` 或 `editor`；
- 项目当前绑定必须与请求中的 GDS 和版本完全一致；
- GDS 已完成迁移并且版本存在；
- 版本没有未解决冲突；
- 幂等键有效，且不能被不同请求重复使用；
- 同一项目不能同时存在另一个活动 GDD 任务。

校验通过后，API 创建 `queued` 任务并调度后台 worker，HTTP 响应为 `202`。

### 4.3 后台 worker 流程

现有 worker 的高层顺序如下：

```text
领取 queued 任务
  -> 心跳并再次检查用户权限和项目 GDS 绑定
  -> 根据冻结的 GDS 版本生成中文 GDD Markdown
  -> 校验文档格式
  -> 生成或复用关联表格、对话资源
  -> 从 GDD 编译地图描述
  -> 保存协作文档和生成元数据
  -> 如有地图任务则等待地图完成
  -> 标记 completed / completed_with_map_failures / failed
```

任务可能出现的主要状态：

| 状态 | 含义 |
|---|---|
| `queued` | 已入队，等待 worker |
| `running` | worker 正在生成、校验或保存 |
| `waiting_for_maps` | GDD 文档已生成，仍在等待地图任务 |
| `completed` | GDD 及要求的后续资源完成 |
| `completed_with_map_failures` | GDD 已保存，但地图编译、提交或生成存在失败 |
| `failed` | GDD 主任务失败 |

worker 会在执行前重新确认项目权限和 GDS 绑定。如果绑定已经变化，任务失败，不会用旧版本继续生成。

### 4.4 当前 GDD 输入来源

API 当前冻结到任务中的输入包括：

- 项目 ID 和名称；
- 已绑定的 GDS ID、版本 ID、版本号和标题；
- GDS 结构化规则；
- GDS 人类可读设计文档；
- GDS 美术风格；
- 生成模式；
- 可选 `creativeBrief`；
- 固定输出语言 `zh-CN`。

虽然 GDD V2 合同支持 `projectSources`，但当前 API 创建任务时明确传入：

```ts
projectSources: []
```

因此当前 Studio GDD 生成不会自动读取项目中的普通文档和表格作为额外来源。GDS 生成阶段可以通过 MCP `references` 使用最多 10 个 Keco 文档或表格，但这些内容进入最终 GDD 的方式是先影响 GDS，而不是由 GDD API 再次直接读取。

### 4.5 页面轮询和最终产物

页面使用以下接口读取状态：

```http
GET /api/projects/{projectId}/gdd-generation-jobs/{jobId}
```

页面轮询 `queued`、`running` 和 `waiting_for_maps` 状态。任务进入 `completed` 或 `completed_with_map_failures` 后，通过返回的 `output_document_id` 打开最终 GDD 文档。

最终产物可能包括：

- 一个可编辑的 Keco GDD 协作文档；
- GDD 中声明并物化的 Keco 表格资源；
- GDD 中声明的对话文档和 Script 资源；
- 从 GDD 地图描述派生的地图任务和地图资源；
- 生成版本号、规则应用情况、资源变更摘要等元数据。

## 5. 完整现状时序

```text
用户
  -> Codex：要求生成 Game Design System
Codex
  -> Keco MCP：list_projects
  -> Keco MCP：list_game_design_systems
  -> Keco MCP：generate_game_design_system
  -> Keco MCP：get_game_design_system_generation（轮询）
  -> Keco MCP：read_game_design_system（验证）
  -> Keco MCP：set_project_game_design_system
  -> Keco MCP：read_project_game_design_system（验证）
用户
  -> Keco Studio：点击 Generate GDD + maps
Keco Studio
  -> POST /api/projects/{projectId}/gdd-generation-jobs
GDD API
  -> 创建 queued 任务并调度 worker
GDD worker
  -> 重新验证权限与绑定
  -> 生成、校验并保存 GDD
  -> 物化表格/对话，并按内容触发地图流程
Keco Studio
  -> GET /api/projects/{projectId}/gdd-generation-jobs/{jobId}（轮询）
  -> 使用 output_document_id 打开 GDD
```

## 6. 审查要点

1. 当前可以用 MCP 完成 GDS 生成和项目绑定，但不能用 MCP 发起或轮询 GDD 任务。
2. 最终 GDD 生成必须由用户在 Studio 页面手动触发。
3. 当前 GDD 请求只直接使用已绑定 GDS 和可选 `creativeBrief`，不会自动摄取项目普通文档或表格。
4. 当前按钮会连带自动提交最多 3 张付费地图图片，不是纯文档生成按钮。
5. 任务完成必须以状态终态和 `output_document_id` 为依据，不能以入队响应作为成功证明。

## 7. 代码与契约入口

| 内容 | 路径 |
|---|---|
| GDS Skill 调用规则 | `plugins/keco-codex/skills/keco-manage-game-design-system/SKILL.md` |
| GDS/MCP 公开契约 | `plugins/keco-codex/references/gds-map-mcp-contract.md` |
| Skill 通用交互规则 | `plugins/keco-codex/references/interaction-contract.md` |
| MCP 使用说明 | `docs/mcp/README.md` |
| GDD 页面入口 | `src/components/game-design-system/GameDesignSystemWorkspace.tsx` |
| GDD 参数对话框 | `src/components/game-design-system/GddGenerationDialog.tsx` |
| GDD 客户端请求 | `src/lib/services/gameDesignSystemClient.ts` |
| GDD 任务 API | `src/app/api/projects/[projectId]/gdd-generation-jobs/route.ts` |
| GDD worker | `src/lib/gdd-generation/worker.ts` |
| GDD V2 输入合同 | `src/lib/gdd-generation/v2/contracts.ts` |
