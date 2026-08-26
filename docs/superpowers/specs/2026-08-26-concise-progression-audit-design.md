# Concise Progression Audit Design

## Goal

Replace the unchanged, heavyweight Progression contract with a concise Chinese audit record that preserves reproducible execution facts without duplicating formal scores, problem details, or the full AI JSON.

## Scope

This change applies to GDD evaluation runs created by `player-rating-web`. It keeps the existing three Markdown documents and two-dimension human rating flow. It does not add baseline comparison, repeated sampling, regression gates, archive workflow, or hidden reasoning capture.

## Ownership Boundaries

- The AI remains read-only and returns schema-constrained JSON.
- Node owns audit collection, evidence persistence, document generation, session creation, and rating synchronization.
- `Progression.md` contains execution facts only.
- `Problem.md` contains evidence-backed issues.
- `Result.md` contains AI scores, human scores, and combined scores.
- The complete AI JSON is written as a sidecar evidence file under `progress/evidence/`; Progression records its relative path and SHA-256.

## Progression Content

Every successful Progression contains:

1. Execution identity: evaluation id, Eval Case, goal, provider, requested and observed model, start/end time, duration, status, and exit code.
2. Fixed inputs: GDD, Prompt, Rubric, Schema, and Result template paths and SHA-256 hashes.
3. Applied Prompt: the exact rendered Prompt in a collapsed block.
4. Ordered execution facts: case/assets loaded, AI invoked, observable provider events, schema validated, AI evidence written, three documents written, document readback completed, and player rating session created.
5. Evidence and outputs: AI JSON sidecar path/hash plus Progression, Problem, and Result paths.
6. Exceptions: only present when a failure, retry, skip, changed route, explicit assumption, or unresolved uncertainty actually occurred.
7. Next action: review Result and distribute the human rating link. The public session token and URL are not written to Progression.

Progression must not contain AI scores, player scores, combined scores, duplicated Problem rows, the complete AI JSON, credentials, signed URLs, session tokens, or hidden chain-of-thought.

## Execution Recording

Node maintains an ordered list of concise audit events. Each event has a step number, component, action, status, and result summary. Provider tool events are retained in observable order with review-relevant, redacted parameters. `thinking`, reasoning text, structured-output duplication, and secrets are excluded.

The versioned Prompt is the auditable human instruction accepted by the CLI. Runtime overrides are the selected case, provider, and model. The CLI does not claim to capture conversation history it did not receive.

## Success Flow

1. Load and validate the Eval Case and fixed assets.
2. Allocate the evaluation id and begin the audit record.
3. Invoke the provider and collect observable events.
4. Validate the returned JSON against the case and schema contract.
5. Write and read back the AI JSON evidence sidecar.
6. Render and atomically write Progression, Problem, and Result.
7. Read back Problem and Result and verify expected evaluation identifiers; record the result.
8. Create and start the human rating session.
9. Atomically finalize Progression with the completed event list and output paths.

Progression's own final atomic write is reported from the filesystem operation. Result, Problem, and the AI evidence sidecar receive explicit readback verification.

## Failure Flow

Once an evaluation id has been allocated, any AI, validation, evidence-write, document-write, readback, or session-creation failure writes a failure Progression using the events collected so far. The record includes the failed step, a redacted error summary, incomplete outputs, and the retry command. Failures before an evaluation id can be allocated remain CLI input errors because no specific GDD evaluation run exists yet.

If the failure Progression itself cannot be written, the CLI reports both the original failure and audit-write failure without claiming an audit record exists.

## Human Rating Synchronization

Rating submission continues to update scores in Result. Progression receives only a concise synchronization fact: timestamp, effective sample count, Result path, and successful write status. It does not repeat dimension or final scores.

## Documentation Contract

`docs/gdd-edd/progress/README.md` will be rewritten to match this design. The old mandatory sections for exhaustive decisions, assumptions, doubts, Problem identifiers, and archive state are replaced by conditional exception recording. Completeness is based on observable facts actually available to the CLI.

## Testing

- Renderer tests assert Progression contains identity, hashes, Prompt, ordered facts, evidence path/hash, outputs, and next action.
- Renderer tests assert Progression excludes all AI/player/combined scores and the complete AI JSON.
- Orchestration tests assert successful evidence persistence, readback verification, and session events.
- Failure tests assert an allocated run writes a failure Progression with the failed step and retry location.
- Rating synchronization tests assert Progression records synchronization without scores.
- Existing provider tests continue to assert hidden reasoning and `StructuredOutput` events are excluded.
- The full `npm run check` suite and `git diff --check` must pass.
