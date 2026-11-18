Write `scheduler.py` with a function `schedule(tasks, workers)` and an exception class `CycleError`.

**Input.** `tasks` is a list of dicts, each with:

- `"name"`: unique string
- `"duration"`: whole number of time units, at least 1
- `"deps"`: list of names of tasks that must finish before this one starts (may be empty or missing)
- `"priority"`: integer, higher runs first (missing means 0)

`workers` is the number of identical workers, at least 1. Each worker runs one task at a time, and a started task runs to its end without interruption.

**Rules.** Time starts at 0. A task is ready once all its dependencies have finished; a task whose dependency ends at time `t` may start at `t`. Whenever at least one worker is free and at least one task is ready, the ready task with the highest priority starts immediately; ties go to the name that sorts first. A worker never stays idle while a task is ready.

**Output.** A list of `(name, start, end)` tuples for all tasks, sorted by start time and then by name.

**Errors.**

- `ValueError` if `workers < 1`, a duration is less than 1, a name is repeated, or a dependency names a task that is not in the list. These checks come before cycle detection.
- `CycleError` if the dependencies contain a cycle. It has an attribute `cycle`: a list of names `[n0, n1, ..., nk]` such that `n0` depends on `n1`, `n1` depends on `n2`, and so on, and `nk` depends on `n0`. Each name appears once, and the list is rotated so that the name that sorts first is `n0`. A task that depends on itself gives a one-name cycle. If there are several cycles, report any one of them.

**Performance.** The function must handle 100,000 tasks in well under a second or two: aim for O(n log n) in the number of tasks plus dependencies. Do not rescan all tasks at every step, and do not use recursion that can go as deep as the longest dependency chain.
