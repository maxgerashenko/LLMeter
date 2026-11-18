`intervals.py` has a function `merge_intervals` that is meant to merge date intervals, but it gives wrong results. Fix it so that it follows this specification:

- An interval is a tuple `(start, end)` of `datetime.date` values. Both ends are inclusive.
- If `start > end` in any interval, raise `ValueError`.
- The input may be in any order and must not be modified.
- Two intervals are merged when they overlap or touch. They touch when one starts on the day after the other ends (for example 1 to 3 March and 4 to 6 March become 1 to 6 March).
- An interval that lies inside another one must not shorten it.
- Return a new list of `(start, end)` tuples sorted by start date. An empty input gives an empty list.

Keep the function name and signature.
