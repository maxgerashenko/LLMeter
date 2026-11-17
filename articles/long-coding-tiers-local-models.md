# Long coding tasks: intelligence tiers and the best local model in each

*Written 2026-11-17. All data read on 2026-11-17. Data file: [data/long-coding-tasks-2026-11-17.csv](../data/long-coding-tasks-2026-11-17.csv).*

## Summary

LLMeter now compares models on **long coding tasks**: multi-step agent work in real repositories and terminals, where one task takes an agent tens of minutes and hundreds of steps. On that basis, with **Claude Sonnet 5.5** (cloud) as the top tier, the best model you can run yourself in each tier is:

| Tier | Long-coding score vs. Sonnet 5.5 | Intelligence Index (Coding Agent Index) | Best local model | Params (B) |
| --- | --- | --- | --- | --- |
| **Max** (cloud reference) | 100% | 55 (56.3) | Claude Sonnet 5.5 (not local) | not published |
| **Tier 4: near-frontier** | 75% or more | 46.5 (48.6) | Kimi K3.1 Pro (88%) | 2,800B (104B active) |
| **Tier 3: strong** | 55% to 75% | 31.7 (40.1) | GLM-5.3 (60%) | 753B (40B to 54B active) |
| **Tier 2: capable** | 40% to 55% | 28.6 | Qwen3.8-Flash-Next (50%) | 180B (6.7B active) |
| **Tier 1: assistant** | 20% to 40% | 20.4 | Nanbeige4.3-33B (38%) | 33B |
| **Tier 0: below the bar** | under 20% | 20.1 | Qwen3.8 27B (19%) | 27B |

The first number is Artificial Analysis's Intelligence Index, a general index across all its evaluations, shown to rate every model on one scale; the number in brackets is the Coding Agent Index, where the model has one. It is not the basis of the tiers: it ranks Nanbeige4.3-33B and Qwen3.8 27B as equals (20.4 vs 20.1) although Nanbeige is about twice as good on long coding tasks. The data table below gives the Intelligence Index for every model.

Hardware for each pick is in [The picks, with hardware](#the-picks-with-hardware).

The tiers are a judgement call (see [How tiers are defined](#how-tiers-are-defined)). The picks are the highest-scoring open-weights model in each band, with ties broken by how little hardware it needs.

Two findings stand out:

- **The gap at the top is small, but the hardware gap is not.** Kimi K3.1 Pro beats Sonnet 5.5 on Terminal-Bench 4.0 (67.2 vs 63.6) and reaches 86% of Sonnet's Coding Agent Index score, but it needs datacenter-class memory. Nothing that fits one personal machine gets past about 60% of Sonnet 5.5.
- **Most small and older open models fail long coding tasks outright.** Gemma 4 31B, gpt-oss-120b, Granite 4.2 8B and Gemma 4 E4B all score 0 on both Terminal-Bench 4.0 and FrontierCode 2.0. The one 33B exception is Nanbeige4.3-33B at 38%. These models may still be useful for completion or chat, but not for the long autonomous tasks this comparison is about.

## Why long coding tasks

Short benchmarks (single questions, one-function coding puzzles) are close to saturated for top models and say little about whether a model can finish real work on its own. METR's time-horizon work ([RESOURCES #3](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/)) shows that the length of task an agent can complete is the measure that keeps separating models, and it grew from minutes to hours between 2023 and 2026. So from now on LLMeter compares models on long, agentic coding tasks first.

How long are these tasks? On the Artificial Analysis Coding Agent Index, Claude Code with Sonnet 5.5 spent on average **87 minutes and 249 steps per task**; Kimi K3.1 Pro in Kimi Code CLI spent 42 minutes and 185 steps; GLM-5.3 in Opencode spent 53 minutes and 114 steps ([Artificial Analysis Coding Agents](https://artificialanalysis.ai/agents/coding-agents), read 2026-11-17). That is agent time, not expert human time, so it is not the same unit as METR's horizon.

## Which measures were used

Three measures, all from Artificial Analysis ([RESOURCES #2](https://artificialanalysis.ai/), read 2026-11-17):

| Measure | What it is | Coverage |
| --- | --- | --- |
| **Coding Agent Index v2.1** ([page](https://artificialanalysis.ai/agents/coding-agents), [methodology](https://artificialanalysis.ai/methodology/coding-agents-benchmarking)) | Equal-weight average of FrontierCode-AA 2.0 (132 tasks: changes to real open-source repositories, graded on whether a maintainer would merge them), Terminal-Bench 4.1 (66 terminal tasks) and SWE-Atlas-QnA-AA (124 repository Q&A tasks). Each model runs in a real harness (Claude Code, Codex, Kimi Code CLI, Opencode and so on), 3 attempts per task. | The most direct measure, but only 29 agent and model pairs; the smallest open model in it is DeepSeek V4.1 Flash. |
| **Terminal-Bench 4.0** ([page](https://artificialanalysis.ai/evaluations/terminalbench-4-0)) | Agentic terminal tasks across software engineering, ML, security and system administration, run by Artificial Analysis in its own harness as part of the Intelligence Index v5.0.1. | Every model in the Intelligence Index, including small open models. |
| **FrontierCode 2.0** ([page](https://artificialanalysis.ai/evaluations/frontiercode-2-0)) | Repository changes graded for merge quality, also part of the Intelligence Index. | Same as Terminal-Bench 4.0. |

Because the Coding Agent Index does not cover small local models, the tiers use a **long-coding score**: the plain average of Terminal-Bench 4.0 and FrontierCode 2.0, expressed as a percentage of Sonnet 5.5's score (63.6 and 41.7, average 52.7). Where a model also has a Coding Agent Index score, the two agree on the ranking of the top open models (Kimi K3.1 Pro, then GLM-5.3, then DeepSeek V4.1 Flash), which gives some confidence that the simpler score is a fair stand-in.

METR time horizons were not used for the tiers, because the current METR data (Time Horizon 1.1, last updated 2026-09-08, [page](https://metr.org/time-horizons/), [raw data](https://metr.org/assets/benchmark_results_1_1.yaml)) has **no Sonnet 5.x and no open-weights model**. METR also says the page is no longer actively updated. See [Missing data](#missing-data-and-indirect-comparisons).

## The best benchmark for long coding tasks

**The Artificial Analysis Coding Agent Index v2.1 is the best fit**, so it is LLMeter's primary benchmark for long coding tasks wherever a model has a score. Reasons:

- It runs each model inside a real coding agent (Claude Code, Kimi Code CLI, Opencode and so on) rather than a bare API loop, which is how people use these models.
- Its tasks are long: 41 to 87 minutes and 100 to 250 steps per task for the top models.
- It mixes repository changes graded on merge quality, terminal work and repository understanding, three attempts per task, with checks for reward hacking.

Its limit is coverage: only about 29 agent and model pairs, with no model under 500B parameters. For models without a Coding Agent Index score, the tiers use the average of Terminal-Bench 4.0 and FrontierCode 2.0, two of its three parts, and say so. Where both exist the rankings agree.

## The data

Scores read from Artificial Analysis on 2026-11-17. "Long-coding score" is the average of Terminal-Bench 4.0 and FrontierCode 2.0. Parameters are in billions; where Artificial Analysis and LLM Sizer disagree, both are shown.

| Model | Open weights | Intelligence Index (Coding Agent Index) | Terminal-Bench 4.0 | FrontierCode 2.0 | Long-coding score | % of Sonnet 5.5 | Total / active params |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Fable 5.2 (Xhigh) | no | 62.2 (58.5) | 61.6 | 47.6 | 54.6 | 104% | not published |
| Claude Fable 5.2 (Max) | no | 64.6 (55.7) | 59.6 | 48.8 | 54.2 | 103% | not published |
| Claude Opus 5.5 (Max) | no | 59 (58.2) | 59.6 | 46.4 | 53.0 | 101% | not published |
| **Claude Sonnet 5.5 (Max)** | no | **55** (**56.3**) | **63.6** | **41.7** | **52.7** | **100%** | not published |
| Kimi K3.1 Pro | yes | 46.5 (48.6) | 67.2 | 25.5 | 46.4 | 88% | 2,800 / 104 |
| Claude Haiku 5.5 (Max) | no | 36.5 (29.6) | 32.8 | 34.9 | 33.8 | 64% | not published |
| GLM-5.3 (Max) | yes | 31.7 (40.1) | 41.9 | 21.6 | 31.8 | 60% | 753 / 40 (AA), 753 / 54 (LLM Sizer) |
| DeepSeek V4.1 Flash 1017 (Max) | yes | 32.6 (36.8) | 33.8 | 28.5 | 31.1 | 59% | 552 / 16 (AA), 763 / 25 (LLM Sizer) |
| MiMo-V2.6-Pro | yes | 29.9 | 34.8 | 24.0 | 29.4 | 56% | 1,020 / 42 |
| Qwen3.8-Flash-Next | yes | 28.6 | 25.3 | 27.1 | 26.2 | 50% | 180 / 6.7 |
| GLM-5.3-Flash | yes | 27.8 | 32.8 | 17.6 | 25.2 | 48% | 321 / 18 |
| Ling 3.1 Flash 1019 | yes | 29.6 | 32.8 | 17.0 | 24.9 | 47% | 560 to 572 / 25 |
| MiniMax-M3.1-Flash | yes | 29.1 | 25.8 | 20.8 | 23.3 | 44% | 428 (AA), 221 / 26 (LLM Sizer) |
| Step 5 Preview | yes | 28.5 (35.8) | 33.3 | 12.0 | 22.6 | 43% | 600 |
| MiMo-V2.6-Flash | yes | 26.7 | 22.7 | 21.6 | 22.1 | 42% | 309 |
| Nanbeige4.3-33B | yes | 20.4 | 29.8 | 10.7 | 20.2 | 38% | 33 dense |
| Mistral Large 4 (High) | yes | 26.1 (40.6) | 24.7 | 15.0 | 19.9 | 38% | 1,050 / 52 |
| Inkling 2 Small | yes | 30.6 | 13.1 | 25.4 | 19.2 | 36% | 594 / 17 to 24 |
| Qwen3.8 27B (Xhigh) | yes | 20.1 | 5.6 | 14.9 | 10.2 | 19% | 27 dense |
| Qwen3.6 27B (Reasoning) | yes | not scored | 0.0 | not run | n/a | about 0% (indirect) | 28 dense |
| Qwen3.5 27B (Reasoning) | yes | not scored | not run | not run | n/a | about 0% (indirect, see below) | 28 dense |
| Nemotron 3.5 Super VL | yes | 13.6 | 0.0 | 6.1 | 3.0 | 6% | 120 / 12 |
| gpt-oss-120b (High) | yes | 3.8 | 0.0 | 0.0 | 0.0 | 0% | 117 / 5 |
| Gemma 4 31B (Reasoning) | yes | 4.4 | 0.0 | 0.0 | 0.0 | 0% | 31 dense |
| Granite 4.2 8B | yes | 5.1 | 0.0 | 0.0 | 0.0 | 0% | 8 |
| Gemma 4 E4B (Reasoning) | yes | 4.8 | 0.0 | 0.0 | 0.0 | 0% | 8 |

Sources: [Coding Agent Index](https://artificialanalysis.ai/agents/coding-agents), [Terminal-Bench 4.0](https://artificialanalysis.ai/evaluations/terminalbench-4-0), model pages under [artificialanalysis.ai/models](https://artificialanalysis.ai/models), all read 2026-11-17; parameters also from [llm-sizer-data](https://github.com/alexgrankinukr-hash/llm-sizer-data) (`models/*.json`, read 2026-11-17).

## How tiers are defined

**This is a judgement call, not something a source defines.** The tiers are bands of the long-coding score as a share of Sonnet 5.5's score:

- **Max**: Sonnet 5.5 itself, as Max asked, even though it only runs in the cloud. Fable 5.2 and Opus 5.5 score slightly higher (see below), so "Max" means "the cloud model we compare against", not "the best model that exists".
- **Tier 4, near-frontier (75% or more)**: close enough to Sonnet 5.5 that it could stand in for it on most long tasks.
- **Tier 3, strong (55% to 75%)**: finishes a little over half of what Sonnet 5.5 finishes.
- **Tier 2, capable (40% to 55%)**: useful for long tasks with supervision.
- **Tier 1, assistant (20% to 40%)**: finishes some long tasks; better for shorter, well-scoped ones.
- **Tier 0, below the bar (under 20%)**: rarely finishes a long task.

The band edges were chosen where the data has natural gaps: nothing open sits between 60% and 88%, and there is a clear break between the 36% to 38% group and Qwen3.8 27B at 19%. Moving an edge by a few points would move at most one or two models.

**Best local model in a tier** means the open-weights model with the highest long-coding score in that band. When two are within 2 points (GLM-5.3 and DeepSeek V4.1 Flash), the Coding Agent Index breaks the tie, since it is the most direct measure of long agent work.

## The picks, with hardware

Memory figures come from LLM Sizer ([RESOURCES #1](https://www.theaibridges.com/tools/llm-sizer), [methodology](https://www.theaibridges.com/tools/llm-sizer/about), [data](https://github.com/alexgrankinukr-hash/llm-sizer-data), read 2026-11-17). Its rules: needed memory is the build's file size plus the context cache plus 1.5 GB plus 1% of the weights; on macOS 26 the GPU can use 84% of a 128 GB Mac, 87% of a 256 GB Mac and 464 GB of a 512 GB Mac by default. Long coding tasks build up long contexts, so each pick leaves room for the context cache.

### Max: Claude Sonnet 5.5 (cloud)

Coding Agent Index 56.3, Terminal-Bench 4.0 63.6, FrontierCode 2.0 41.7, Intelligence Index 55. Released 2026-09-28. Runs only through Anthropic's API or Claude Code, at $11.40 of API cost per Coding Agent Index task as measured by Artificial Analysis.

### Above Max: Claude Fable 5.2 (cloud)

Released 2026-11-09, so it is newer than Sonnet 5.5. At its best setting (Xhigh) it has the top Coding Agent Index score of any model (58.5, 104% of Sonnet 5.5), with Terminal-Bench 4.0 61.6 and FrontierCode 2.0 47.6, for a long-coding score of 54.6 (104%). Its Intelligence Index at Max effort is 65, the highest on the leaderboard.

Two details matter for long tasks:

- **It is ahead on repository changes, not on terminal work.** Fable 5.2 beats Sonnet 5.5 on FrontierCode 2.0 (47.6 vs 41.7) but is slightly behind on Terminal-Bench 4.0 (61.6 vs 63.6).
- **Max effort is not its best coding setting.** At Max effort its Coding Agent Index drops to 55.7 (below Sonnet), while cost rises to $44.22 per task and time to 130 minutes. Xhigh costs $15.47 and 53 minutes per task, and High scores almost the same (58.2) for $7.51 and 31 minutes. Sonnet 5.5 costs $11.40 and 87 minutes.

**Effect on the baseline:** Fable 5.2 is only about 4% above Sonnet 5.5, so Sonnet stays the 100% reference, as Max asked. Every local percentage would fall by about 4% if Fable were used instead, which would not move any model to another tier.

### Tier 4: Kimi K3.1 Pro

- **Score:** 88% of Sonnet 5.5. Coding Agent Index 48.6 (86% of Sonnet), and the best Terminal-Bench 4.0 score of any model measured (67.2). Its weak spot is FrontierCode 2.0 (25.5 vs 41.7), so it is better at terminal work than at producing merge-quality repository changes.
- **Hardware:** 2.8 trillion parameters, 104 billion active. At 4-bit that is roughly 1.5 TB (estimate: 2,780B × 0.56 bytes, LLM Sizer's rule of thumb for Q4). That means four 512 GB Mac Studio M5 Ultras linked together, or an 8-GPU datacenter server. LLM Sizer lists only a 2-bit build (UD-Q2_K_XL, 861 GB, for Kimi K3), which needs two linked 512 GB Mac Studios with the memory limit raised. In practice this is "local" only for a lab or company, not a person.
- **Caveat:** LLM Sizer lists "Kimi K3" (2,780B / 104B), not "K3.1 Pro". The parameter counts match, but the build sizes are for K3.

### Tier 3: GLM-5.3

- **Score:** 60% of Sonnet 5.5. Coding Agent Index 40.1, Terminal-Bench 4.0 41.9, FrontierCode 2.0 21.6. Open weights from Z.ai; LLM Sizer lists its license as "other", so check it before commercial use.
- **Hardware:** 753B parameters. The MLX 4-bit build is 418 GB, which fits one **512 GB Mac Studio M5 Ultra** (464 GB usable by default) with about 40 GB left for context. A 2-bit build (254 GB) fits a 256 GB Mac Studio with the memory limit raised, at some loss of quality.
- **Runner-up:** DeepSeek V4.1 Flash 1017 (59%, Coding Agent Index 36.8). It has about half the active parameters (25B per LLM Sizer, 16B per Artificial Analysis), so it writes roughly twice as fast on the same machine, and it was the cheapest model in the Coding Agent Index ($0.32 per task). Pick it over GLM-5.3 when speed matters more than the last few points. Its 2-bit builds are 298 to 335 GB; LLM Sizer lists no 4-bit build yet.

### Tier 2: Qwen3.8-Flash-Next

- **Score:** 50% of Sonnet 5.5. Terminal-Bench 4.0 25.3, FrontierCode 2.0 27.1. It is the most even of the mid-size models: its FrontierCode score is higher than GLM-5.3's.
- **Hardware:** 180B parameters, but only 6.7B are read per token, so it is fast. The Q4_0 build is 100.6 GB, which fits a **128 GB machine**: DGX Spark, an AMD Strix Halo mini PC, or a 128 GB Mac. On a Mac, oMLX keeps the model's 51B-parameter n-gram table on the SSD, so the 4-bit model needs about 80 GB (per LLM Sizer's notes).
- **Runner-up:** GLM-5.3-Flash (48%, 321B / 18B active). Its 4-bit builds are 157 to 204 GB, so it needs a 256 GB Mac Studio M5 Ultra.

### Tier 1: Nanbeige4.3-33B

- **Score:** 38% of Sonnet 5.5. Terminal-Bench 4.0 29.8, FrontierCode 2.0 10.7. Apache-2.0 license.
- **Hardware:** 33B dense. The Q4_K_M build is 20.8 GB, so it runs on a **32 GB Mac** (26.8 GB usable) or a 24 to 32 GB graphics card, but long contexts will be tight. A 48 GB Mac or a 32 GB card leaves room for the context cache.
- **Caveat:** its profile is very uneven. It scores well on terminal tasks but low on merge-quality repository changes, and it has no Coding Agent Index score. Treat the pick as provisional until a harness run confirms it. The more even alternative at this size, Qwen3.8 27B, scores only 19% (Terminal-Bench 4.0 5.6, FrontierCode 2.0 14.9).

### Starting point: Qwen3.5 27B compared with Nanbeige4.3-33B

Max asked to start from Qwen3.5 27B (released February 2026) and whether it is close to Nanbeige4.3-33B. **It is not close: Nanbeige4.3-33B is much better on long coding tasks**, although the comparison is indirect because no source runs both models on the same long-task benchmark.

- **No shared benchmark.** Artificial Analysis never ran Qwen3.5 27B on Terminal-Bench 4.0 or FrontierCode 2.0, which were added after its release. The only coding-agent score it has there is the older, easier Terminal-Bench Hard: 32.6% ([model page](https://artificialanalysis.ai/models/qwen3-5-27b), read 2026-11-17). Nanbeige4.3-33B was only run on the newer tests.
- **The chain of comparisons**, all from Artificial Analysis unless noted:

| Model | Terminal-Bench Hard (older) | Terminal-Bench 2.1 | Terminal-Bench 4.0 (long tasks) |
| --- | --- | --- | --- |
| Qwen3.5 27B (Reasoning) | 32.6 | not run | not run |
| Qwen3.6 27B (Reasoning) | 34.8 | 60.7 | 0.0 |
| Gemma 4 31B (Reasoning) | 36.4 | 43.4 | 0.0 |
| Qwen3.8 27B (Xhigh) | not run | 79.8 | 5.6 |
| Nanbeige4.3-33B | not run | 80.9 (Nanbeige's own run) | 29.8 |

  Qwen3.5 27B scores below Qwen3.6 27B and Gemma 4 31B on the one test they share, and both of those score 0 on Terminal-Bench 4.0. So Qwen3.5 27B would very likely also score at or near 0 there, against Nanbeige's 29.8. That places Qwen3.5 27B in Tier 0 and Nanbeige in Tier 1.
- **The developers' own numbers point the same way.** Qwen reports 41.6 on Terminal-Bench 2.0 and 72.4 on SWE-bench Verified for Qwen3.5 27B ([model card](https://huggingface.co/Qwen/Qwen3.5-27B), read 2026-11-17). Nanbeige reports 80.9 on Terminal-Bench 2.1 and 23.8 on Terminal-Bench 4 (against 6.3 for Qwen3.8 27B, run in the same harness) ([model card](https://huggingface.co/Nanbeige/Nanbeige4.3-33B), read 2026-11-17). The versions differ, so these numbers are not directly comparable, but on every agentic coding test both cards share with a newer Qwen, the newer Qwen is ahead of 3.5 and Nanbeige is ahead of the newer Qwen.
- **Hardware is about the same.** Qwen3.5 27B has 27.8B dense parameters, so a 4-bit build is about 16 to 19 GB (the same-size Qwen3.6 27B Q4_K_M is 19.4 GB in LLM Sizer's data). Nanbeige4.3-33B's Q4_K_M is 20.8 GB. Both run on a 32 GB Mac or a 24 GB card, so Nanbeige costs only about 2 to 4 GB more memory for a large step up.
- **Confidence: medium.** The direction is clear from several independent signals, but the size of the gap on long tasks is inferred, not measured. A Terminal-Bench 4.0 run of Qwen3.5 27B would settle it.

The Tier 1 pick does not change.

### Nanbeige4.3-33B against the other models that fit the same hardware

All of these run on a 32 GB Mac or a 24 to 32 GB graphics card at 4-bit. Scores are from Artificial Analysis (read 2026-11-17); "-" means not run.

| Model | Params (all dense unless noted) | 4-bit file | Intelligence Index | Terminal-Bench 4.0 | FrontierCode 2.0 | Long-coding score | % of Sonnet 5.5 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Nanbeige4.3-33B** | 33B | 20.8 GB (Q4_K_M) | 20.4 | 29.8 | 10.7 | 20.2 | 38% |
| Qwen3.8 27B (Xhigh) | 27B | 16.8 GB (Q4_K_M) | 20.1 | 5.6 | 14.9 | 10.2 | 19% |
| Qwen3.6 27B (Reasoning) | 27B | 19.4 GB (Q4_K_M) | - | 0.0 | - | about 0 | about 0% |
| Qwen3.5 27B (Reasoning) | 27B | about 16 to 19 GB | - | - | - | inferred about 0 | about 0% |
| Gemma 4 31B (Reasoning) | 31B | 17.3 GB (Q4_0) | 4.4 | 0.0 | 0.0 | 0.0 | 0% |
| Muse Glimmer (High) | 30B | not in LLM Sizer data | 6.3 | 0.5 | 1.5 | 1.0 | 2% |
| Nemotron 3.5 Lightning | 31.6B | not checked | 5.5 | 0.5 | 0.0 | 0.3 | 0% |
| North Mini Code | 30B | not checked | 3.4 | 0.5 | 0.2 | 0.4 | 1% |
| Qwen3.6 35B-A3B (Reasoning) | 35B, 3B active | not checked | - | 0.0 | - | about 0 | about 0% |
| Granite 4.2 30B | 30B | not checked | - | 0.0 | - | about 0 | about 0% |

The developers' own numbers for Nanbeige4.3-33B against three of these (from its [model card](https://huggingface.co/Nanbeige/Nanbeige4.3-33B), read 2026-11-17, all models run by Nanbeige at highest thinking effort with the same harness per test):

| Test | Nanbeige4.3-33B | Qwen3.8 27B | Muse Glimmer 30B | Gemma 4 31B |
| --- | --- | --- | --- | --- |
| Terminal-Bench 4 | 23.8 | 6.3 | 1.6 | 0.0 |
| Terminal-Bench 2.1 | 80.9 | 73.0 | 61.8 | 47.2 |
| DeepSWE | 65.5 | 42.5 | 4.4 | 2.7 |
| SWE-Bench Pro | 60.3 | 61.7 | 51.2 | 36.9 |
| SWE-Atlas-QnA | 50.8 | 41.9 | 17.7 | 3.3 |
| NL2Repo | 53.0 | 48.3 | 27.4 | 33.8 |
| SciCode | 52.6 | 46.7 | 44.9 | 45.5 |

What the matrix says:

- **Nanbeige leads on long terminal tasks.** Its 29.8 on Terminal-Bench 4.0 is the only double-digit score among models of this size, and Nanbeige's own run agrees in direction (23.8 vs 6.3 for Qwen3.8 27B).
- **Qwen3.8 27B is ahead on one thing: FrontierCode 2.0** (14.9 vs 10.7), and the two are tied on the Intelligence Index. It is also smaller (16.8 GB vs 20.8 GB). Nanbeige's own table has Qwen3.8 27B ahead on SWE-Bench Pro (61.7 vs 60.3), so for repository fixes the two are close.
- **Everything else at this size scores at or near 0** on both long-task benchmarks.
- **Caveat: Nanbeige's own tests are self-reported** and its card compares only against models it chose, so the Artificial Analysis rows are the independent evidence. There is no Coding Agent Index score for any of these models.

### Tier 0: below the bar

**Best pick: Qwen3.8 27B (Xhigh), 19% of Sonnet 5.5.** Terminal-Bench 4.0 5.6, FrontierCode 2.0 14.9, Apache-2.0 license. It needs about 21 GB at 4-bit with a 32K context (16.8 GB file, per LLM Sizer's worked example), so it fits a 32 GB Mac or a 24 GB graphics card. It is the strongest small model that is not in Tier 1, but at 19% it rarely finishes a long task, so use it for short, well-scoped coding only.

Every other small model measured (Gemma 4 31B, Gemma 4 E4B, Granite 4.2 8B, gpt-oss-120b, Nemotron 3.5 Super VL, and by inference Qwen3.5 27B and Qwen3.6 27B) scores under 20%, and most score 0 on both benchmarks. On laptops and 16 GB machines there is currently no model that reliably does long coding tasks.

## Missing data and indirect comparisons

- **METR time horizons do not cover the models compared here.** The current METR data (TH 1.1) has no Claude Sonnet 5.x and no open-weights model, so the tiers cannot be expressed as "hours of human work". The latest entry is Claude Mythos Preview (early), at a 50% horizon of about 1,045 minutes.
- **Older models were never run on the long-task benchmarks.** Qwen3.5 27B, for example, only has a Terminal-Bench Hard score, so its tier is inferred from models it can be chained to.
- **The Coding Agent Index covers only large models.** The smallest open model in it is DeepSeek V4.1 Flash (552 to 763B). For Tiers 2 and 1 the picks rest on Terminal-Bench 4.0 and FrontierCode 2.0 run in Artificial Analysis's own harness, not in a real coding agent, which is an indirect comparison.
- **Harnesses differ.** In the Coding Agent Index, each model runs in its maker's agent (Claude Code, Kimi Code CLI, Opencode and so on). Part of a score difference may come from the harness, not the model.
- **Scores were measured at full precision, through APIs.** Running the same model locally at 4-bit or 2-bit will usually score somewhat lower. No source measures long-task scores for quantized local builds.
- **Parameter counts disagree.** Artificial Analysis and LLM Sizer give different sizes for DeepSeek V4.1 Flash (552B/16B vs 763B/25B), GLM-5.3 (40B vs 54B active) and MiniMax-M3.1-Flash (428B vs 221B). LLM Sizer reads the Hugging Face config, so its numbers are used for memory.
- **Zeros may hide small differences.** Several small models score exactly 0.0 on both benchmarks, which means "finished no tasks", not "not measured".
- **One snapshot.** Leaderboards change weekly; every number here is from 2026-11-17.

## Confidence

- **High:** Fable 5.2 is slightly ahead of Sonnet 5.5, and Sonnet 5.5 sits well above every open model that fits a personal machine (the best, GLM-5.3, reaches 60%), and small models (31B and under) do not complete long coding tasks today. All three measures agree on both.
- **Medium:** the Tier 4 and Tier 3 picks, which rest on direct harness runs.
- **Low to medium:** the Tier 2 and Tier 1 picks, which rest on two benchmarks without a harness run, and Nanbeige4.3-33B in particular.

## Next steps

- Add Coding Agent Index runs for the Tier 2 and Tier 1 picks when Artificial Analysis publishes them.
- Watch for a METR time-horizon update that includes open-weights models, so tiers can be stated in hours of human work.
- Re-run this comparison when a new Sonnet or a new open model family is released.
