# Estimated equivalent tiers for local models

Some local models run on the Runs page are not in the long-coding data (`data/long-coding-tasks-2026-11-17.csv`), so they have no official tier. Each gets an **estimated equivalent tier**, shown as `Tier N*` ("*estimated equivalent tier"). Estimated values have a dashed outline on the site.

## Table (data as of 2026-11-18 runs)

| Model | Best suite score | Est. % of Sonnet 5.5 | Est. tier |
|---|---|---|---|
| Nemotron 3.5 Lightning 30B A3B | 16.8 | 34.8 | Tier 1* |
| GLM-4.7 Flash | 28.9 | 29.9 | Tier 1* |
| Qwen3.6 35B A3B | 34.5 | 27.7 | Tier 1* |
| Qwen3-Coder 30B A3B Instruct | 46.5 | 22.9 | Tier 1* |
| Qwen3-Next 80B A3B Instruct | 63.5 | 19.0 | Tier 0* |

Machine-readable: `data/local-estimated-tiers.csv`. Regenerate with `python3 scripts/estimate_tiers.py` (then `scripts/sync-site-data.sh`).

## How it is calculated

1. **Suite score.** Each run of the local suite (`local-coding-v1`, ten tasks, weights 1/1/2/2/2/3/3/3/3/3, divided by 23) gives a 0-100 score. A model's score is its best run.
2. **Anchors.** Models that already have an official tier and a run are anchors: each is one point (suite score, % of Sonnet 5.5 on long coding tasks).
3. **Interpolation.** An untiered model is placed on that line by straight-line interpolation between the two anchors with the nearest scores below and above it. Outside the anchors' score range it takes the nearest anchor's value.
4. **Bands.** The usual tier bands apply: Tier 4 from 75%, Tier 3 from 55%, Tier 2 from 40%, Tier 1 from 20%, Tier 0 below 20%.
5. Models not run yet get no estimate and stay "No tier".

The logic lives in `docs/assets/runs.js` (`estimateTiers`) and `scripts/estimate_tiers.py`; keep them in step.

## Limits

Only two anchors exist (Nanbeige4.3 33B, 8.7 suite score, 38%; Qwen3.8 27B, 56.3, 19%) and they disagree on direction, so the estimates are rough and mostly say "between Tier 0 and Tier 1". They improve as more tiered models are run. Thinking-on runs that hit the token limit score low, which can understate a model.
