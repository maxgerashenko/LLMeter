# Models and tiers: the single source of truth

`data/models.csv` lists every model the site mentions, once, with its tier. Every page reads tiers from it (through `docs/assets/models.js`); no page or script computes or types a tier of its own. It is built by `scripts/build_models.py`, so do not edit it by hand.

## Columns

| Column | Meaning |
| --- | --- |
| `name` | The model as the data files name it (with its setting, for example `GLM-5.3 (Max)`) |
| `family` | Matching key: name without a `+ draft ...` part and a trailing `(setting)`, letters and digits only. A run named `Qwen3.8 27B` finds `Qwen3.8 27B (Xhigh)` through it |
| `developer`, `open_weights` | Who made it; `yes` for open weights |
| `pct_of_sonnet_5_5` | Share of Claude Sonnet 5.5's long-coding score (the official one, or the estimate) |
| `tier_id`, `tier` | `max`, `t4` to `t0` and the label. Empty for cloud-only and untiered models |
| `tier_status` | `reference` (Sonnet 5.5, Max), `official` (score in the long-coding file), `estimated` (no official score; placed from our local suite run, shown as `~Tier N`), `cloud_only` (closed model, no tier), `none` (not run yet) |
| `best_suite_score`, `anchor_below`, `anchor_above` | For models we ran locally: best suite score and the two official models the estimate sits between |
| `local_test_ids` | Ids in `data/local-test-models.csv` |

Tier bands (share of Sonnet 5.5): Tier 4 at 75% or more, Tier 3 55%, Tier 2 40%, Tier 1 20%, Tier 0 below. The estimate method is in [articles/local-estimated-tiers.md](../articles/local-estimated-tiers.md).

## Add a model

1. Add its scores to `data/long-coding-tasks-*.csv` (official tier), or add it to `data/local-test-models.csv` and its runs to `data/local-runtime-results.csv` (estimated tier).
2. If it should appear in a Rack chart, add its rows to `data/rack-speed-*.csv` using the model name exactly as in `models.csv`; there is no tier column there.
3. Run `python3 scripts/build_models.py`, then `scripts/sync-site-data.sh`, and commit `data/` and `docs/data/`. The build stops if a Rack model has no tier.
