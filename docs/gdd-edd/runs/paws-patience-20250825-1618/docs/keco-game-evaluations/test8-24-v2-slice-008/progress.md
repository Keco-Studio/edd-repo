## profile

- 目标: 锁定评价范围和固定评分项
- 输入:

```json
{
  "buildHash": "sha256:195f7fadbecc5c359c2072559da309625ea800f54a242dc19f6c7a187e815266",
  "gameId": "test8-24-v2-slice-008",
  "gddRevision": "2",
  "genre": "cozy cat-care simulation",
  "stage": "slice"
}
```

- 执行方式: create_evaluation_profile.py
- 预期输出: 两维八项固定 profile
- 实际结果:

```json
{
  "dimensions": [
    "artStyle",
    "playerFun"
  ],
  "profileId": "test8-24-v2-slice-008-slice-v1"
}
```

- 具体含义: 评分权重已锁定，genre 只保留为身份元数据
- 对下一步影响: 后续证据只能按这八个子项提交

### 步骤 1

- 工具: create_evaluation_profile.py
- 参数:

```json
{
  "buildHash": "sha256:195f7fadbecc5c359c2072559da309625ea800f54a242dc19f6c7a187e815266",
  "gameId": "test8-24-v2-slice-008",
  "gddRevision": "2",
  "genre": "cozy cat-care simulation",
  "stage": "slice"
}
```

- 输出:

```json
{
  "dimensions": [
    "artStyle",
    "playerFun"
  ],
  "profileId": "test8-24-v2-slice-008-slice-v1"
}
```

- 具体含义: 评分权重已锁定，genre 只保留为身份元数据
- 对下一步影响: 后续证据只能按这八个子项提交

## score

- 目标: 按 Claude 外部评价汇总分数
- 输入:

```json
{
  "coverage": 0.875,
  "profileId": "test8-24-v2-slice-008-slice-v1"
}
```

- 执行方式: score_game_evaluation.py
- 预期输出: artStyle 和 playerFun 各 50 分
- 实际结果:

```json
{
  "status": "pending",
  "total": null
}
```

- 具体含义: 只有八项 Claude 评价贡献分数，人工字段保持空位
- 对下一步影响: validator 将重算维度、总分和风险门禁

### 步骤 1

- 工具: score_game_evaluation.py
- 参数:

```json
{
  "coverage": 0.875,
  "profileId": "test8-24-v2-slice-008-slice-v1"
}
```

- 输出:

```json
{
  "status": "pending",
  "total": null
}
```

- 具体含义: 只有八项 Claude 评价贡献分数，人工字段保持空位
- 对下一步影响: validator 将重算维度、总分和风险门禁

## validate

- 目标: 校验评价报告契约和阶段门禁
- 输入:

```json
{
  "reportId": "test8-24-v2-slice-008-slice-v1-report"
}
```

- 执行方式: validate_game_evaluation_report.py
- 预期输出: 报告结构、证据和分数一致
- 实际结果:

```json
{
  "status": "partial",
  "total": null
}
```

- 具体含义: 报告可以作为当前评价结果使用，但人工评价仍独立保存
- 对下一步影响: 根据 decision 进入报告、改进或重测流程

### 步骤 1

- 工具: validate_game_evaluation_report.py
- 参数:

```json
{
  "reportId": "test8-24-v2-slice-008-slice-v1-report"
}
```

- 输出:

```json
{
  "status": "partial",
  "total": null
}
```

- 具体含义: 报告可以作为当前评价结果使用，但人工评价仍独立保存
- 对下一步影响: 根据 decision 进入报告、改进或重测流程

## score

- 目标: 按 Claude 外部评价汇总分数
- 输入:

```json
{
  "coverage": 0.875,
  "profileId": "test8-24-v2-slice-008-slice-v1"
}
```

- 执行方式: score_game_evaluation.py
- 预期输出: artStyle 和 playerFun 各 50 分
- 实际结果:

```json
{
  "status": "pending",
  "total": null
}
```

- 具体含义: 只有八项 Claude 评价贡献分数，人工字段保持空位
- 对下一步影响: validator 将重算维度、总分和风险门禁

### 步骤 1

- 工具: score_game_evaluation.py
- 参数:

```json
{
  "coverage": 0.875,
  "profileId": "test8-24-v2-slice-008-slice-v1"
}
```

- 输出:

```json
{
  "status": "pending",
  "total": null
}
```

- 具体含义: 只有八项 Claude 评价贡献分数，人工字段保持空位
- 对下一步影响: validator 将重算维度、总分和风险门禁

## validate

- 目标: 校验评价报告契约和阶段门禁
- 输入:

```json
{
  "reportId": "test8-24-v2-slice-008-slice-v1-report"
}
```

- 执行方式: validate_game_evaluation_report.py
- 预期输出: 报告结构、证据和分数一致
- 实际结果:

```json
{
  "status": "partial",
  "total": null
}
```

- 具体含义: 报告可以作为当前评价结果使用，但人工评价仍独立保存
- 对下一步影响: 根据 decision 进入报告、改进或重测流程

### 步骤 1

- 工具: validate_game_evaluation_report.py
- 参数:

```json
{
  "reportId": "test8-24-v2-slice-008-slice-v1-report"
}
```

- 输出:

```json
{
  "status": "partial",
  "total": null
}
```

- 具体含义: 报告可以作为当前评价结果使用，但人工评价仍独立保存
- 对下一步影响: 根据 decision 进入报告、改进或重测流程

## score

- 目标: 按 Claude 外部评价汇总分数
- 输入:

```json
{
  "coverage": 0.875,
  "profileId": "test8-24-v2-slice-008-slice-v1"
}
```

- 执行方式: score_game_evaluation.py
- 预期输出: artStyle 和 playerFun 各 50 分
- 实际结果:

```json
{
  "status": "pending",
  "total": null
}
```

- 具体含义: 只有八项 Claude 评价贡献分数，人工字段保持空位
- 对下一步影响: validator 将重算维度、总分和风险门禁

### 步骤 1

- 工具: score_game_evaluation.py
- 参数:

```json
{
  "coverage": 0.875,
  "profileId": "test8-24-v2-slice-008-slice-v1"
}
```

- 输出:

```json
{
  "status": "pending",
  "total": null
}
```

- 具体含义: 只有八项 Claude 评价贡献分数，人工字段保持空位
- 对下一步影响: validator 将重算维度、总分和风险门禁

## validate

- 目标: 校验评价报告契约和阶段门禁
- 输入:

```json
{
  "reportId": "test8-24-v2-slice-008-slice-v1-report"
}
```

- 执行方式: validate_game_evaluation_report.py
- 预期输出: 报告结构、证据和分数一致
- 实际结果:

```json
{
  "status": "partial",
  "total": null
}
```

- 具体含义: 报告可以作为当前评价结果使用，但人工评价仍独立保存
- 对下一步影响: 根据 decision 进入报告、改进或重测流程

### 步骤 1

- 工具: validate_game_evaluation_report.py
- 参数:

```json
{
  "reportId": "test8-24-v2-slice-008-slice-v1-report"
}
```

- 输出:

```json
{
  "status": "partial",
  "total": null
}
```

- 具体含义: 报告可以作为当前评价结果使用，但人工评价仍独立保存
- 对下一步影响: 根据 decision 进入报告、改进或重测流程

