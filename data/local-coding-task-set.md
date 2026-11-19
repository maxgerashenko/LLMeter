# Local runtime coding test: quick standard suite

Status: run rules v0.4, written 2026-11-18 (v0.4: 15-minute wall time for thinking-on runs, streamed replies, context at 80% of the maximum). The tasks themselves are in a separate, frozen folder: [tasks/local-coding-v1](../tasks/local-coding-v1/README.md) (suite version 1.0.0, with starter files, hidden tests, reference solutions and a grader). First runs: 2026-11-18 (TensorFold: M01 and M02, thinking off and on; LM Studio: M02, M07, M08, M09 and M10). Runs are made with `scripts/run_local_suite.py`. Results go to `data/local-runtime-results.csv` (one file for all runs, one row per task, a date on every row; the site's Runs page reads it); models to test are in [local-test-models.csv](local-test-models.csv).

## Scope

All text models in LM Studio and TensorFold are tested, except vision models (Qwen3-VL 8B, GLM-4.6V Flash) and the uncensored fine-tune (Qwen3.8 27B Uncensored). Video models (Wan) are not language models and are out. Model IDs M03, M04, M05, M06 and M12 were removed, and IDs are not renumbered. M04 (Qwen3.6 27B) and M12 (Llama 3.1 70B) are no longer installed (checked 2026-11-18). M03 (Qwen3.8 27B, MLX 6-bit) has its files on disk, but LM Studio does not list or load it. M06 (Qwen3.6 35B A3B, GGUF) cannot be selected with `lms load`.

## Purpose

Run the same short, hard-enough coding suite on every local model, in LM Studio and in TensorFold (an LM Studio analogue: a local app with its own native server, `tensorfold-native serve`), with thinking on and off. The suite must separate good models from great ones and finish in about 10 to 15 minutes per model configuration.

## Design: short but discriminating

- 10 tasks in Python 3 with pytest. Each starts from 1 to 4 small files (under 250 lines in total) given in the prompt. The model answers with complete changed files. No agent harness, so the same prompt goes to every model and runtime.
- Hard to think about, short to write. Running time is set almost entirely by output tokens, so every task is built to need a small answer (target under 150 lines of code) while the reasoning is what is difficult. Difficulty comes from edge cases, hidden constraints and root causes that sit away from the symptom, not from volume of code.
- Weighted to the top. Hard tasks carry 15 of 23 weight points (65%), so the best model separates from the rest instead of everything bunching near the top.
- Three difficulty levels. Easy tasks catch broken setups (wrong chat template, truncated output). Hard tasks separate the best models: a hard task is one where mid-size models usually pass only part of the hidden tests.
- Hidden tests give **partial credit**: score = share of hidden tests gained over the starter files, not pass or fail. This keeps small differences visible.
- One attempt per task by default, temperature 0.2, fixed seed where the runtime supports it. Re-run only close pairs (under 5 points apart) with 3 attempts.
- Limits per task, thinking off: 4,000 output tokens and 5 minutes wall time.
- Limits per task, thinking on: 12,000 output tokens (thinking included) and 15 minutes wall time. The longer wall time was set on 2026-11-18, after the first thinking run: at about 16 tokens per second, 5 minutes allow only about 4,800 tokens, so every task timed out before the answer started. 15 minutes allow about 14,400 tokens, enough for the whole token budget.
- A truncated or timed-out answer scores 0 for that task. Replies are read as a stream, so the text and token count produced before a timeout are still saved with the run.
- Thinking-on and thinking-off scores are measured under different limits. Compare a model with another model in the same thinking mode; when comparing the two modes of one model, state both limits.

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
| Wall-time cap per task | 5 minutes | 15 minutes |
| Worst case, 10 tasks, 1 slot | 50 minutes | 150 minutes |
| Worst case, 10 tasks, 4 slots | about 15 minutes | about 45 minutes |
| Target for a typical run, 4 slots | under 10 minutes | under 30 minutes |

Typical running time is roughly total output tokens divided by (tokens per second × slots). The targets are estimates until the first runs measure real speeds.

## Calibration before the full run

The difficulty levels above are a design intent, not a measured fact. Before testing every model, run a pilot with three models: one expected to be strong (Qwen3.8 27B), one middle (Qwen3-Coder 30B) and one weak (Nemotron 3.5 Lightning 30B; the first choice, Llama 3.1 70B, is no longer installed). Then adjust:

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
| Context | 80% of the model's maximum (`max_context_tokens` in the CSV) | `--context <80% of max_context_tokens>` |
| Temperature, top_p, top_k | 0.2, 0.95, 40 | `--temperature 0.2 --top-p 0.95 --top-k 40` |
| Thinking | model's reasoning toggle in the chat template | `--thinking` / `--no-thinking` |
| Parallel | Max concurrent predictions (set in model load options) | `--parallel N` |
| Max tokens | per request, from the limits above | `--max-tokens` |
| Draft model | off | `--no-drafts` for the main comparison; a separate row with drafter on for M02 |

Both apps expose an OpenAI-compatible chat API, so one runner script can send the same requests to either (LM Studio default `http://localhost:1234/v1`; TensorFold port set with `--port`).

## Context: 80% of the maximum for each model

Context comes first, parallel requests second: every model loads with 80% of its maximum context (209,715 tokens for a 262,144-token model), and then with as many parallel requests as still fit in memory (4, then 2, then 1). In the first runs Qwen3.8 27B fitted only 1 request at this context; Nemotron 3.5 Lightning fitted 4. The maximum is read from its `config.json` (`max_context_tokens` in [local-test-models.csv](local-test-models.csv): 262,144 for most Qwen models and Nemotron, 202,752 for GLM-4.7 Flash, 524,288 for Nanbeige). The test prompts are short, so only the reserved cache size changes, not the answers.

Memory warning: the KV cache grows with context and with parallel slots. A large full-attention model can need more KV cache than fits in 64 GB next to its weights if the cache is fully reserved. GGUF models in LM Studio reserve the whole cache at load. If a model fails to load or memory pressure appears at maximum context, lower the context in steps (halve it), and write the context actually used into the results file. The `max_parallel_64gb` column is a first guess and must be confirmed at the maximum context.

## Result file columns

`date, model_id, runtime, runtime_version, thinking, parallel, context_tokens, task_id, tests_passed, tests_total, score, wall_seconds, prompt_tokens, output_tokens, gen_tok_per_s, prompt_tok_per_s, load_seconds, peak_mem_gb, end_reason, hardware, notes`

`score` is the task score from 0 to 1 as the grader reports it. `hardware` names the machine and its memory, for example `MacBook Pro M5 Pro, 64 GB`. The Runs page groups rows into one run per date, model, runtime, thinking setting and parallel count, and computes the run score with the suite weights.

`end_reason` is one of: finished, truncated, timeout, error.

## Open items

- LM Studio, thinking off: not available. Checked on 2026-11-18 with Qwen3.8 27B in LM Studio 0.4.28: none of the request settings tried (`reasoning.effort`, `chat_template_kwargs.enable_thinking`, `enable_thinking`, `/no_think` in the prompt, `thinking_budget`) reduced the reasoning text. So in LM Studio a model with a thinking mode is run with thinking on only, and a model without one (Qwen3-Coder, Qwen3-Next) is recorded as thinking off. A thinking-off comparison between the two runtimes is therefore not possible yet.
- LM Studio, parallel requests: with 4 requests in flight each one gets about a quarter of the speed (about 7 tokens per second for Qwen3.8 27B), so thinking-on tasks hit the 15-minute limit before the answer. Qwen3.8 27B and Nanbeige4.3 33B were therefore run again with 1 request at a time (about 16.7 and 13 tokens per second). The scores did not change (13.0 and 8.7): Qwen3.8 27B now reaches the 12,000-token limit on 8 of 10 tasks instead of the time limit, and Nanbeige4.3 33B is still too slow to produce 12,000 tokens in 15 minutes. With thinking on, the token budget, not the number of parallel requests, decides these scores; the same Qwen3.8 27B build scores 13.0 in both runtimes.
- GLM-4.7 Flash in LM Studio: tasks q09 and q10 were interrupted by an operator mistake in the first attempt and were run again alone (2 requests in flight instead of 4). Both hit the 12,000-token limit, so the run score did not change.
- Qwen3-Next 80B was run with a hand-loaded model, not under the context rule. `lms load` is refused at every context size tried, from 4,096 to 209,715 tokens: LM Studio estimates 58.49 GiB each time and its memory guardrail stops the load on this 64 GB Mac. The model does load from the LM Studio app (44.86 GB), so it was loaded there by hand with a 14,604-token context and 4 parallel requests, and the runner tested that copy (`--use-loaded`). Its rows record context 14,604 and no load time. The test prompts are short, so the smaller context does not cut any prompt or answer, but the run is not a like-for-like memory or speed comparison with models loaded at 80% of their maximum context.
- LM Studio models that could not be run: Qwen3.6 35B A3B, GGUF build (`lms load` does not find the `@q4_k_m` variant that `lms ls` lists, so only the MLX build can be loaded from the command line).
- Measure peak memory for the whole model (the `peak_mem_gb` column is empty so far) and prompt speed (`prompt_tok_per_s`).
- Download Nemotron 3.5 Lightning in LM Studio so M01 runs in both runtimes.
- Add TensorFold (version 1.2.0 engine) to `RESOURCES.md` with a source link; there is no public link yet.
- Confirm that LM Studio and TensorFold weights are byte-identical for M02 (compare file hashes).
