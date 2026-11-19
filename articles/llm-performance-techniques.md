# What makes LLMs better, faster and cheaper: the techniques, ranked by measured effect

*Written 2026-11-19. All sources read on 2026-11-19. Data file: [data/llm-techniques-2026-11-19.csv](../data/llm-techniques-2026-11-19.csv). Prompts behind this article: [prompts/llm-performance-techniques-2026-11-19.md](../prompts/llm-performance-techniques-2026-11-19.md).*

## Summary

This article lists the techniques that change how well a large language model performs, from open-weight models (where the methods are published) to closed frontier models (where mostly only the results are), and puts a percentage on each one. It covers 45 measured effects across about 25 techniques, from 35 public sources plus LLMeter's own data.

"Performance" means three different things, and a percentage only makes sense inside one of them. So there are three rankings, each split into four tiers by the size of the effect:

1. **Quality**: how much more the model gets right.
2. **Speed**: how many more tokens per second, or how much less waiting.
3. **Cost and memory**: how much less money, compute or memory for the same work.

| Tier | Size of effect |
| --- | --- |
| **Tier 4** | more than 100% (more than double, or more than 2x) |
| **Tier 3** | 30% to 100% |
| **Tier 2** | 5% to 30% |
| **Tier 1** | less than 5% |

A row is placed by its headline figure, which for a range is the far end ("+100% to +200%" goes in Tier 4). Gains and losses are placed by size alike, so a -64% sits in Tier 3.

The largest effect in each ranking:

| Ranking | Largest effect | Size | Catch |
| --- | --- | --- | --- |
| Quality | Reasoning: training the model to think, then letting it think before answering | +104% on AIME 2024 for the same base model (DeepSeek-V3 to R1); +700% from GPT-4o to o1 | Large on hard math and code, about +3% on general knowledge (MMLU). Thinking used 6x to 8x more output tokens in LLMeter's local runs. |
| Speed | Generating many tokens at once: text diffusion (up to 10x), speculative decoding and multi-token prediction (2x to 3.6x) | +100% to +900% | The 10x figure is a developer's claim against other models. The 2x to 3.6x figures are same-model measurements. |
| Cost and memory | Not running the big model, or not all of it: cascades and routing (-35% to -98% cost), sparse mixture of experts (3% to 9% of weights used per token) | -35% to -98% | Cascade and routing savings depend on how many queries are easy. |

Five findings stand out:

- **Quality gains come from thinking and from the harness, not from compression.** The four largest quality effects are reasoning training, the agent harness around the model (+64% to +574% on SWE-bench Lite with the same model), chain-of-thought prompting (+218%) and distilling a reasoning model into a small one (+65%). None of the efficiency techniques raises quality by itself.
- **Efficiency techniques are nearly free in quality.** Quantizing to 8 or 4 bits keeps 96% to 101% of the full-precision score while cutting memory by about 70% and cost per query by 2x to 7x. Speculative decoding gives 2x to 3x with identical outputs.
- **Brute force at answer time has steep diminishing returns.** o3 went from 75.7% to 87.5% on ARC-AGI (+16%) for about 172x the compute.
- **Thinking is not always a gain.** In LLMeter's own local runs, turning thinking on for two small models under fixed token and time limits lowered the score by 24% to 64% and took 8x to 9x longer, because the models spent the budget thinking and were cut off.
- **Open models show their methods; closed ones mostly do not.** The four highest-scoring open-weight models in LLMeter's long-coding data are all sparse mixtures of experts using 3% to 5% of their weights per token, and all four ship in 8-bit or 4-bit weights as the native format. For closed frontier models, only the reasoning settings and API features are public.

For the choices that are yours when you download and run a model (bits, QAT, dense or MoE, thinking, runtime), see [What you control when you pick a build of one model](#what-you-control-when-you-pick-a-build-of-one-model).

Read the percentages with care. Each one comes from a different paper, model and benchmark, so a +218% and a +104% in the same table are not a contest between the two techniques. The "Evidence" column says how clean each number is (see [How to read the numbers](#how-to-read-the-numbers)).

## How to read the numbers

**How percentages are worked out.** For quality, the percentage is the relative change in the benchmark score: a rise from 39.2 to 79.8 is +104%. For speed, a "2x speedup" is written as +100% and "3x" as +200%. For cost and memory, a "5x reduction" is written as -80%. Where a source gives only a multiple, the percentage is LLMeter's arithmetic and the multiple is shown beside it.

**Relative gains flatter low baselines.** Going from 9.3 to 74.4 is +700%; going from 88.0 to 90.8 is +3%. Both are the same step (GPT-4o to o1) on different tests. Every row shows the baseline and the result so the size can be judged directly.

**Evidence types**, from strongest to weakest:

| Label | Meaning |
| --- | --- |
| ablation | The same model with and without the technique, in one paper. The cleanest kind. |
| same model / same base model | One model at two settings, or a model and its direct successor built on the same base. |
| system | A whole system against other systems on the same task. |
| cross-model | Two different models. The technique is the main difference but not the only one. |
| developer claim | The company's own figure for its product, not independently checked here. |
| derived | LLMeter's arithmetic from published model specifications. |
| LLMeter runs | Measured in this project's own tests. |

All numbers were read from the source's abstract, results table or announcement page. Nothing here is an estimate unless it is labelled "derived".

## Ranking 1: quality

Effect on benchmark scores, in four tiers from the largest effects down. Rows with a minus sign are quality costs, not gains.

### Tier 4: more than 100%

| Technique | Effect | What the % measures | Baseline -> result | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| Reasoning training plus thinking at answer time | **+700%** | AIME 2024 solved, one attempt | GPT-4o 9.3 -> o1 74.4 | cross-model | [OpenAI: Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) |
| Agent harness (tools and interface around the model) | **+574%** | SWE-bench Lite resolved, GPT-4 Turbo | retrieval only 2.67 -> SWE-agent 18.00 | ablation | [SWE-agent (Yang et al.)](https://arxiv.org/abs/2405.15793) |
| Chain-of-thought prompting | **+218%** | GSM8K solve rate, PaLM 540B | standard prompt 17.9 -> chain of thought 56.9 | ablation | [Chain-of-Thought Prompting (Wei et al.)](https://arxiv.org/abs/2201.11903) |
| Reasoning training (reinforcement learning) on the same base model | **+104%** | AIME 2024 pass@1 | DeepSeek-V3 39.2 -> DeepSeek-R1 79.8 | same base model | [DeepSeek-R1 model card](https://github.com/deepseek-ai/DeepSeek-R1) |

### Tier 3: 30% to 100%

| Technique | Effect | What the % measures | Baseline -> result | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| Distilling a reasoning model into a small one | **+65%** | AIME 2024 pass@1 at 32B parameters | QwQ-32B-Preview 44.0 -> R1-Distill-Qwen-32B 72.6 | cross-model | [DeepSeek-R1 model card](https://github.com/deepseek-ai/DeepSeek-R1) |
| Agent harness (tools and interface around the model) | **+64%** | SWE-bench Lite resolved, GPT-4 Turbo | plain shell agent 11.00 -> SWE-agent 18.00 | ablation | [SWE-agent (Yang et al.)](https://arxiv.org/abs/2405.15793) |
| Reasoning training plus thinking at answer time | **+53%** | GPQA Diamond, one attempt | GPT-4o 50.6 -> o1 77.3 | cross-model | [OpenAI: Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) |
| Thinking mode on a small local model under fixed limits | **-24% to -64%** | LLMeter local coding suite score | Qwen3.8 27B: off 0.56 -> on 0.20; Nemotron 3.5 Lightning: off 0.26 -> on 0.20 | LLMeter runs | [LLMeter local runs](../data/local-runtime-results.csv) |

### Tier 2: 5% to 30%

| Technique | Effect | What the % measures | Baseline -> result | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| Multi-token prediction as a training objective | **+21%** | HumanEval, 229B MoE ablation | 44.5 -> 53.7 (MMLU fell 67.5 -> 66.6) | ablation | [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437) |
| Reasoning training (reinforcement learning) on the same base model | **+17%** | SWE-bench Verified resolved | DeepSeek-V3 42.0 -> DeepSeek-R1 49.2 | same base model | [DeepSeek-R1 model card](https://github.com/deepseek-ai/DeepSeek-R1) |
| Multi-token prediction as a training objective | **+12% to +17%** | HumanEval and MBPP problems solved, 13B model | next-token model -> 4-token prediction | ablation | [Multi-token Prediction (Gloeckle et al.)](https://arxiv.org/abs/2404.19737) |
| More samples and voting at answer time | **+16%** | ARC-AGI semi-private score | o3 with 6 samples 75.7 -> 1,024 samples 87.5, for about 172x the compute | same model | [ARC Prize: OpenAI o3 on ARC-AGI-Pub](https://arcprize.org/blog/oai-o3-pub-breakthrough) |
| Load balancing experts without an auxiliary loss (MoE training) | **+15%** | HumanEval, large MoE ablation | 40.2 -> 46.3 (MMLU fell 68.3 -> 67.2) | ablation | [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437) |
| More samples and voting at answer time | **+12%** | AIME 2024 | o1 one attempt 74.4 -> vote over 64 samples 83.3 | same model | [OpenAI: Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) |

### Tier 1: less than 5%

| Technique | Effect | What the % measures | Baseline -> result | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| Model cascade (cheap model first, strong model if needed) | **+4%** | accuracy at the same cost as GPT-4 | GPT-4 alone -> FrugalGPT cascade | system | [FrugalGPT (Chen et al.)](https://arxiv.org/abs/2305.05176) |
| Reasoning training (reinforcement learning) on the same base model | **+2.6%** | MMLU | DeepSeek-V3 88.5 -> DeepSeek-R1 90.8 | same base model | [DeepSeek-R1 model card](https://github.com/deepseek-ai/DeepSeek-R1) |
| Quantization to 8-bit or 4-bit (quality cost) | **0% to -4%** | share of full-precision benchmark score kept (96.1% to 101.5%) | BF16 -> FP8, INT8, INT4 on Llama 3.1 8B, 70B, 405B | ablation | ["Give Me BF16 or Give Me Death"? (Kurtic et al.)](https://arxiv.org/abs/2411.02355) |

What this shows:

- **Reasoning is the largest single lever of the last two years.** The cleanest measurement is DeepSeek-R1, which is DeepSeek-V3 with reinforcement learning for reasoning added: AIME 2024 doubles (39.2 to 79.8), Codeforces rating goes from 1,134 to 2,029, SWE-bench Verified rises 17%, and MMLU barely moves (+2.6%). The gain is concentrated in multi-step problems. During that training, the earlier R1-Zero model went from 15.6% to 77.9% on AIME 2024 ([DeepSeek-R1 paper](https://arxiv.org/abs/2501.12948)).
- **The harness matters as much as the model on agent tasks.** With GPT-4 Turbo held fixed, SWE-agent's interface raised SWE-bench Lite from 11.0% (plain shell) to 18.0%, and from 2.67% for a retrieval-only setup. This is why LLMeter's long-coding comparison always records the harness next to the model.
- **Prompting effects were huge on older models and are now built in.** Chain of thought tripled GSM8K scores in 2022. Today's reasoning models do this internally, so the same prompt trick adds little on top of them. That last point is LLMeter's reading, not a measured figure.
- **Distillation moves most of the gain into a small model.** The 32B model distilled from DeepSeek-R1 reaches 72.6 on AIME 2024, which is 91% of R1's score with under 5% of its parameters (32B against 671B).
- **Training-objective changes are worth 10% to 20% on code, and close to nothing on general knowledge.** Multi-token prediction and DeepSeek's expert load balancing each raised HumanEval by 15% to 21% in ablations, while MMLU fell slightly in both.

## Ranking 2: speed

Effect on generation speed or waiting time, in four tiers from the largest effects down. The thinking row is a slowdown.

### Tier 4: more than 100%

| Technique | Effect | What the % measures | Baseline -> result | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| Text diffusion instead of token-by-token generation | **up to +900% (10x)** | output tokens per second | speed-optimized frontier models -> Mercury Coder (1,109 tok/s on H100) | developer claim, cross-model | [Mercury: diffusion language models (Inception Labs)](https://arxiv.org/abs/2506.17298) |
| Latent attention (MLA) plus sparse MoE | **+476% (5.76x)** | maximum generation throughput | DeepSeek 67B -> DeepSeek-V2 | cross-model | [DeepSeek-V2](https://arxiv.org/abs/2405.04434) |
| Quantization (GPU kernels of 2022) | **+225% to +350% (3.25x to 4.5x)** | end-to-end inference speed | FP16 -> 3-4 bit GPTQ on A100 and A6000 | ablation | [GPTQ (Frantar et al.)](https://arxiv.org/abs/2210.17323) |
| Paged KV-cache memory and continuous batching (serving) | **+100% to +300% (2x to 4x)** | serving throughput at the same latency | FasterTransformer, Orca -> vLLM | system | [vLLM / PagedAttention (Kwon et al.)](https://arxiv.org/abs/2309.06180) |
| FlashAttention (memory-aware exact attention) | **+100% to +300% (2x to 4x)** | attention runtime; a further 2x from FlashAttention-2 | optimized baselines -> FlashAttention | ablation | [FlashAttention-2 (Dao)](https://arxiv.org/abs/2307.08691) |
| Speculative decoding with extra decoding heads (Medusa) | **+120% to +260% (2.2x to 3.6x)** | generation speed | plain decoding -> Medusa-1 / Medusa-2 | ablation | [Medusa (Cai et al.)](https://arxiv.org/abs/2401.10774) |
| Speculative decoding on features (EAGLE) | **+170% to +250% (2.7x to 3.5x)** | latency speedup, LLaMA2-Chat 70B | plain decoding -> EAGLE | ablation | [EAGLE (Li et al.)](https://arxiv.org/abs/2401.15077) |
| Quantization (2024 serving stack) | **+8% to +209% (1.08x to 3.09x)** | throughput under load, Llama 3.1 on A6000, A100, H100 | BF16 -> 8-bit or 4-bit | ablation | ["Give Me BF16 or Give Me Death"? (Kurtic et al.)](https://arxiv.org/abs/2411.02355) |
| Speculative decoding with a small draft model | **+100% to +200% (2x to 3x)** | decoding speed, identical outputs | T5-XXL alone -> with draft model | ablation | [Speculative Decoding (Leviathan et al.)](https://arxiv.org/abs/2211.17192) |
| Multi-token prediction heads | **up to +200% (3x)** | inference speed | next-token model -> 4-token prediction | ablation | [Multi-token Prediction (Gloeckle et al.)](https://arxiv.org/abs/2404.19737) |
| Thinking mode on a small local model under fixed limits | **8.2x to 9.2x longer** | total wall time for 10 tasks | Qwen3.8 27B: 866 s -> 7,132 s; Nemotron 3.5 Lightning: 231 s -> 2,116 s | LLMeter runs | [LLMeter local runs](../data/local-runtime-results.csv) |

### Tier 3: 30% to 100%

| Technique | Effect | What the % measures | Baseline -> result | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| Prompt caching (reusing the KV cache of a repeated prefix) | **-31% to -79% wait** | time to first token | no cache -> cached 10K to 100K-token prefix | developer claim | [Anthropic: Prompt caching with Claude](https://claude.com/blog/prompt-caching) |
| Distillation into a smaller model | **+60%** | inference speed, keeping 97% of quality | BERT -> DistilBERT | ablation | [DistilBERT (Sanh et al.)](https://arxiv.org/abs/1910.01108) |

### Tier 2: 5% to 30%

No measured effect in this tier.

### Tier 1: less than 5%

No measured effect in this tier.

What this shows:

- **"Predictive" techniques are worth 2x to 3.6x.** Speculative decoding lets a small draft model, or extra prediction heads, guess several tokens that the large model then checks in one pass. The original method gives identical outputs. Multi-token prediction trains the guessing into the model itself and reaches up to 3x; DeepSeek-V3 was trained this way and its report says the extra heads can be reused for speculative decoding.
- **Diffusion models are the outlier.** Mercury generates all tokens in parallel and refines them, and its developer reports over 1,000 tokens per second. That is a comparison against other companies' models, so quality is not held equal.
- **Attention and memory engineering give 2x to 6x each.** FlashAttention, paged KV-cache memory with continuous batching (vLLM) and DeepSeek's latent attention all attack the same bottleneck: memory traffic, not arithmetic.
- **Quantization speedups depend on hardware.** The 2022 result was 3.25x to 4.5x. A careful 2024 study on current GPUs found 1.08x to 3.09x: largest on the 405B model, smallest on an 8B model that already fits comfortably.
- **These gains stack only partly.** A served model can use quantization, FlashAttention, batching and speculative decoding together, but they compete for the same headroom. No source read here measures the full stack against none of it, so the percentages must not be multiplied together.

## Ranking 3: cost and memory

Reduction in cost, compute or memory, in four tiers from the largest effects down. A reduction cannot pass 100%, so Tier 4 here holds only a cost increase.

### Tier 4: more than 100%

| Technique | Effect | What the % measures | Baseline -> result | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| Thinking mode on a small local model under fixed limits | **+540% to +660% tokens** | output tokens generated | Qwen3.8 27B: 15.8K -> 101.6K; Nemotron 3.5 Lightning: 12.9K -> 98.6K | LLMeter runs | [LLMeter local runs](../data/local-runtime-results.csv) |

### Tier 3: 30% to 100%

| Technique | Effect | What the % measures | Baseline -> result | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| Model cascade (cheap model first, strong model if needed) | **up to -98%** | API cost at GPT-4 quality | GPT-4 alone -> FrugalGPT cascade | system | [FrugalGPT (Chen et al.)](https://arxiv.org/abs/2305.05176) |
| Sparse mixture of experts (MoE) | **-91% to -97%** | parameters used per token (active share 3.2% to 8.9%) | all weights -> DeepSeek-V2 21B of 236B, DeepSeek-V3 37B of 671B, Kimi K2 32B of 1,000B | derived from model specs | [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437) |
| Prompt compression | **up to -95% (20x)** | prompt tokens, little quality loss | full prompt -> LLMLingua | ablation | [LLMLingua (Jiang et al.)](https://arxiv.org/abs/2310.05736) |
| Latent attention (MLA) | **-93.3%** | KV cache size | DeepSeek 67B -> DeepSeek-V2 | cross-model | [DeepSeek-V2](https://arxiv.org/abs/2405.04434) |
| Test-time compute instead of a bigger model | **14x smaller model** | model size it can stand in for, on problems the small model sometimes solves | 14x larger model -> small model with search | ablation | [Scaling LLM Test-Time Compute (Snell et al.)](https://arxiv.org/abs/2408.03314) |
| Prompt caching | **-53% to -90%** | input cost on repeated prefixes | no cache -> cache reads at 10% of base price | developer claim | [Anthropic: Prompt caching with Claude](https://claude.com/blog/prompt-caching) |
| Quantization, 16-bit to 4-bit | **-50% to -86% (2x to 7x)** | cost per query | BF16 -> INT4: 2-3x for 8B and 70B, 5-7x for 405B | ablation | ["Give Me BF16 or Give Me Death"? (Kurtic et al.)](https://arxiv.org/abs/2411.02355) |
| Model routing (pick weak or strong model per query) | **-35% to -85%** | cost at 95% of GPT-4 quality | GPT-4 for everything -> routed GPT-4 / Mixtral 8x7B (85% MT Bench, 45% MMLU, 35% GSM8K) | system | [RouteLLM blog (LMSYS)](https://lmsys.org/blog/2024-07-01-routellm/) |
| Quantization, 16-bit to 4-bit | **-69% to -75%** | weights on disk and in memory | Qwen3.8 27B 55.6 GB -> 16.8 GB; Nanbeige4.3-33B 66.2 GB -> 20.8 GB | derived / LLMeter data | [LLMeter long-coding data](../data/long-coding-tasks-2026-11-17.csv) |
| Sparse mixture of experts (MoE) | **-50% to -67%** | inference FLOPs (-50%) and training energy (-67%) with 7x the parameters | GPT-3 -> GLaM 1.2T | cross-model | [GLaM (Du et al.)](https://arxiv.org/abs/2112.06905) |
| Low-rank adapters (LoRA) for fine-tuning | **-67%** | GPU memory during fine-tuning (10,000x fewer trainable parameters) | full fine-tuning of GPT-3 175B -> LoRA | ablation | [LoRA (Hu et al.)](https://arxiv.org/abs/2106.09685) |
| Pruning | **-50% to -60%** | weights removed with little accuracy loss | dense OPT-175B, BLOOM-176B -> SparseGPT | ablation | [SparseGPT (Frantar, Alistarh)](https://arxiv.org/abs/2301.00774) |
| Sparse MoE plus latent attention (training) | **-42.5%** | training cost | DeepSeek 67B -> DeepSeek-V2 | cross-model | [DeepSeek-V2](https://arxiv.org/abs/2405.04434) |
| Distillation into a smaller model | **-40%** | model size, keeping 97% of quality | BERT -> DistilBERT | ablation | [DistilBERT (Sanh et al.)](https://arxiv.org/abs/1910.01108) |

### Tier 2: 5% to 30%

No measured effect in this tier.

### Tier 1: less than 5%

No measured effect in this tier.

What this shows:

- **The cheapest token is the one the big model never produces.** Cascades, routing, prompt caching and prompt compression all work by avoiding work, and they lead this table. Their size depends on the workload: RouteLLM saved 85% on chat questions (MT Bench) but only 35% to 45% on harder test sets, because fewer of those queries can go to the weak model. The paper's own summary is more cautious than its blog: "over 2 times" cheaper without loss of quality ([RouteLLM paper](https://arxiv.org/abs/2406.18665)).
- **Mixture of experts is why open models got so large.** A router inside each layer sends every token to a few experts, so a 671B model computes with 37B. Parameters used per token is not the same as cost: all weights must still sit in memory, which is why these models need so much of it. The measured saving is smaller than the parameter share suggests: GLaM used half the inference compute of GPT-3 with 7x the parameters.
- **Quantization is the standard memory lever.** 16-bit to 4-bit is -75% by arithmetic and about -70% in the builds LLMeter measured, at a quality cost of 0% to 4%.
- **Test-time compute and model size trade against each other.** A small model given search at answer time beat a model 14x larger, but only on problems the small model could already sometimes solve.

## Which models use what

Open-weight developers publish their methods. Closed frontier developers publish results and API settings, and little else.

| Technique | Top open-weight models | Closed frontier models |
| --- | --- | --- |
| Sparse mixture of experts | Documented. Active share per token in LLMeter's [long-coding data](../data/long-coding-tasks-2026-11-17.csv): Kimi K3.1 Pro 3.7% (104B of 2,800B), GLM-5.3 5.3%, MiMo-V2.6-Pro 4.1%, DeepSeek V4.1 Flash 2.9%. Earlier: DeepSeek-V3 5.5%, Kimi K2 3.2%. | Not published. |
| Low-precision weights | Shipped as the native format: FP8 for GLM-5.3, DeepSeek V4.1 Flash, MiMo-V2.6 and others; FP4 for Kimi K3.1 Pro. DeepSeek-V3 was trained in FP8 with under 0.25% loss error. | Not published. |
| Latent or sparse attention, multi-token prediction | Documented for DeepSeek-V2 and V3. | Not published. |
| Reasoning training and thinking | Documented (DeepSeek-R1). Many open models now have a thinking switch. | Public as a setting: effort levels. In LLMeter's data the two highest settings of one model score within 1% of each other on long coding (54.2 and 54.6). |
| Distillation into smaller tiers | Documented (R1 distilled into 1.5B to 70B models). | Smaller tiers exist; how they are made is not published. |
| Prompt caching | A property of the serving software. | Public as an API feature with published prices (cache reads at 10% of the input price at Anthropic). |
| Routing and cascades | Open-source routers exist (RouteLLM). | Whether and how providers route internally is not published. |
| Speculative decoding, batching, FlashAttention | Built into open serving software such as vLLM. | Not published. |

So for closed models this article can rank only what is visible from outside: reasoning settings, caching prices and benchmark steps between releases. The rankings above lean on open models and academic papers for everything else.

## What you control when you pick a build of one model

Most of the techniques above are fixed by the developer. But one model name usually comes in many builds and can be run with many settings, and those choices are yours. This table lists them with the effect of each, split into the same four tiers. A choice is placed by its largest measured effect. Data file: [data/llm-user-choices-2026-11-19.csv](../data/llm-user-choices-2026-11-19.csv).

### Tier 4: more than 100%

| Choice | Options | What it changes | Effect | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| **Weight precision (bits)** | 16-bit, 8-bit, 6-bit, 5-bit, 4-bit, 3-bit and lower | Memory, speed; small quality loss | 16-bit to 4-bit (Q4_K_M): size 14.96 to 4.58 GiB (-69%), generation 29.2 to 71.9 tok/s (+147%). 16-bit to 8-bit: -47% size, +75% speed. Quality kept: 96% to 101% at 8-bit and 4-bit | measured (Llama 3.1 8B; Llama 3.1 8B to 405B) | [llama.cpp quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md), ["Give Me BF16 or Give Me Death"?](https://arxiv.org/abs/2411.02355) |
| **Dense or mixture-of-experts variant** | Dense model, or MoE with few active parameters (for example 30B with 3B active) | Speed at similar memory; quality differs by model | On one MacBook Pro M5 Pro at 4-bit: MoE models with 3B active ran at 32 to 48 tok/s, the dense 27B at 16 tok/s (2x to 3x) | LLMeter runs (different models) | [LLMeter local runs](../data/local-runtime-results.csv) |
| **Size tier of the same family** | Smaller or larger model of one family, including distilled versions | Quality against memory and speed | DeepSeek-R1 distills on AIME 2024: 1.5B 28.9, 7B 55.5, 14B 69.7, 32B 72.6, full model 79.8 | measured | [DeepSeek-R1 model card](https://github.com/deepseek-ai/DeepSeek-R1) |
| **Thinking on or off, or effort level** | Off, on, or low to maximum effort | Quality on hard tasks; tokens and time | Gains up to +104% on hard math for a model trained for it. On two small local models under fixed limits: score -24% to -64%, 6x to 8x the tokens, 8x to 9x the time | measured; LLMeter runs | [DeepSeek-R1 model card](https://github.com/deepseek-ai/DeepSeek-R1), [LLMeter local runs](../data/local-runtime-results.csv) |
| **Draft model for speculative decoding** | Off, or a small model of the same family as draft | Speed; output unchanged | 2x to 3x in the original paper; not yet measured by LLMeter | measured (paper) | [Speculative Decoding (Leviathan et al.)](https://arxiv.org/abs/2211.17192) |

### Tier 3: 30% to 100%

| Choice | Options | What it changes | Effect | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| **How the low-bit build was made** | Plain post-training quantization, calibrated (importance matrix, GPTQ, AWQ), or quantization-aware training (QAT) by the developer | Quality at the same size | QAT: 54% less perplexity loss at 4-bit, same memory as any 4-bit build (Gemma 3 27B: 54 GB to 14.1 GB) | developer claim | [Gemma 3 QAT (Google)](https://developers.googleblog.com/en/gemma-3-quantized-aware-trained-state-of-the-art-ai-to-consumer-gpus/) |
| **Parallel requests** | 1 to 4 or more at once | Total throughput against speed of each request; memory | Qwen3.8 27B: 16.7 to 11.1 tok/s per request at 4 in flight (-34%); Nanbeige4.3 33B: 13.6 to 6.9 (-49%). Each slot adds KV cache memory | LLMeter runs | [LLMeter local runs](../data/local-runtime-results.csv) |
| **Prompt caching** | Keep a repeated prefix cached (default in most local runtimes; a priced option in cloud APIs) | Waiting time and input cost | -31% to -79% time to first token; cached input at 10% of the normal price | developer claim | [Anthropic: Prompt caching with Claude](https://claude.com/blog/prompt-caching) |
| **Harness around the model** | Chat window, plain shell agent, or a coding agent with purpose-built tools | Quality on agent tasks | +64% on SWE-bench Lite for the same model (11.0 to 18.0) | measured | [SWE-agent (Yang et al.)](https://arxiv.org/abs/2405.15793) |

### Tier 2: 5% to 30%

| Choice | Options | What it changes | Effect | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| **Runtime** | LM Studio, TensorFold, llama.cpp, vLLM and others | Speed, which models load at all | Same Qwen3.8 27B 4-bit build: 16.7 tok/s in LM Studio, 15.2 in TensorFold (10% apart), same score. Several MoE models were not served by one of the two runtimes | LLMeter runs | [LLMeter local runs](../data/local-runtime-results.csv) |

### Tier 1: less than 5%

No choice in this tier.

### Not measured yet

| Choice | Options | What it changes | Effect | Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| **File format** | MLX (Apple), GGUF (llama.cpp), safetensors (GPU servers) | Which runtime and hardware can use it; speed | Not measured here: all LLMeter runs so far use MLX builds | not measured |  |
| **Context length loaded** | From a few thousand tokens to the model maximum | Memory (KV cache), not answer quality on short prompts | Qwen3-Next 80B was refused at every context tried on a 64 GB Mac by the memory estimate (58.5 GiB) although its weights are about 40 GiB | LLMeter runs | [LLMeter task set notes](../data/local-coding-task-set.md) |

What the tiers say: the choices that change the result most are the model itself (size tier, dense or mixture of experts), the bits, thinking and a draft model. How the build was made, the harness, caching and parallel requests are mid-sized. Which runtime you use matters least. No choice falls under 5%.

How to use this:

- **Bits are the first choice.** 4-bit is the usual sweet spot: about 70% less memory and more than twice the speed of 16-bit for a few percent of quality at most. 8-bit costs twice the memory of 4-bit for a gain that is hard to measure. Below 4 bits the size keeps falling but no source read here measures the quality loss, so it is not ranked.
- **Prefer a QAT build when the developer offers one.** It has the same size as any other 4-bit build and loses about half as much.
- **If memory allows, a bigger model at 4-bit beats a smaller one at 16-bit.** This follows from the two rows above (size tier changes scores by tens of percent, bits by a few percent). It is LLMeter's reading of separate sources, not a single measurement.
- **A mixture-of-experts variant buys speed, not memory.** All its weights must be loaded, but only the active part computes each token.
- **Thinking is a budget decision.** It helps a capable model on hard tasks and can hurt a small one that runs out of tokens or time.
- **Runtime, parallel requests and context length change speed and memory, not the answers.** The same build scored the same in two runtimes.

## The background drivers: compute and algorithms

The techniques above sit on top of two slower trends, which are rates per year, not one-off percentages:

- **Training compute** for frontier language models has grown about 5x per year since mid-2020, and 4.1x per year for notable models from 2010 to 2024 ([Epoch AI](https://epoch.ai/blog/training-compute-of-frontier-ai-models-grows-by-4-to-5x-per-year)).
- **Algorithmic efficiency**: the compute needed to reach a fixed language-modelling score halved about every 8 months from 2012 to 2023, with a 95% range of 5 to 14 months ([Ho et al.](https://arxiv.org/abs/2403.05812)). That is roughly 2.8x per year (LLMeter's arithmetic).
- The combined result is what METR measures: the length of task an agent can finish doubling about every 7 months ([RESOURCES #3](../RESOURCES.md)).

By these figures, more compute and better methods contribute to progress in the same order of magnitude, with compute somewhat ahead. That is a rough reading of two separate studies, not a measured split.

## What is not here

- **Data quality and synthetic data.** Clearly important (phi-1 reached 50.6% on HumanEval with 1.3B parameters trained on "textbook quality" data, [Gunasekar et al.](https://arxiv.org/abs/2306.11644)), but the source gives no same-model baseline, so there is no clean percentage to rank.
- **Retrieval, long context, fine-tuning for a domain, hardware generations.** Each deserves its own article and its own data.
- **1-bit and ternary models, state-space and hybrid architectures.** Promising in papers; not used by any top model in LLMeter's data.
- **Stacked effects.** No source read here measures several techniques together against none.
- **Newer numbers.** Most clean ablations are from 2022 to 2025, on models that are no longer the frontier. A [2026 survey](https://arxiv.org/abs/2606.20295) of inference optimization was used to check the list of techniques is complete, but its figures are quotes of earlier papers and were not used. The effect sizes may be smaller or larger on today's models.

## Confidence

- **High** for the direction and rough size of each same-model effect: they come from results tables in primary sources.
- **Medium** for the order inside each ranking: different benchmarks and baselines make neighbours interchangeable. Only the broad bands are reliable (reasoning and harness at the top for quality, token-parallel generation for speed, avoiding the big model for cost).
- **Low** for cross-model rows and developer claims, and for carrying any of these percentages over to closed frontier models.

## Sources

All read on 2026-11-19. Each row of the data file carries its source link and publication date.

- [DistilBERT (Sanh et al.)](https://arxiv.org/abs/1910.01108), published 2019-10-02
- [LoRA (Hu et al.)](https://arxiv.org/abs/2106.09685), published 2021-06-17
- [GLaM (Du et al.)](https://arxiv.org/abs/2112.06905), published 2021-12-13
- [Chain-of-Thought Prompting (Wei et al.)](https://arxiv.org/abs/2201.11903), published 2022-01-28
- [FlashAttention (Dao et al.)](https://arxiv.org/abs/2205.14135), published 2022-05-27
- [GPTQ (Frantar et al.)](https://arxiv.org/abs/2210.17323), published 2022-10-31
- [Speculative Decoding (Leviathan et al.)](https://arxiv.org/abs/2211.17192), published 2022-11-30
- [SparseGPT (Frantar, Alistarh)](https://arxiv.org/abs/2301.00774), published 2023-01-02
- [FrugalGPT (Chen et al.)](https://arxiv.org/abs/2305.05176), published 2023-05-09
- [Textbooks Are All You Need (Gunasekar et al.)](https://arxiv.org/abs/2306.11644), published 2023-06-20
- [FlashAttention-2 (Dao)](https://arxiv.org/abs/2307.08691), published 2023-07-17
- [vLLM / PagedAttention (Kwon et al.)](https://arxiv.org/abs/2309.06180), published 2023-09-12
- [LLMLingua (Jiang et al.)](https://arxiv.org/abs/2310.05736), published 2023-10-09
- [Medusa (Cai et al.)](https://arxiv.org/abs/2401.10774), published 2024-01-19
- [EAGLE (Li et al.)](https://arxiv.org/abs/2401.15077), published 2024-01-26
- [Algorithmic progress in language models (Ho et al.)](https://arxiv.org/abs/2403.05812), published 2024-03-09
- [Multi-token Prediction (Gloeckle et al.)](https://arxiv.org/abs/2404.19737), published 2024-04-30
- [SWE-agent (Yang et al.)](https://arxiv.org/abs/2405.15793), published 2024-05-06
- [DeepSeek-V2](https://arxiv.org/abs/2405.04434), published 2024-05-07
- [Training compute of frontier AI models grows by 4-5x per year (Sevilla, Roldan)](https://epoch.ai/blog/training-compute-of-frontier-ai-models-grows-by-4-to-5x-per-year), published 2024-05-28
- [RouteLLM paper (Ong et al.)](https://arxiv.org/abs/2406.18665), published 2024-06-26
- [RouteLLM blog (LMSYS)](https://lmsys.org/blog/2024-07-01-routellm/), published 2024-07-01
- [Scaling LLM Test-Time Compute (Snell et al.)](https://arxiv.org/abs/2408.03314), published 2024-08-06
- [Anthropic: Prompt caching with Claude](https://claude.com/blog/prompt-caching), published 2024-08-14
- [OpenAI: Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/), published 2024-09-12
- ["Give Me BF16 or Give Me Death"? (Kurtic et al.)](https://arxiv.org/abs/2411.02355), published 2024-11-04
- [ARC Prize: OpenAI o3 on ARC-AGI-Pub](https://arcprize.org/blog/oai-o3-pub-breakthrough), published 2024-12-20
- [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437), published 2024-12-27
- [DeepSeek-R1 model card](https://github.com/deepseek-ai/DeepSeek-R1), published 2025-01-20
- [DeepSeek-R1 paper](https://arxiv.org/abs/2501.12948), published 2025-01-22
- [Mercury: diffusion language models (Inception Labs)](https://arxiv.org/abs/2506.17298), published 2025-06-17
- [Kimi K2 (Moonshot AI)](https://arxiv.org/abs/2507.20534), published 2025-07-28
- [Token-Operations-Oriented Inference Optimization Techniques for Large Models (survey)](https://arxiv.org/abs/2606.20295), published 2026-07-24
- [llama.cpp quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md), read as published on 2026-11-19
- [Gemma 3 QAT Models (Google)](https://developers.googleblog.com/en/gemma-3-quantized-aware-trained-state-of-the-art-ai-to-consumer-gpus/), published 2025-04-18
- LLMeter data: [local runs](../data/local-runtime-results.csv) (2026-11-18) and [long-coding tasks](../data/long-coding-tasks-2026-11-17.csv) (2026-11-17)
