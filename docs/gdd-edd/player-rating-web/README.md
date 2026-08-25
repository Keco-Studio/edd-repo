# GDD EDD 玩家评分 Web

`Paws & Patience` GDD EDD 本地 AI 编排与匿名玩家评分服务。AI 评价由本地 Codex/Claude CLI 完成；Web 只向玩家提供评分页面。玩家提交后，聚合结果自动写回对应 Result 顶部摘要和玩家评分区块，并在 Progression 中记录本次同步的输入、输出与验证状态。

## 运行

需要 Node.js 20 或更高版本。

```bash
cd docs/gdd-edd/player-rating-web
npm install
npm run evaluate:paws
```

默认使用 Claude Sonnet。需要显式使用 Codex 时运行：

```bash
npm run evaluate:paws -- --provider codex
```

命令让 Codex/Claude 读取仓库中的 `../gdd/paws-patience-gdd-r97.md` 和锁定的 `../result/评价模板-v5.md`，由 AI 自己创建 Progression、Problem、Result 三份文档。Node 只检查三份文件存在、读取 AI 两项分数、创建玩家会话并打印链接。重复评价同一 GDD 修订时自动使用 `run2`、`run3`，不会覆盖旧结果。

终端打印的“玩家评分链接”即为应发给玩家的完整地址。服务默认自动选择空闲端口；设置 `EDD_PORT` 可固定端口。

## 公网链接

先在 ngrok 本机配置凭据，再运行：

```bash
npm run share
```

`npm run share` 仅启动未绑定会话的基础服务。当前 AI 一键命令面向本地或局域网使用；如需公网分发，应将其打印的带 `?session=...` 链接通过受控反向代理暴露，不存在管理页面或管理员令牌。

## 评分规则

- 只评价“核心玩法”和“玩家体验”；玩家体验包含 UI 视觉风格与可玩性。
- 玩家每个维度给 1–5 分；收到第一份评分后即生成合并分，没有固定人数门槛。
- AI 占 60%，玩家占 40%；两个维度各占总分 50%。
- 同一浏览器再次提交会更新原评分，不增加样本数。
- 玩家自由文本只保存在 `data/store.json`，不会写入正式结果 Markdown。
- AI 各维度问题扣分合计必须等于 `50 - AI 得分`；50 分时该维度无需添加问题。

## 数据与恢复

- 备份时复制 `data/store.json`；恢复时停止服务、替换该文件后重新启动。
- 文档写回更新 Result 的五个模板汇总字段，并替换当前会话的 `EDD_PLAYER_RATINGS_START/END` 区块；Progression 仅维护当前会话的 `EDD_PLAYER_PROGRESS_START/END` 同步记录，其他人工内容不变。
- Web 不提供 AI 得分录入、文档创建、会话管理或其他管理员接口。

## 检查

```bash
npm test
npm run check
```

测试使用临时目录，不会修改真实结果文档或运行数据。
