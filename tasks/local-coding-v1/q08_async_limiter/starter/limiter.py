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
        return len(self._waiters)

    async def acquire(self):
        if self._active >= self._limit:
            future = asyncio.get_running_loop().create_future()
            self._waiters.append(future)
            await future
        self._active += 1

    def release(self):
        self._active -= 1
        if self._waiters:
            self._waiters.popleft().set_result(None)

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self.release()
