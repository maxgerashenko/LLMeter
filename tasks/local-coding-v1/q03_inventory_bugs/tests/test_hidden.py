import unittest
from decimal import Decimal

from inventory import Inventory

D = Decimal


def stocked(n):
    inv = Inventory()
    for i in range(n):
        inv.add_stock(f"sku{i:02d}", 1, D("1.00"))
    return inv


class BugOnePaging(unittest.TestCase):
    def test_first_page_full(self):
        self.assertEqual(stocked(5).page(1, 2), ["sku00", "sku01"])

    def test_second_page(self):
        self.assertEqual(stocked(5).page(2, 2), ["sku02", "sku03"])

    def test_last_page_short(self):
        self.assertEqual(stocked(5).page(3, 2), ["sku04"])

    def test_page_size_one(self):
        self.assertEqual(stocked(3).page(2, 1), ["sku01"])

    def test_past_end_and_errors(self):
        inv = stocked(3)
        self.assertEqual(inv.page(4, 2), [])
        with self.assertRaises(ValueError):
            inv.page(0, 2)
        with self.assertRaises(ValueError):
            inv.page(1, 0)


class BugTwoTags(unittest.TestCase):
    def test_default_tags_not_shared(self):
        inv = Inventory()
        inv.add_stock("a", 1, D("1"))
        inv.add_stock("b", 1, D("1"))
        inv.add_stock("a", 1, D("1"), ["red"])
        self.assertEqual(inv.tags("a"), ["red"])
        self.assertEqual(inv.tags("b"), [])

    def test_default_not_shared_between_inventories(self):
        one, two = Inventory(), Inventory()
        one.add_stock("a", 1, D("1"))
        one.add_stock("a", 1, D("1"), ["x"])
        two.add_stock("z", 1, D("1"))
        self.assertEqual(two.tags("z"), [])

    def test_callers_list_not_modified_or_shared(self):
        inv = Inventory()
        mine = ["red"]
        inv.add_stock("a", 1, D("1"), mine)
        inv.add_stock("a", 1, D("1"), ["blue"])
        self.assertEqual(mine, ["red"])
        mine.append("green")
        self.assertEqual(inv.tags("a"), ["red", "blue"])

    def test_tags_deduplicated_in_order(self):
        inv = Inventory()
        inv.add_stock("a", 1, D("1"), ["red", "blue"])
        inv.add_stock("a", 1, D("1"), ["blue", "green", "red"])
        self.assertEqual(inv.tags("a"), ["red", "blue", "green"])


class BugThreeRounding(unittest.TestCase):
    def test_half_up_docstring_example(self):
        inv = Inventory()
        inv.add_stock("a", 1, D("2.675"))
        self.assertEqual(inv.line_value("a"), D("2.68"))

    def test_half_up_other_values(self):
        inv = Inventory()
        inv.add_stock("a", 1, D("1.005"))
        inv.add_stock("b", 3, D("0.335"))
        inv.add_stock("c", 1, D("0.125"))
        self.assertEqual(inv.line_value("a"), D("1.01"))
        self.assertEqual(inv.line_value("b"), D("1.01"))
        self.assertEqual(inv.line_value("c"), D("0.13"))

    def test_two_decimal_places_kept(self):
        inv = Inventory()
        inv.add_stock("a", 2, D("1.5"))
        self.assertEqual(str(inv.line_value("a")), "3.00")

    def test_large_value_exact(self):
        inv = Inventory()
        inv.add_stock("a", 3, D("33333333333333.335"))
        self.assertEqual(inv.line_value("a"), D("100000000000000.01"))

    def test_total_rounds_each_line_first(self):
        inv = Inventory()
        inv.add_stock("a", 1, D("0.125"))
        inv.add_stock("b", 1, D("0.125"))
        self.assertEqual(inv.total_value(), D("0.26"))
        self.assertEqual(str(Inventory().total_value()), "0.00")


class UnchangedBehaviour(unittest.TestCase):
    def test_add_and_remove(self):
        inv = Inventory()
        inv.add_stock("a", 5, D("2.00"))
        inv.add_stock("a", 2, D("3.00"))
        self.assertEqual(inv.qty("a"), 7)
        self.assertEqual(inv.line_value("a"), D("21.00"))
        inv.remove_stock("a", 7)
        self.assertEqual(inv.qty("a"), 0)
        self.assertEqual(inv.page(1, 5), ["a"])

    def test_errors(self):
        inv = Inventory()
        inv.add_stock("a", 1, D("1"))
        with self.assertRaises(ValueError):
            inv.add_stock("a", 0, D("1"))
        with self.assertRaises(ValueError):
            inv.remove_stock("a", 2)
        with self.assertRaises(KeyError):
            inv.remove_stock("nope", 1)
        with self.assertRaises(KeyError):
            inv.line_value("nope")
        self.assertEqual(inv.qty("nope"), 0)

    def test_low_stock_is_at_or_below(self):
        inv = Inventory()
        inv.add_stock("b", 3, D("1"))
        inv.add_stock("a", 2, D("1"))
        inv.add_stock("c", 4, D("1"))
        self.assertEqual(inv.low_stock(3), ["a", "b"])

    def test_signature_kept(self):
        inv = Inventory()
        inv.add_stock("a", 1, D("1"), tags=["t"])
        inv.add_stock(sku="b", qty=1, price=D("1"))
        self.assertEqual(inv.tags("a"), ["t"])
