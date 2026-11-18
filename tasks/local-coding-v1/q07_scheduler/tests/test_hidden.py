import time
import unittest

from scheduler import CycleError, schedule


def t(name, duration, deps=(), priority=None):
    task = {"name": name, "duration": duration, "deps": list(deps)}
    if priority is not None:
        task["priority"] = priority
    return task


class BasicScheduling(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(schedule([], 2), [])

    def test_single_worker_name_order(self):
        tasks = [t("b", 2), t("a", 1), t("c", 3)]
        self.assertEqual(schedule(tasks, 1), [("a", 0, 1), ("b", 1, 3), ("c", 3, 6)])

    def test_priority_beats_name(self):
        tasks = [t("a", 1), t("b", 1, priority=5), t("c", 1, priority=-1)]
        self.assertEqual(schedule(tasks, 1), [("b", 0, 1), ("a", 1, 2), ("c", 2, 3)])

    def test_two_workers(self):
        tasks = [t("a", 3), t("b", 1), t("c", 1), t("d", 1)]
        self.assertEqual(
            schedule(tasks, 2),
            [("a", 0, 3), ("b", 0, 1), ("c", 1, 2), ("d", 2, 3)],
        )

    def test_dependency_chain(self):
        tasks = [t("c", 1, ["b"]), t("b", 2, ["a"]), t("a", 3)]
        self.assertEqual(schedule(tasks, 4), [("a", 0, 3), ("b", 3, 5), ("c", 5, 6)])

    def test_dep_end_is_start(self):
        tasks = [t("a", 2), t("b", 5), t("z", 1, ["a"])]
        self.assertEqual(schedule(tasks, 2), [("a", 0, 2), ("b", 0, 5), ("z", 2, 3)])

    def test_diamond_waits_for_slowest(self):
        tasks = [t("top", 1), t("l", 4, ["top"]), t("r", 1, ["top"]), t("end", 1, ["l", "r"])]
        self.assertEqual(
            schedule(tasks, 3),
            [("top", 0, 1), ("l", 1, 5), ("r", 1, 2), ("end", 5, 6)],
        )

    def test_low_priority_runs_when_high_not_ready(self):
        tasks = [t("gate", 3), t("vip", 1, ["gate"], priority=9), t("slow", 2), t("x", 2)]
        self.assertEqual(
            schedule(tasks, 2),
            [("gate", 0, 3), ("slow", 0, 2), ("x", 2, 4), ("vip", 3, 4)],
        )

    def test_newly_ready_high_priority_jumps_queue(self):
        tasks = [t("gate", 1), t("vip", 1, ["gate"], priority=9),
                 t("m", 1), t("n", 1), t("o", 1)]
        self.assertEqual(
            schedule(tasks, 1),
            [("gate", 0, 1), ("vip", 1, 2), ("m", 2, 3), ("n", 3, 4), ("o", 4, 5)],
        )

    def test_simultaneous_finishes_fill_by_priority(self):
        tasks = [t("a", 2), t("b", 2), t("p", 1, ["a"], priority=1),
                 t("q", 1, ["b"], priority=2), t("r", 1, priority=0)]
        self.assertEqual(
            schedule(tasks, 2),
            [("a", 0, 2), ("b", 0, 2), ("p", 2, 3), ("q", 2, 3), ("r", 3, 4)],
        )

    def test_missing_optional_keys_and_duplicate_deps(self):
        tasks = [{"name": "a", "duration": 1}, {"name": "b", "duration": 1, "deps": ["a", "a"]}]
        self.assertEqual(schedule(tasks, 2), [("a", 0, 1), ("b", 1, 2)])

    def test_output_sorted_by_start_then_name(self):
        tasks = [t("z", 1, priority=3), t("y", 1, priority=2), t("x", 1, priority=1)]
        self.assertEqual(schedule(tasks, 3), [("x", 0, 1), ("y", 0, 1), ("z", 0, 1)])

    def test_input_not_modified(self):
        tasks = [t("a", 1), t("b", 1, ["a"])]
        snapshot = [dict(task, deps=list(task["deps"])) for task in tasks]
        schedule(tasks, 1)
        self.assertEqual(tasks, snapshot)


class Errors(unittest.TestCase):
    def test_bad_workers(self):
        with self.assertRaises(ValueError):
            schedule([t("a", 1)], 0)

    def test_bad_duration(self):
        with self.assertRaises(ValueError):
            schedule([t("a", 0)], 1)

    def test_duplicate_name(self):
        with self.assertRaises(ValueError):
            schedule([t("a", 1), t("a", 2)], 1)

    def test_unknown_dependency(self):
        with self.assertRaises(ValueError):
            schedule([t("a", 1, ["ghost"])], 1)

    def test_unknown_dependency_checked_before_cycle(self):
        with self.assertRaises(ValueError):
            schedule([t("a", 1, ["b"]), t("b", 1, ["a"]), t("c", 1, ["ghost"])], 1)

    def check_cycle(self, tasks, members):
        with self.assertRaises(CycleError) as ctx:
            schedule(tasks, 2)
        cycle = ctx.exception.cycle
        deps = {task["name"]: set(task["deps"]) for task in tasks}
        self.assertEqual(len(cycle), len(set(cycle)))
        self.assertEqual(cycle[0], min(cycle))
        for i, name in enumerate(cycle):
            self.assertIn(cycle[(i + 1) % len(cycle)], deps[name])
        if members is not None:
            self.assertEqual(set(cycle), set(members))

    def test_self_cycle(self):
        self.check_cycle([t("a", 1), t("loop", 1, ["loop"])], ["loop"])

    def test_two_cycle(self):
        self.check_cycle([t("b", 1, ["a"]), t("a", 1, ["b"]), t("c", 1)], ["a", "b"])

    def test_long_cycle_with_tail(self):
        tasks = [t("start", 1, ["m"]), t("m", 1, ["k"]), t("k", 1, ["z"]),
                 t("z", 1, ["c"]), t("c", 1, ["m"]), t("free", 1)]
        self.check_cycle(tasks, ["m", "k", "z", "c"])

    def test_cycle_not_confused_by_shared_dependency(self):
        tasks = [t("base", 1), t("a", 1, ["base"]), t("b", 1, ["base", "a"]),
                 t("c", 1, ["b", "d"]), t("d", 1, ["c"])]
        self.check_cycle(tasks, ["c", "d"])

    def test_several_cycles_any_is_valid(self):
        tasks = [t("a", 1, ["b"]), t("b", 1, ["a"]), t("x", 1, ["y"]),
                 t("y", 1, ["w"]), t("w", 1, ["x"])]
        self.check_cycle(tasks, None)


class Performance(unittest.TestCase):
    LIMIT = 4.0

    def timed(self, tasks, workers):
        started = time.perf_counter()
        result = schedule(tasks, workers)
        return result, time.perf_counter() - started

    def test_wide(self):
        n = 100_000
        tasks = [t(f"t{i:06d}", 1 + i % 7, priority=i % 13) for i in range(n)]
        result, seconds = self.timed(tasks, 8)
        self.assertEqual(len(result), n)
        self.assertLess(seconds, self.LIMIT)

    def test_deep_chain(self):
        n = 100_000
        tasks = [t("t000000", 1)] + [t(f"t{i:06d}", 1, [f"t{i - 1:06d}"]) for i in range(1, n)]
        result, seconds = self.timed(list(reversed(tasks)), 3)
        self.assertEqual(result[-1], (f"t{n - 1:06d}", n - 1, n))
        self.assertLess(seconds, self.LIMIT)

    def test_fan_in(self):
        n = 50_000
        tasks = [t(f"leaf{i:05d}", 1) for i in range(n)]
        tasks.append(t("sink", 1, [f"leaf{i:05d}" for i in range(n)]))
        result, seconds = self.timed(tasks, 1000)
        self.assertEqual(result[-1], ("sink", 50, 51))
        self.assertLess(seconds, self.LIMIT)

    def test_deep_cycle_detected_without_recursion_error(self):
        n = 50_000
        tasks = [t(f"t{i:05d}", 1, [f"t{(i + 1) % n:05d}"]) for i in range(n)]
        started = time.perf_counter()
        with self.assertRaises(CycleError) as ctx:
            schedule(tasks, 2)
        self.assertLess(time.perf_counter() - started, self.LIMIT)
        self.assertEqual(len(ctx.exception.cycle), n)
        self.assertEqual(ctx.exception.cycle[0], "t00000")
