import asyncio
import unittest

from limiter import Limiter


def run(coro, timeout=5):
    async def guarded():
        return await asyncio.wait_for(coro, timeout)
    return asyncio.run(guarded())


async def settle(rounds=5):
    for _ in range(rounds):
        await asyncio.sleep(0)


class LimiterTest(unittest.TestCase):
    def test_basic_use(self):
        async def main():
            lim = Limiter(2)
            await lim.acquire()
            async with lim:
                self.assertEqual(lim.active, 2)
            self.assertEqual(lim.active, 1)
            lim.release()
            self.assertEqual((lim.active, lim.waiting), (0, 0))
        run(main())

    def test_constructor_and_release_errors(self):
        with self.assertRaises(ValueError):
            Limiter(0)

        async def main():
            lim = Limiter(1)
            with self.assertRaises(RuntimeError):
                lim.release()
            await lim.acquire()
            lim.release()
            with self.assertRaises(RuntimeError):
                lim.release()
            self.assertEqual(lim.active, 0)
        run(main())

    def test_no_barging_after_release(self):
        async def main():
            lim = Limiter(1)
            await lim.acquire()
            got = []

            async def worker(tag):
                await lim.acquire()
                got.append(tag)

            waiter = asyncio.create_task(worker("waiter"))
            await settle()
            self.assertEqual(lim.waiting, 1)
            lim.release()
            # A newcomer arrives in the same tick, before the waiter resumes.
            newcomer = asyncio.create_task(worker("newcomer"))
            await settle()
            self.assertEqual(got, ["waiter"])
            self.assertEqual(lim.active, 1)
            lim.release()
            await settle()
            self.assertEqual(got, ["waiter", "newcomer"])
            lim.release()
            await asyncio.gather(waiter, newcomer)
        run(main())

    def test_direct_acquire_cannot_barge(self):
        async def main():
            lim = Limiter(1)
            await lim.acquire()
            waiter = asyncio.create_task(lim.acquire())
            await settle()
            lim.release()
            # Slot is handed to the waiter; it still counts as held.
            self.assertEqual(lim.active, 1)
            late = asyncio.create_task(lim.acquire())
            await settle()
            self.assertTrue(waiter.done())
            self.assertFalse(late.done())
            self.assertEqual(lim.active, 1)
            lim.release()
            await settle()
            self.assertTrue(late.done())
            lim.release()
            self.assertEqual(lim.active, 0)
        run(main())

    def test_never_over_limit_under_load(self):
        async def main():
            lim = Limiter(3)
            inside = 0
            peak = 0
            done = 0

            async def worker(i):
                nonlocal inside, peak, done
                for _ in range(4):
                    async with lim:
                        inside += 1
                        peak = max(peak, inside)
                        self.assertLessEqual(lim.active, 3)
                        for _ in range(i % 3):
                            await asyncio.sleep(0)
                        inside -= 1
                    done += 1

            await asyncio.gather(*(worker(i) for i in range(40)))
            self.assertEqual(done, 160)
            self.assertEqual(peak, 3)
            self.assertEqual((lim.active, lim.waiting), (0, 0))
        run(main(), timeout=20)

    def test_fifo_order(self):
        async def main():
            lim = Limiter(1)
            await lim.acquire()
            order = []

            async def worker(i):
                await lim.acquire()
                order.append(i)
                await asyncio.sleep(0)
                lim.release()

            tasks = []
            for i in range(8):
                tasks.append(asyncio.create_task(worker(i)))
                await settle(2)
            self.assertEqual(lim.waiting, 8)
            lim.release()
            await asyncio.gather(*tasks)
            self.assertEqual(order, list(range(8)))
        run(main())

    def test_cancelled_waiter_is_forgotten(self):
        async def main():
            lim = Limiter(1)
            await lim.acquire()
            first = asyncio.create_task(lim.acquire())
            second = asyncio.create_task(lim.acquire())
            await settle()
            first.cancel()
            await settle()
            self.assertTrue(first.cancelled())
            self.assertEqual(lim.waiting, 1)
            lim.release()  # must not raise
            await settle()
            self.assertTrue(second.done() and not second.cancelled())
            self.assertEqual(lim.active, 1)
            lim.release()
            self.assertEqual((lim.active, lim.waiting), (0, 0))
        run(main())

    def test_cancel_after_handover_passes_slot_on(self):
        async def main():
            lim = Limiter(1)
            await lim.acquire()
            first = asyncio.create_task(lim.acquire())
            second = asyncio.create_task(lim.acquire())
            await settle()
            lim.release()   # slot handed to `first`...
            first.cancel()  # ...which is cancelled before it runs again
            await settle()
            self.assertTrue(first.cancelled())
            self.assertTrue(second.done() and not second.cancelled())
            self.assertEqual((lim.active, lim.waiting), (1, 0))
            lim.release()
            self.assertEqual(lim.active, 0)
        run(main())

    def test_cancel_after_handover_with_no_other_waiter_frees_slot(self):
        async def main():
            lim = Limiter(1)
            await lim.acquire()
            only = asyncio.create_task(lim.acquire())
            await settle()
            lim.release()
            only.cancel()
            await settle()
            self.assertTrue(only.cancelled())
            self.assertEqual((lim.active, lim.waiting), (0, 0))
            await lim.acquire()  # must not block
            self.assertEqual(lim.active, 1)
        run(main())

    def test_all_waiters_cancelled_then_release(self):
        async def main():
            lim = Limiter(2)
            await lim.acquire()
            await lim.acquire()
            waiters = [asyncio.create_task(lim.acquire()) for _ in range(5)]
            await settle()
            for task in waiters:
                task.cancel()
            await settle()
            self.assertEqual(lim.waiting, 0)
            lim.release()
            lim.release()
            self.assertEqual(lim.active, 0)
            async with lim:
                self.assertEqual(lim.active, 1)
        run(main())

    def test_timeouts_do_not_leak_slots(self):
        async def main():
            lim = Limiter(2)

            async def holder():
                async with lim:
                    await asyncio.sleep(0.05)

            async def impatient():
                try:
                    await asyncio.wait_for(lim.acquire(), 0.005)
                except asyncio.TimeoutError:
                    return False
                lim.release()
                return True

            holders = [asyncio.create_task(holder()) for _ in range(2)]
            await settle()
            results = await asyncio.gather(*(impatient() for _ in range(10)))
            self.assertEqual(results, [False] * 10)
            await asyncio.gather(*holders)
            self.assertEqual((lim.active, lim.waiting), (0, 0))
            await asyncio.gather(*(holder() for _ in range(6)))
            self.assertEqual((lim.active, lim.waiting), (0, 0))
        run(main(), timeout=10)

    def test_random_cancellation_storm(self):
        async def main():
            import random
            rng = random.Random(7)
            lim = Limiter(2)
            inside = 0
            peak = 0

            async def worker():
                nonlocal inside, peak
                async with lim:
                    inside += 1
                    peak = max(peak, inside)
                    try:
                        await asyncio.sleep(rng.random() * 0.002)
                    finally:
                        inside -= 1

            tasks = [asyncio.create_task(worker()) for _ in range(60)]
            for _ in range(25):
                await asyncio.sleep(rng.random() * 0.001)
                rng.choice(tasks).cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            self.assertLessEqual(peak, 2)
            self.assertEqual(inside, 0)
            self.assertEqual((lim.active, lim.waiting), (0, 0))
            await asyncio.wait_for(lim.acquire(), 1)
        run(main(), timeout=15)
