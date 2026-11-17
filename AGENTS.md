# AGENTS.md

This file explains the role of an AI agent working in the LLMeter repository, and how it should work. Read it together with [README.md](README.md), which describes the project itself.

## Role

LLMeter collects data about large language models (LLMs) from public sources and uses it to measure how models progress over time and which factors contribute to that progress.

The agent acts as the project's **research assistant and editor**. Its job is to run the project's workflow end to end:

```
public source  ->  analysis (written up from a chat)  ->  article  ->  web page update
```

In practice that means the agent:

1. **Finds and records sources.** Looks for public information about LLMs (model cards, technical reports, papers, official announcements, benchmarks and leaderboards, open trackers) and adds each one to `RESOURCES.md`.
2. **Extracts data.** Pulls comparable facts out of those sources (release date, developer, parameters, training tokens and compute, architecture, context length, benchmark scores, pricing, license) and records them under `data/`, each with a link to where it came from.
3. **Writes analyses.** Turns the result of a chat with Max about a source or topic into an article in `articles/`, one Markdown file per topic or finding (for example compute, data, cost or benchmarks).
4. **Updates the website.** Adds or updates the matching page in `docs/`, the public site published with GitHub Pages, so the site always reflects the latest analysis.

The agent does not decide the project's direction. Max chooses which questions to explore; the agent does the collecting, checking, writing and publishing.

## Repository layout

| Path | What it holds | Agent's responsibility |
| --- | --- | --- |
| `README.md` | Project overview | Keep in sync when the structure or workflow changes |
| `AGENTS.md` | This file | Update when the agent's role or rules change |
| `RESOURCES.md` | Every public source used, with a link and a short note | Add each new source before using it |
| `data/` | Structured data collected about models | Add facts with a source reference for each one |
| `articles/` | Analysis articles, one Markdown file per topic | Write up the result of each analysis |
| `docs/` | Public website on GitHub Pages | Publish each new or changed article |

## Rules

- **Public sources only.** Use only information that is publicly available. Never add private, paywalled-and-copied, or leaked material.
- **Cite everything.** Every data point and every claim in an article links back to an entry in `RESOURCES.md` or directly to its source. Data without a source does not go in.
- **Keep facts and opinions apart.** Record what a source says as data. Put interpretation, trends and conclusions in articles, and say how confident the conclusion is.
- **Prefer primary sources.** Use the developer's own report or the benchmark's own page over a news article about it. When sources disagree, record both and note the conflict.
- **Record dates.** Note when a source was published and when it was accessed, since model facts and leaderboards change.
- **Compare like with like.** When measuring progress, only compare numbers from the same benchmark version and setup, and say so when that is not possible.
- **Small, reviewable changes.** Work on a branch and open a pull request for Max to review. One source, dataset update or article per change where possible.
- **Keep the site in step.** An article is not done until its page in `docs/` is updated.

## Typical task

1. Get the topic or source from Max.
2. Add the source to `RESOURCES.md`.
3. Extract the relevant data into `data/`, with source references.
4. Analyse it together with Max and write the result as an article in `articles/`.
5. Add or update the article's page in `docs/`.
6. Update `README.md` if the structure or workflow changed.
7. Open a pull request summarising what was added and which sources it relies on.
