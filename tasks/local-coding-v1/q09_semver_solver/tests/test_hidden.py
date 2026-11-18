import time
import unittest

from solver import ResolutionError, solve


def one(versions):
    """Index for a package 'p' with the given versions and no dependencies."""
    return {"p": {v: {} for v in versions}}


LADDER = ["0.0.0", "0.0.3", "0.0.4", "0.2.3", "0.2.9", "0.3.0", "1.2.3",
          "1.2.9", "1.3.0", "1.9.9", "1.10.0", "2.0.0"]

PICKS = [
    ("*", "2.0.0"),
    ("<2.0.0", "1.10.0"),
    ("<=1.9.9", "1.9.9"),
    (">1.2.3, <1.3.0", "1.2.9"),
    ("==0.2.3", "0.2.3"),
    ("0.3.0", "0.3.0"),
    ("!=2.0.0", "1.10.0"),
    ("~1.2.3", "1.2.9"),
    ("^1.2.3", "1.10.0"),
    ("^0.2.3", "0.2.9"),
    ("^0.0.3", "0.0.3"),
    ("^0.0.0", "0.0.0"),
    ("~0.0.3", "0.0.4"),
    (" >= 1.3.0 ,<1.10.0 ", "1.9.9"),
    ("<1.0.0,!=0.3.0,!=0.2.9", "0.2.3"),
    (">=1.2.3,*", "2.0.0"),
]

BAD_CONSTRAINTS = ["", "1.2", ">=1.2.x", "=>1.0.0", "1.0.0 || 2.0.0", "^1.2.3.4",
                   ">=1.0.0,", "~", "v1.0.0", ">= -1.0.0"]


class ConstraintTests(unittest.TestCase):
    pass


def _pick_case(constraint, expected):
    def test(self):
        self.assertEqual(solve(one(LADDER), {"p": constraint}), {"p": expected})
    return test


def _bad_case(constraint):
    def test(self):
        with self.assertRaises(ValueError):
            solve(one(LADDER), {"p": constraint})
    return test


for _i, (_c, _e) in enumerate(PICKS):
    setattr(ConstraintTests, f"test_pick_{_i:02d}", _pick_case(_c, _e))
for _i, _c in enumerate(BAD_CONSTRAINTS):
    setattr(ConstraintTests, f"test_bad_constraint_{_i:02d}", _bad_case(_c))


class SolveTests(unittest.TestCase):
    def test_empty_root(self):
        self.assertEqual(solve({"a": {"1.0.0": {}}}, {}), {})

    def test_only_needed_packages(self):
        index = {"a": {"1.0.0": {"b": "*"}}, "b": {"1.0.0": {}}, "unused": {"1.0.0": {}}}
        self.assertEqual(solve(index, {"a": "*"}), {"a": "1.0.0", "b": "1.0.0"})

    def test_numeric_version_order(self):
        index = one(["1.9.0", "1.10.0", "1.2.0"])
        self.assertEqual(solve(index, {"p": "*"}), {"p": "1.10.0"})

    def test_transitive_and_shared_constraint(self):
        index = {
            "app": {"1.0.0": {"lib": "^1.0.0", "log": ">=2.0.0"}},
            "lib": {"1.4.0": {"log": "<3.0.0"}, "1.0.0": {}},
            "log": {"3.1.0": {}, "2.5.0": {}, "1.0.0": {}},
        }
        self.assertEqual(solve(index, {"app": "*"}),
                         {"app": "1.0.0", "lib": "1.4.0", "log": "2.5.0"})

    def test_backtracks_to_older_version(self):
        index = {
            "a": {"2.0.0": {"c": ">=2.0.0"}, "1.0.0": {"c": "<2.0.0"}},
            "b": {"1.0.0": {"c": "<2.0.0"}},
            "c": {"2.0.0": {}, "1.5.0": {}},
        }
        self.assertEqual(solve(index, {"a": "*", "b": "*"}),
                         {"a": "1.0.0", "b": "1.0.0", "c": "1.5.0"})

    def test_dependency_contradicting_chosen_version_is_skipped(self):
        index = {
            "a": {"1.0.0": {}, "0.9.0": {}},
            "z": {"2.0.0": {"a": "<1.0.0"}, "1.0.0": {"a": "*"}},
        }
        self.assertEqual(solve(index, {"a": "*", "z": "*"}), {"a": "1.0.0", "z": "1.0.0"})

    def test_search_order_prefers_alphabetically_first_package(self):
        index = {
            "a": {"2.0.0": {"b": "<2.0.0"}, "1.0.0": {}},
            "b": {"2.0.0": {"a": "<2.0.0"}, "1.0.0": {}},
        }
        self.assertEqual(solve(index, {"a": "*", "b": "*"}), {"a": "2.0.0", "b": "1.0.0"})

    def test_dropped_branch_removes_its_packages(self):
        index = {
            "a": {"2.0.0": {"extra": "*", "c": "==9.9.9"}, "1.0.0": {}},
            "c": {"1.0.0": {}},
            "extra": {"1.0.0": {}},
        }
        self.assertEqual(solve(index, {"a": "*"}), {"a": "1.0.0"})

    def test_dependency_cycle_is_fine(self):
        index = {"a": {"1.0.0": {"b": "^1.0.0"}}, "b": {"1.1.0": {"a": "*"}, "1.0.0": {}}}
        self.assertEqual(solve(index, {"a": "*"}), {"a": "1.0.0", "b": "1.1.0"})

    def test_missing_package_backtracks(self):
        index = {"a": {"2.0.0": {"ghost": "*"}, "1.0.0": {}}}
        self.assertEqual(solve(index, {"a": "*"}), {"a": "1.0.0"})

    def test_missing_root_package(self):
        with self.assertRaises(ResolutionError):
            solve({}, {"ghost": "*"})

    def test_no_solution(self):
        index = {
            "a": {"1.0.0": {"c": ">=2.0.0"}},
            "b": {"1.0.0": {"c": "<2.0.0"}},
            "c": {"2.0.0": {}, "1.0.0": {}},
        }
        with self.assertRaises(ResolutionError):
            solve(index, {"a": "*", "b": "*"})

    def test_root_constraint_unmet(self):
        with self.assertRaises(ResolutionError):
            solve(one(["1.0.0"]), {"p": ">=2.0.0"})

    def test_bad_version_in_index(self):
        with self.assertRaises(ValueError):
            solve({"p": {"1.0": {}}}, {"p": "*"})

    def test_bad_constraint_in_unreached_branch(self):
        index = {"a": {"1.0.0": {}}, "other": {"1.0.0": {"a": "latest"}}}
        with self.assertRaises(ValueError):
            solve(index, {"a": "*"})

    def test_inputs_not_modified(self):
        index = {"a": {"1.0.0": {"b": "*"}}, "b": {"1.0.0": {}}}
        root = {"a": "*"}
        solve(index, root)
        self.assertEqual(index, {"a": {"1.0.0": {"b": "*"}}, "b": {"1.0.0": {}}})
        self.assertEqual(root, {"a": "*"})

    def test_layered_backtracking(self):
        # Each package's newest version asks for an impossible 'base'.
        index = {"base": {"1.0.0": {}}}
        for i in range(8):
            index[f"p{i}"] = {"2.0.0": {"base": ">=2.0.0"}, "1.0.0": {"base": "^1.0.0"}}
        root = {f"p{i}": "*" for i in range(8)}
        expected = {f"p{i}": "1.0.0" for i in range(8)}
        expected["base"] = "1.0.0"
        self.assertEqual(solve(index, root), expected)

    def test_wide_index_is_fast(self):
        index = {}
        names = [f"pkg{i:02d}" for i in range(30)]
        for pos, name in enumerate(names):
            deps = {}
            if pos + 1 < len(names):
                deps = {names[pos + 1]: "^1.0.0"}
            index[name] = {f"{major}.{minor}.0": dict(deps)
                           for major in (1, 2) for minor in range(20)}
        started = time.perf_counter()
        result = solve(index, {"pkg00": "*"})
        self.assertLess(time.perf_counter() - started, 3.0)
        self.assertEqual(result["pkg00"], "2.19.0")
        self.assertEqual(result["pkg29"], "1.19.0")
        self.assertEqual(len(result), 30)

    def test_long_chain(self):
        n = 200
        index = {f"n{i:03d}": {"1.0.0": ({f"n{i + 1:03d}": "*"} if i + 1 < n else {})}
                 for i in range(n)}
        self.assertEqual(len(solve(index, {"n000": "*"})), n)
