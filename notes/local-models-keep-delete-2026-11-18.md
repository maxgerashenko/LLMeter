# Which installed local models to keep, and which to delete

*Written 2026-11-18. Based on the tier data in [articles/long-coding-tiers-local-models.md](../articles/long-coding-tiers-local-models.md) and [data/long-coding-tasks-2026-11-17.csv](../data/long-coding-tasks-2026-11-17.csv) (long coding tasks, scored as % of Claude Sonnet 5.5). Installed list as pasted by Max from LM Studio on 2026-11-18.*

## Summary

- **Keep 3 text models (50.8 GB)** as the local tier representatives: Nanbeige4.3-33B (Tier 1, 38%), Qwen3.8 27B (Tier 0, 19%) and Qwen3.6 27B (Tier 0 runner-up and the previous-generation baseline, about 0%).
- **Delete 7 models (177.2 GB)**: the old or unscored text models, the uncensored duplicate of Qwen3.8 27B, and the older of the two vision models.
- **The two Wan2.2 video models (62.3 GB) are Max's call.** They are not speech models and not part of the coding comparison.
- **No speech model is installed.** None of the 13 does text-to-speech or speech-to-text, so nothing is kept for that reason.
- **Tier 2 and up has nothing installed.** The best candidate that fits a personal machine is Qwen3.8-Flash-Next (Tier 2, 50%), which needs a 128 GB machine.

Total installed: 297.4 GB. After the recommended deletions: 120.2 GB, or 57.9 GB if the video models go too.

## Top 2 per tier, for local testing

Only models that fit one personal machine are listed (the Tier 3 and Tier 4 picks need 512 GB or more).

| Tier | #1 | #2 | Installed? |
| --- | --- | --- | --- |
| Tier 2 (40% to 55%) | Qwen3.8-Flash-Next, 50%, ≈100 GB at Q4_0 (≈80 GB on a Mac with oMLX) | GLM-5.3-Flash, 48%, ≈200 GB at 4-bit (256 GB Mac) | No. Download #1 if the machine has 128 GB. |
| Tier 1 (20% to 40%) | **Nanbeige4.3-33B**, 38%, 18.6 GB installed | none that fits: the other Tier 1 models (Mistral Large 4, Inkling 2 Small) are 370 GB or more | Yes |
| Tier 0 (under 20%) | **Qwen3.8 27B**, 19%, 16.1 GB installed | **Qwen3.6 27B**, about 0% (Terminal-Bench 4.0: 0.0), 16.1 GB installed | Yes |

Why keep Qwen3.6 27B as the Tier 0 runner-up: it is the same size as Qwen3.8 27B and has a measured score, so the pair shows one generation of progress at a fixed size, which is what LLMeter measures. If disk is tight, it is the first of the kept models to drop.

## Every installed model

| Model (LM Studio name) | Type | Size | Tier (from repo data) | Recommendation | Reason |
| --- | --- | --- | --- | --- | --- |
| nanbeige4.3-33b-mlx | text | 18.6 GB | Tier 1, 38% | **Keep** | Best local model that fits a personal machine. |
| qwen3.8-27b-mlx@4bit | text | 16.1 GB | Tier 0, 19% | **Keep** | Best Tier 0 model. |
| qwen/qwen3.6-27b | text | 16.1 GB | Tier 0, about 0% | **Keep** (optional) | Measured previous-generation baseline for Qwen3.8 27B. |
| qwen3.8-27b-uncensored-mlx | text | 16.1 GB | not scored | Delete | Third-party uncensored edit of Qwen3.8 27B. Same weights size, no score, and such edits usually lose some capability. Keep only if you use it for something specific. |
| qwen/qwen3.6-35b-a3b (6bit) | text | 29.1 GB | Tier 0, about 0% (Terminal-Bench 4.0: 0.0) | Delete | Measured and fails long tasks; Qwen3.6 27B already covers that generation. |
| qwen/qwen3-next-80b | text | 44.9 GB | not scored | Delete | Older generation (2025) of the design behind Qwen3.8-Flash-Next, which replaces it in Tier 2. Largest file on disk. |
| meta-llama-3.1-70b-instruct | text | 39.7 GB | not scored | Delete | From 2024. Every model of that age that was measured scores 0 on long coding tasks. |
| qwen/qwen3-coder-30b | text | 17.2 GB | not scored | Delete | 2025 coding model with 3B active parameters; the newer Qwen3.6 35B-A3B of the same shape scores 0. |
| zai-org/glm-4.7-flash (6bit) | text | 24.4 GB | not scored | Delete | Older, smaller predecessor of GLM-5.3-Flash. No score; small models of its generation score near 0. |
| zai-org/glm-4.6v-flash | vision (image to text) | 7.1 GB | not applicable | **Keep** | Other modality. The newer of the two vision models; small. |
| qwen/qwen3-vl-8b | vision (image to text) | 5.8 GB | not applicable | Delete | Other modality. Older (179 days) and duplicates GLM-4.6V-Flash. |
| wan2.2-i2v-a14b-mlx | video (image to video) | 42.7 GB | not applicable | **Max's call** | Video generation, not speech. If you use video, keep this one for quality. |
| wan2.2-ti2v-5b-mlx | video (text or image to video) | 19.6 GB | not applicable | **Max's call** | Video generation, not speech. Smaller and does both text and image input. If you want only one video model, keep this. |

"Not scored" means the model is not in the Artificial Analysis long-task data (Terminal-Bench 4.0, FrontierCode 2.0). Those recommendations are inferred from newer models of the same family and size, so confidence is medium: if you want proof before deleting, a local Terminal-Bench 4.0 run would settle it.

## Disk saved

| Group | Models | Saved |
| --- | --- | --- |
| Recommended deletions | qwen3-next-80b, llama-3.1-70b, qwen3.6-35b-a3b, glm-4.7-flash, qwen3-coder-30b, qwen3.8-27b-uncensored, qwen3-vl-8b | **177.2 GB** |
| Also delete video (if unused) | wan2.2-i2v-a14b, wan2.2-ti2v-5b | 62.3 GB more (239.5 GB in total) |
| Video, keep only ti2v-5b | wan2.2-i2v-a14b | 42.7 GB more (219.9 GB in total) |

## Worth downloading

- **Qwen3.8-Flash-Next** (Tier 2, 50%): the only Tier 2 model that fits a 128 GB machine. About 100 GB at Q4_0, about 80 GB on a Mac with oMLX keeping its n-gram table on the SSD (per LLM Sizer). Not worth it on a 64 GB machine.
- **A speech model**, if you want text-to-speech or speech-to-text locally: none is installed. Speech models are outside the long-coding data in this repo, so no specific pick is made here.

Everything above Tier 2 (GLM-5.3, DeepSeek V4.1 Flash, Kimi K3.1 Pro) needs 256 GB to several TB of memory and is not practical on one personal machine.
