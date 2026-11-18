import unittest
from datetime import date

from intervals import merge_intervals


def d(day, month=3):
    return date(2026, month, day)


class MergeIntervalsTest(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(merge_intervals([]), [])

    def test_disjoint_kept_and_sorted(self):
        self.assertEqual(
            merge_intervals([(d(10), d(12)), (d(1), d(3))]),
            [(d(1), d(3)), (d(10), d(12))],
        )

    def test_overlap(self):
        self.assertEqual(merge_intervals([(d(1), d(5)), (d(4), d(9))]), [(d(1), d(9))])

    def test_same_day_boundary(self):
        self.assertEqual(merge_intervals([(d(1), d(5)), (d(5), d(9))]), [(d(1), d(9))])

    def test_touching_next_day(self):
        self.assertEqual(merge_intervals([(d(1), d(3)), (d(4), d(6))]), [(d(1), d(6))])

    def test_gap_of_one_day_not_merged(self):
        self.assertEqual(
            merge_intervals([(d(1), d(3)), (d(5), d(6))]),
            [(d(1), d(3)), (d(5), d(6))],
        )

    def test_touching_across_month_end(self):
        self.assertEqual(
            merge_intervals([(d(20, 3), d(31, 3)), (d(1, 4), d(2, 4))]),
            [(d(20, 3), d(2, 4))],
        )

    def test_contained_interval_does_not_shorten(self):
        self.assertEqual(merge_intervals([(d(1), d(20)), (d(5), d(6))]), [(d(1), d(20))])

    def test_unsorted_chain(self):
        data = [(d(8), d(9)), (d(1), d(2)), (d(3), d(7)), (d(15), d(15))]
        self.assertEqual(merge_intervals(data), [(d(1), d(9)), (d(15), d(15))])

    def test_input_not_modified(self):
        data = [(d(8), d(9)), (d(1), d(2))]
        copy = list(data)
        merge_intervals(data)
        self.assertEqual(data, copy)

    def test_invalid_interval(self):
        with self.assertRaises(ValueError):
            merge_intervals([(d(1), d(2)), (d(9), d(8))])

    def test_returns_tuples_in_new_list(self):
        data = [(d(1), d(2))]
        out = merge_intervals(data)
        self.assertIsNot(out, data)
        self.assertEqual(out, [(d(1), d(2))])
        self.assertIsInstance(out[0], tuple)
