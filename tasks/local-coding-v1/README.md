# Local coding suite, version 1.0.0

Ten fixed coding tasks for comparing local models, and the same model in different runtimes (LM Studio, TensorFold). Frozen on 2026-11-18.

**This folder is frozen.** Every run, now and later, uses exactly these files, so a model tested next year can be compared with one tested today. Do not edit anything here. If a task has to change, copy the folder to `local-coding-v2`, change it there, and never compare scores across versions. `python3 grade.py selfcheck` fails if any file differs from the hashes in `manifest.json`.

The run rules (which models, thinking on and off, parallel requests, context, one model in memory) are in [data/local-coding-task-set.md](../../data/local-coding-task-set.md). The models are listed in [data/local-test-models.csv](../../data/local-test-models.csv).

## Tasks

| ID | Level | Weight | Task | Hidden tests |
| --- | --- | --- | --- | --- |
| q01 | easy | 1 | Fix a function that merges date intervals | 12 |
| q02 | easy | 1 | Add a CSV-row constructor in the style of the existing code | 15 |
| q03 | medium | 2 | Find and fix three seeded bugs in an inventory module | 18 |
| q04 | medium | 2 | Move and rename an API across a four-file package, keeping deprecated wrappers | 14 |
| q05 | medium | 2 | Fix a root cause that sits two calls away from the symptom | 12 |
| q06 | hard | 3 | Expression evaluator with exact error positions | 76 |
| q07 | hard | 3 | Priority scheduler with cycle reporting and a speed bound | 27 |
| q08 | hard | 3 | Fix an asyncio limiter: over-admission, fairness, cancellation | 12 |
| q09 | hard | 3 | Version-constraint solver with backtracking | 45 |
| q10 | hard | 3 | Unified-diff applier with offsets and fuzz | 45 |

The tasks are hard to reason about but short to write: every reference solution is under 160 lines, so running time stays low. Hard tasks carry 15 of the 23 weight points.

## Layout

```
manifest.json            task list, weights, test counts, file hashes
grade.py                 builds prompts, grades answers, checks the suite
qNN_name/
  prompt.md              the task statement
  starter/               files the model is given
  tests/test_hidden.py   hidden tests (never shown to the model)
  reference/             a solution that passes every hidden test
```

Python 3 standard library only; no packages to install.

## How to run a model

1. Get the exact prompt for each task:

   ```
   python3 grade.py prompts /path/to/prompts     # q01.md ... q10.md
   ```

   Each prompt is the fixed instructions, the task statement and the starter files. Send it as a single user message, with no system prompt, to the model's chat API.

2. Save each raw reply as `q01.txt` ... `q10.txt` in one folder per run. Save the reply exactly as returned; thinking blocks in `<think>` tags are ignored by the grader.

3. Grade the folder:

   ```
   python3 grade.py grade /path/to/answers
   ```

   The output is JSON with the run score (0 to 100), the score per level and the result per task.

## Scoring

- The model must return whole files in the form `### FILE: path` followed by a fenced code block. Anything else in the reply is ignored. A reply with no file block scores 0 for that task.
- The returned files are laid over the starter files and the hidden tests are run.
- Task score = hidden tests gained over the untouched starter, as a share of the tests the starter fails. The starter already passes some tests (the `baseline` in `manifest.json`), so a reply that changes nothing scores 0, and breaking working behaviour cannot score below 0.
- Run score = weighted mean of the task scores, times 100. Weights: easy 1, medium 2, hard 3.
- One hidden test may run for 10 seconds. After three timed-out tests the rest of that task's tests count as failed. A task's tests may run for 5 minutes in total.

## Checking the suite

```
python3 grade.py selfcheck
```

This confirms, for every task, that the reference solution passes all hidden tests, that the starter passes exactly the recorded baseline, and that no frozen file has changed.

## Limits to keep in mind

- The difficulty levels are a design intent. They are confirmed only after a pilot run with a strong, a middle and a weak model (see the calibration section of the run rules). If the pilot shows a task does not separate models, the fix goes into version 2, not into this folder.
- The tasks and hidden tests are public in this repository. A future model could have seen them in training. Record the date of each run, and treat a sudden jump on this suite alone with care.
- The tasks are single-prompt tasks, not long agent runs. They measure code reasoning in one reply, not the ability to work for an hour in a repository. LLMeter's long-coding scores come from other sources (see the long-coding article).
- Timing tests in q07 and q09 depend on the machine. On a very slow or heavily loaded machine they can fail for a correct answer, so grade with the model unloaded or idle.
