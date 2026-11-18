`limiter.py` has an asyncio concurrency limiter. It is meant to let at most `limit` holders in at a time, but under load it lets too many in, and cancelling a waiting task can break it or leave other tasks waiting for ever.

Fix `Limiter` so that all of the following hold. Keep the public API (`Limiter(limit)`, `await acquire()`, `release()`, `async with`, and the `active` and `waiting` properties).

1. **Never over the limit.** At no moment do more than `limit` callers hold the limiter, whatever the interleaving of `acquire` and `release`.
2. **First come, first served.** Waiters get in strictly in the order they called `acquire`. A caller that arrives while others are waiting must wait behind them, even if a slot has just been released.
3. **Cancellation is safe.** A task cancelled while waiting in `acquire` gets `CancelledError`, holds nothing afterwards, and no slot is lost: if a slot had already been handed to it, that slot goes to the next waiter (or becomes free). Cancelled waiters never cause `release` to raise.
4. **Bookkeeping.** `active` is the number of current holders (a slot that has been handed to a waiter counts as held, even before that waiter's task runs again). `waiting` is the number of callers still waiting for a slot. `release()` with no holder raises `RuntimeError`.
5. `Limiter(limit)` raises `ValueError` if `limit < 1`.

Use only the standard library. Do not use `asyncio.Semaphore` or other ready-made synchronisation primitives from `asyncio` (plain futures are fine).
