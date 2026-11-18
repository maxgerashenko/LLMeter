import asyncio
from collections import deque


class Limiter:
    """Lets at most `limit` holders in at a time."""

    def __init__(self, limit):
        if limit < 1:
            raise ValueError("limit must be at least 1")
        self._limit = limit
        self._active = 0
        self._waiters = deque()

    @property
    def active(self):
        return self._active

    @property
    def waiting(self):
        return sum(1 for future in self._waiters if not future.done())

    async def acquire(self):
        if self._active < self._limit and not self._waiters:
            self._active += 1
            return
        future = asyncio.get_running_loop().create_future()
        self._waiters.append(future)
        try:
            await future
        except asyncio.CancelledError:
            if future.done() and not future.cancelled():
                # The slot was already handed to us: pass it on.
                self._hand_over()
            else:
                try:
                    self._waiters.remove(future)
                except ValueError:
                    pass
            raise

    def _hand_over(self):
        """Give one held slot to the next live waiter, or free it."""
        while self._waiters:
            future = self._waiters.popleft()
            if not future.done():
                future.set_result(None)
                return
        self._active -= 1

    def release(self):
        if self._active < 1:
            raise RuntimeError("release() without a holder")
        self._hand_over()

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self.release()
