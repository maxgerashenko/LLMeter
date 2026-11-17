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

## How it works

```
public source  ->  analysis (written up from a chat)  ->  article  ->  web page update
```

1. **Source**: a public source about LLMs is found and added to the resources list.
2. **Analysis**: the source is analysed in a chat, and the result is saved as an article on one aspect of LLM progress (for example compute, data, cost or benchmarks).
3. **Publish**: the article is added to the website, which updates the public page.

## Project structure

The planned layout of the repository:

| Path | What it holds |
| --- | --- |
| `RESOURCES.md` | The list of all public sources used, each with a link and a short note |
| `articles/` | Analysis articles, one Markdown file per topic or finding |
| `docs/` | The public website, published with GitHub Pages |
| `data/` | Structured data collected about models (planned) |

## Website

The project's findings are published as a public website on GitHub Pages, built from the `docs/` folder. Each new article becomes a page on the site, so the website always reflects the latest analysis.

Once Pages is turned on, the site will be at https://maxgerashenko.github.io/LLMeter/.

## Contributing

Ideas, data sources and corrections are welcome. Add new sources to `RESOURCES.md`, put analysis in `articles/`, and include a source link for any data you add.
