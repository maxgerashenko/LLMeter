# Local runtime coding test: quick standard suite

Status: run rules v0.3, written 2026-11-18. The tasks themselves are in a separate, frozen folder: [tasks/local-coding-v1](../tasks/local-coding-v1/README.md) (suite version 1.0.0, with starter files, hidden tests, reference solutions and a grader). No model has been run yet. Results go to `data/local-runtime-results-<date>.csv`; models to test are in [local-test-models.csv](local-test-models.csv).

## Scope

All text models in LM Studio and TensorFold are tested, except vision models (Qwen3-VL 8B, GLM-4.6V Flash) and the uncensored fine-tune (Qwen3.8 27B Uncensored). Video models (Wan) are not language models and are out. Model ID M05 was removed; IDs are not renumbered.

## Purpose

Run the same short, hard-enough coding suite on every local model, in LM Studio and in TensorFold (an LM Studio analogue: a local app with its own native server, `tensorfold-native serve`), with thinking on and off. The suite must separate good models from great ones and finish in about 10 to 15 minutes per model configuration.

## Design: short but discriminating

- 10 tasks in Python 3 with pytest. Each starts from 1 to 4 small files (under 250 lines in total) given in the prompt. The model answers with complete changed files. No agent harness, so the same prompt goes to every model and runtime.
- Hard to think about, short to write. Running time is set almost entirely by output tokens, so every task is built to need a small answer (target under 150 lines of code) while the reasoning is what is difficult. Difficulty comes from edge cases, hidden constraints and root causes that sit away from the symptom, not from volume of code.
- Weighted to the top. Hard tasks carry 15 of 23 weight points (65%), so the best model separates from the rest instead of everything bunching near the top.
- Three difficulty levels. Easy tasks catch broken setups (wrong chat template, truncated output). Hard tasks separate the best models: a hard task is one where mid-size models usually pass only part of the hidden tests.
- Hidden tests give **partial credit**: score = share of hidden tests gained over the starter files, not pass or fail. This keeps small differences visible.
- One attempt per task by default, temperature 0.2, fixed seed where the runtime supports it. Re-run only close pairs (under 5 points apart) with 3 attempts.
- Limits per task: 4,000 output tokens with thinking off; 12,000 tokens (thinking included) with thinking on; 5 minutes wall time. A truncated or timed-out answer scores 0 for that task.

## Tasks

| ID | Level | Weight | Task | What it tests | Hidden tests |
| --- | --- | --- | --- | --- | --- |
| q01 | Easy | 1 | Fix a function that merges date intervals: it fails on unsorted, touching and nested intervals. | Reading code, small fix, output format | 12 |
| q02 | Easy | 1 | Add a CSV-row constructor to a class, in the style of its existing constructor. | Following conventions, reuse | 15 |
| q03 | Medium | 2 | Find and fix three seeded bugs (off-by-one, mutable default argument, rounding) in an inventory module. | Careful reading, no collateral changes | 18 |
| q04 | Medium | 2 | Move and rename a public API across a four-file package; old names keep working with a deprecation warning attributed to the caller. | Multi-file consistency | 14 |
| q05 | Medium | 2 | A failing test is given for a pricing module. The root cause is in a helper two calls away from the symptom. | Tracing cause through code, minimal diff | 12 |
| q06 | Hard | 3 | Expression evaluator: precedence, right-associative `**`, unary minus, functions, and exact error positions. | Spec reading, edge cases | 76 |
| q07 | Hard | 3 | Task scheduler: dependencies, worker limit, priority and name tie-breaks, cycle reporting, 100,000 tasks within a time limit. | Algorithm design plus performance | 27 |
| q08 | Hard | 3 | Fix an asyncio limiter that over-admits, lets newcomers jump the queue and breaks on cancellation. | Concurrency reasoning | 12 |
| q09 | Hard | 3 | Version-constraint solver (caret, tilde, comparisons) with a fixed backtracking order. | Search, backtracking, precise rules | 45 |
| q10 | Hard | 3 | Unified-diff applier: line offsets, drift, fuzz up to 2, missing final newline, rejected hunks. | Precise format handling, many edge cases | 45 |

The exact prompts, starter files and hidden tests are in [tasks/local-coding-v1](../tasks/local-coding-v1/README.md). That folder is frozen: the same files are used for this run and for any model tested later, and a change means a new suite version whose scores are not compared with version 1.

Total weight 23 (easy 2, medium 6, hard 15). A task's score is the share of hidden tests gained over the untouched starter files, so a reply that changes nothing scores 0. Run score = sum(weight × task score) / 23, as a percentage. Report the per-level score too: a model that gets 100% on the easy tasks but under 50% on the hard ones is a different result from one that fails q01.

## Time budget

| | Thinking off | Thinking on |
| --- | --- | --- |
| Output cap per task | 4,000 tokens | 12,000 tokens |
| Wall-time cap per task | 5 minutes | 5 minutes |
| Worst case, 10 tasks, 1 slot | 50 minutes | 50 minutes |
| Worst case, 10 tasks, 4 slots | about 15 minutes | about 15 minutes |
| Target for a typical run, 4 slots | under 10 minutes | under 15 minutes |

Typical running time is roughly total output tokens divided by (tokens per second × slots). The targets are estimates until the first runs measure real speeds.

## Calibration before the full run

The difficulty levels above are a design intent, not a measured fact. Before testing every model, run a pilot with three models: one expected to be strong (Qwen3.8 27B), one middle (Qwen3-Coder 30B) and one weak (Llama 3.1 70B). Then adjust:

- A task every pilot model passes fully is too easy to separate models: keep at most two such tasks as setup checks and harden or replace the rest.
- A task every pilot model fails fully is too hard to separate models: simplify it or add partial-credit tests.
- A task that regularly hits the token or time cap is too long: cut its scope, not its difficulty.
- The suite is frozen as version 1.0.0. If the pilot shows a task must change, the change goes into a new version (`tasks/local-coding-v2`), and results from different versions are not compared.

## Run matrix

For each model in `local-test-models.csv`, run every cell that applies:

| Axis | Values |
| --- | --- |
| Runtime | LM Studio; TensorFold (only where the CSV says it loads) |
| Thinking | off; on (only where `thinking_switch` is yes or unknown) |
| Parallel requests | 1 for the speed baseline; then up to 4 (the CSV column `max_parallel_64gb`) |

Order: run the quality pass with the model's `max_parallel_64gb` requests in flight (the 10 tasks are queued across the slots, so the suite finishes sooner). Then run one speed pass at 1 request and one at the maximum, with the same prompt, recording tokens per second.

How parallel is capped: the Mac has 64 GB. Reserve about 12 GB for macOS and the test runner. Each extra slot adds KV cache. Use 4 slots when weights are 25 GB or less, 2 slots for 25 to 35 GB, 1 slot above that. If a run hits memory pressure (swap growth or an out-of-memory error), halve the slots and re-run; record the final number.

## Isolation for every run

Each run must see an otherwise empty machine:

1. Quit the other app (LM Studio when testing TensorFold, TensorFold when testing LM Studio). Do not leave a server running in the background.
2. In LM Studio: unload everything (`lms unload --all`), load only the model under test, and confirm with `lms ps` that exactly one model is loaded.
3. In TensorFold: serve only the model under test (`tensorfold-native serve MODEL`), one server process.
   Rule for all runs: exactly one model in memory, in one runtime. Eject every other model in the same app, and quit the other app. Turn off LM Studio's just-in-time model loading, so a request cannot load a second model by name.
4. Close other heavy apps (browsers with many tabs, other models, the Pixel Agents office is light and may stay).
5. Record free memory and swap before the run, and peak memory after.
6. Wait for a cool-down (2 minutes or until fan and clocks settle) between models, so thermal throttling does not decide the ranking.
7. Fresh load for each configuration: load time is recorded and is not part of the speed numbers.

## Settings to pin

| Setting | LM Studio | TensorFold |
| --- | --- | --- |
| Context | model's maximum (`max_context_tokens` in the CSV) | `--context <max_context_tokens>` |
| Temperature, top_p, top_k | 0.2, 0.95, 40 | `--temperature 0.2 --top-p 0.95 --top-k 40` |
| Thinking | model's reasoning toggle in the chat template | `--thinking` / `--no-thinking` |
| Parallel | Max concurrent predictions (set in model load options) | `--parallel N` |
| Max tokens | per request, from the limits above | `--max-tokens` |
| Draft model | off | `--no-drafts` for the main comparison; a separate row with drafter on for M02 |

Both apps expose an OpenAI-compatible chat API, so one runner script can send the same requests to either (LM Studio default `http://localhost:1234/v1`; TensorFold port set with `--port`).

## Context: maximum for each model

Every model loads with its own maximum context, read from its `config.json` (`max_context_tokens` in [local-test-models.csv](local-test-models.csv): 262,144 for most Qwen models and Nemotron, 202,752 for GLM-4.7 Flash, 131,072 for Llama 3.1, 524,288 for Nanbeige). The test prompts are short, so only the reserved cache size changes, not the answers.

Memory warning: the KV cache grows with context and with parallel slots. Full-attention models such as Llama 3.1 70B need about 43 GB of KV cache at 131,072 tokens, on top of 37 GB of weights, which does not fit in 64 GB if it is fully reserved. GGUF models in LM Studio reserve the whole cache at load. If a model fails to load or memory pressure appears at maximum context, lower the context in steps (halve it), and write the context actually used into the results file. The `max_parallel_64gb` column is a first guess and must be confirmed at the maximum context.

## Result file columns

`date, model_id, runtime, runtime_version, thinking, parallel, context_tokens, task_id, tests_passed, tests_total, score, wall_seconds, prompt_tokens, output_tokens, gen_tok_per_s, prompt_tok_per_s, load_seconds, peak_mem_gb, end_reason, notes`

`end_reason` is one of: finished, truncated, timeout, error.

## Open items

- Write the runner script that sends the prompts to LM Studio and TensorFold, saves the replies and records speed and memory (not started). Prompts and grading already work: `python3 tasks/local-coding-v1/grade.py`.
- Download Nemotron 3.5 Lightning in LM Studio so M01 runs in both runtimes.
- Add TensorFold (version 1.2.0 engine) to `RESOURCES.md` with a source link; there is no public link yet.
- Confirm that LM Studio and TensorFold weights are byte-identical for M02 (compare file hashes).
