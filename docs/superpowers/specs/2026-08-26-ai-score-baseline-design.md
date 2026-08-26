# AI Score Baseline Design

## Goal

Add a minimal, AI-only score baseline workflow that runs the same Eval Case three times by default, saves score statistics, and compares later samples against that baseline without adding PASS/FAIL gates or changing the existing human-rating workflow.

## Product Boundary

The existing `npm run eval` remains unchanged: one AI evaluation creates Progression, Problem, Result, and one human-rating session.

Two new commands are added:

```bash
npm run eval:baseline -- --case paws-patience-r97 --runs 3
npm run eval:compare -- --case paws-patience-r97 --runs 3
```

Both commands are AI-only. They do not create Markdown documents, player sessions, or human scores. They print core, experience, and total mean scores, sample standard deviations, and the baseline/current differences. They never print PASS, FAIL, regression, or merge-blocking conclusions.

The first version is CLI-only. The player-rating page is unchanged.

## Sampling

Each command loads one frozen Eval Case, its Prompt, Rubric, Schema, and GDD, then invokes the selected provider sequentially `N` times with identical inputs. The default is `3`; accepted values are `2-20`.

Sequential execution avoids overlapping local CLI sessions and rate-limit pressure. If any sample fails, the command fails and does not create or update a baseline. Successful samples retain:

- run index;
- core, experience, and total scores;
- requested and observed model;
- start/end time and duration;
- raw-output SHA-256, without duplicating the full AI JSON in the baseline file.

## Statistics

For each score dimension, store and display:

- input values;
- arithmetic mean, rounded to one decimal;
- sample standard deviation using denominator `N - 1`, rounded to one decimal;
- minimum and maximum.

Comparison difference is `current mean - baseline mean`, rounded to one decimal. A positive difference means the current sample is higher. No tolerance or significance judgment is produced.

## Baseline Storage

Baselines are JSON files under:

```text
docs/gdd-edd/baselines/<case-id>/<provider>-<requested-model>.json
```

Unsafe filename characters are normalized. The document contains:

- schema version and creation time;
- Eval Case identity;
- provider and requested model;
- all observed model names;
- GDD, Prompt, Rubric, Schema, and Result Template hashes;
- sample records and aggregate statistics.

Creating a baseline refuses to overwrite an existing file unless `--force` is supplied. Writes are atomic and followed by JSON readback.

## Comparison Compatibility

`eval:compare` requires the baseline to have the same schema version, case id, provider, requested model, and GDD hash. This preserves the causal question: “Did Prompt, model behavior, or pipeline changes affect scores on the same GDD?”

Prompt, Rubric, Schema, Result Template, and observed-model hash/name changes are allowed but listed in the output as configuration changes. This is essential for detecting silent model changes. A changed GDD requires a separate Eval Case and baseline.

## Output

Baseline output:

```text
AI BASELINE
Case: paws-patience-r97
Runs: 3
Core: 30.3 +/- 1.5
Experience: 24.0 +/- 1.0
Total: 54.3 +/- 2.1
Saved: docs/gdd-edd/baselines/...
```

Comparison output:

```text
AI SCORE COMPARISON
Case: paws-patience-r97
Runs: 3
Metric       Baseline       Current        Difference
Core         30.3 +/- 1.5   29.7 +/- 0.6   -0.6
Experience   24.0 +/- 1.0   23.3 +/- 0.6   -0.7
Total        54.3 +/- 2.1   53.0 +/- 1.0   -1.3
Changes: observed model
```

ASCII `+/-` is used in terminal output for portability.

## Components

- `src/eval-statistics.mjs`: deterministic statistics and comparison formatting.
- `src/eval-baseline-store.mjs`: filename resolution, compatibility validation, atomic baseline writes, and readback.
- `src/eval-sampling.mjs`: shared CLI parsing, repeated AI-only execution, baseline creation, and comparison orchestration.
- `package.json`: `eval:baseline` and `eval:compare` scripts.

Existing `ai-evaluator.mjs`, Eval Case loading, Prompt rendering, and asset hashing are reused. Existing Result/Problem/Progression and player-rating code is not coupled to baseline storage.

## Errors

The CLI reports and exits nonzero for invalid run counts, unknown options, missing baselines, incompatible case/provider/model/GDD, existing baseline without `--force`, sample failure, invalid baseline JSON, and failed readback. It does not leave a partially written baseline.

## Testing

- Statistics tests cover mean, sample standard deviation, min/max, rounding, and score differences.
- Store tests cover stable safe paths, overwrite protection, atomic roundtrip, and compatibility errors.
- Sampling tests use injected evaluators to prove exactly `N` sequential calls, unchanged inputs, aggregation, no Markdown/session creation, output formatting, configuration-change reporting, and no baseline write after a failed sample.
- CLI tests cover both package-script modes and all supported arguments.
- Full `npm run check` and `git diff --check` must pass.

## Known Limitation

With only `paws-patience-r97`, the result describes variance on one GDD, not general evaluator correctness. Following official OpenAI eval guidance, broader confidence requires additional representative cases and human ground truth ranges. That expansion is intentionally outside this minimal version.
