# LLMeter

LLMeter collects data about large language models (LLMs) from public sources and uses it to measure how LLMs progress over time, and which factors contribute to that progress.

> **Status:** early stage. This repository is just getting started (it was previously named **AIMeter**). The sections below describe the goals and planned scope; they will be filled in with concrete code and data as the project grows.

## Goals

- **Collect** structured data about LLMs from public sources.
- **Measure** model progress over time on comparable metrics.
- **Explain** progress by relating it to contributing factors (scale, data, compute, architecture, and so on).

## What we track

For each model, LLMeter aims to record:

| Category | Examples |
| --- | --- |
| Identity | Name, developer, release date, version, open vs. closed weights |
| Scale | Parameter count, training tokens, training compute (FLOPs) |
| Architecture | Dense vs. mixture-of-experts, context length, modalities |
| Performance | Benchmark scores (e.g. MMLU, GPQA, SWE-bench), leaderboard ratings |
| Cost and access | API pricing, availability, license |

## Data sources

Only publicly available sources are used, such as:

- Model cards, technical reports and papers
- Official announcements and documentation from model developers
- Public benchmarks and leaderboards
- Open datasets and trackers that compile model information

Every data point should keep a reference to where it came from, so results can be checked and reproduced.

## Approach

1. **Collect**: gather raw information about models from public sources.
2. **Normalize**: clean the data into a consistent schema (units, names, dates).
3. **Measure**: track metrics over time to quantify model progress.
4. **Analyze**: study how factors like compute, data and architecture relate to progress.

## Contributing

Ideas, data sources and corrections are welcome. Please open an issue or a pull request, and include a source link for any data you add.
