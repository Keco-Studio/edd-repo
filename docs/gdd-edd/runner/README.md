# GDD EDD Runner

本 Node.js CLI 负责校验被测 session 隔离证据、调用 Cloud 评分、生成固定 Run 产物，以及从 Markdown 终结人工评分。它不包含 Web 服务、玩家会话、基线采样或历史案例比较。

```bash
npm install
npm run eval -- --case paws-patience-r97 --provider codex --model <model-id>
npm run finalize -- --run <evaluation-id>
npm run check
```

默认命令允许使用 fixture 进行快速本地测评；正式实验增加 `--strict-isolation` 并提供启动器生成的当次隔离清单。Codex Provider 使用当前配置，并在 Cloud 返回前先写出“AI 评分中”的 Result。未运行时即可在上级 `runs/_template/` 查看完整模板。完整输入、输出和人工填写格式见上级 [README](../README.md)。
