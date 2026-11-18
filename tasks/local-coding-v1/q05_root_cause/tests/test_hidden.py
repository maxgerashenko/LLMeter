import unittest
from decimal import Decimal

import pricing
from pricing import Order, best_discount, line_price, tier_table

D = Decimal


class RootCauseTest(unittest.TestCase):
    def setUp(self):
        tier_table.cache_clear()

    def test_given_failing_test(self):
        order = Order("eu")
        order.add("bolt", D("2.00"), 20)
        first = order.total()
        self.assertEqual(first, D("45.22"))
        self.assertEqual(order.total(), first)

    def test_many_repeats(self):
        order = Order("eu")
        order.add("bolt", D("2.00"), 20)
        self.assertEqual({order.total() for _ in range(7)}, {D("45.22")})

    def test_two_lines_in_one_order(self):
        order = Order("eu")
        order.add("bolt", D("2.00"), 20)
        order.add("nut", D("1.00"), 60)
        self.assertEqual(order.subtotal(), D("92.00"))
        self.assertEqual(order.total(), D("109.48"))

    def test_fresh_orders_agree(self):
        totals = []
        for _ in range(4):
            order = Order("us")
            order.add("pipe", D("3.10"), 100)
            totals.append(order.total())
        self.assertEqual(totals, [D("305.16")] * 4)

    def test_best_discount_does_not_modify_argument(self):
        tiers = [(1, 0), (10, 5), (50, 10)]
        self.assertEqual(best_discount(tiers, 12), 5)
        self.assertEqual(tiers, [(1, 0), (10, 5), (50, 10)])

    def test_best_discount_repeated_on_same_list(self):
        tiers = [(1, 0), (10, 5), (50, 10)]
        self.assertEqual([best_discount(tiers, q) for q in (60, 60, 12, 12, 1, 1)],
                         [10, 10, 5, 5, 0, 0])

    def test_best_discount_below_lowest_tier(self):
        self.assertEqual(best_discount([(5, 2), (10, 5)], 3), 0)
        self.assertEqual(best_discount([], 3), 0)

    def test_tier_table_unchanged_after_pricing(self):
        before = list(tier_table("eu"))
        for qty in (1, 20, 300):
            line_price(D("1.00"), qty, "eu")
        self.assertEqual(list(tier_table("eu")), before)
        self.assertEqual(before, [(1, 0), (10, 5), (50, 10), (200, 15)])

    def test_tier_table_still_cached(self):
        tier_table("us")
        tier_table("us")
        self.assertGreaterEqual(tier_table.cache_info().hits, 1)

    def test_line_price_sequence(self):
        prices = [line_price(D("1.00"), q, "eu") for q in (9, 10, 49, 50, 200, 10)]
        self.assertEqual(prices, [D("9.00"), D("9.50"), D("46.55"), D("45.00"),
                                  D("170.00"), D("9.50")])

    def test_regions_do_not_interfere(self):
        a = line_price(D("2.00"), 30, "us")
        b = line_price(D("2.00"), 30, "eu")
        c = line_price(D("2.00"), 30, "us")
        self.assertEqual((a, b, c), (D("57.60"), D("57.00"), D("57.60")))

    def test_errors_kept(self):
        with self.assertRaises(KeyError):
            Order("mars")
        with self.assertRaises(ValueError):
            Order("eu").add("x", D("1"), 0)
        self.assertTrue(hasattr(pricing, "CENT"))
