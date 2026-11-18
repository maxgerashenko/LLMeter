import unittest
from decimal import Decimal

from records import Record, RecordError


class FromCsvRowTest(unittest.TestCase):
    def assertFieldError(self, row, field):
        with self.assertRaises(RecordError) as ctx:
            Record.from_csv_row(row)
        self.assertEqual(ctx.exception.field, field)

    def test_plain_row(self):
        self.assertEqual(
            Record.from_csv_row("Widget,3,9.50,yes"),
            Record("Widget", 3, Decimal("9.50"), True),
        )

    def test_whitespace_and_line_ending(self):
        self.assertEqual(
            Record.from_csv_row("  Widget , 3 , 9.5 , No \r\n"),
            Record("Widget", 3, Decimal("9.5"), False),
        )

    def test_quoted_comma(self):
        rec = Record.from_csv_row('"Bolt, large",10,0.25,1')
        self.assertEqual(rec.name, "Bolt, large")
        self.assertEqual(rec.qty, 10)

    def test_escaped_quote(self):
        rec = Record.from_csv_row('"12"" pipe",1,3,TRUE')
        self.assertEqual(rec.name, '12" pipe')
        self.assertIs(rec.active, True)

    def test_price_is_decimal(self):
        rec = Record.from_csv_row("a,1,0.10,0")
        self.assertIsInstance(rec.price, Decimal)
        self.assertEqual(str(rec.price), "0.10")

    def test_too_few_fields(self):
        self.assertFieldError("Widget,3,9.50", "row")

    def test_too_many_fields(self):
        self.assertFieldError("Widget,3,9.50,yes,extra", "row")

    def test_empty_row(self):
        self.assertFieldError("", "row")

    def test_empty_name(self):
        self.assertFieldError("   ,3,9.50,yes", "name")

    def test_bad_qty(self):
        self.assertFieldError("Widget,3.5,9.50,yes", "qty")

    def test_negative_qty(self):
        self.assertFieldError("Widget,-1,9.50,yes", "qty")

    def test_price_three_decimals(self):
        self.assertFieldError("Widget,3,9.505,yes", "price")

    def test_bad_active(self):
        self.assertFieldError("Widget,3,9.50,maybe", "active")

    def test_first_failure_reported(self):
        self.assertFieldError("Widget,x,-2,maybe", "qty")

    def test_from_dict_still_works(self):
        rec = Record.from_dict({"name": " A ", "qty": "2", "price": "1.5", "active": "YES"})
        self.assertEqual(rec, Record("A", 2, Decimal("1.5"), True))
        with self.assertRaises(RecordError) as ctx:
            Record.from_dict({"name": "A", "qty": "2", "price": "nan", "active": "yes"})
        self.assertEqual(ctx.exception.field, "price")
