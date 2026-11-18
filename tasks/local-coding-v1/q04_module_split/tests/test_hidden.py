import importlib
import os
import subprocess
import sys
import unittest
import warnings
from decimal import Decimal

D = Decimal


def run_python(code):
    """Run code in a fresh interpreter with all warnings turned into errors."""
    return subprocess.run(
        [sys.executable, "-W", "error", "-c", code],
        capture_output=True, text=True, timeout=30, cwd=os.getcwd(),
    )


class NewModule(unittest.TestCase):
    def test_format_money(self):
        from shop.money import format_money
        self.assertEqual(format_money(D("1234.5")), "€1,234.50")
        self.assertEqual(format_money(D("-3"), "USD"), "-$3.00")
        self.assertEqual(format_money(D("0.005"), "GBP"), "£0.01")
        with self.assertRaises(ValueError):
            format_money(D("1"), "XXX")

    def test_parse_price_moved(self):
        from shop.money import parse_price
        self.assertEqual(parse_price(" €1,234.50 "), D("1234.50"))
        self.assertEqual(parse_price("-£0.99"), D("-0.99"))
        with self.assertRaises(ValueError):
            parse_price("abc")

    def test_money_has_no_old_name(self):
        import shop.money
        self.assertFalse(hasattr(shop.money, "format_price"))

    def test_money_does_not_import_utils(self):
        result = run_python(
            "import ast, importlib.util\n"
            "spec = importlib.util.find_spec('shop.money')\n"
            "tree = ast.parse(open(spec.origin, encoding='utf-8').read())\n"
            "names = []\n"
            "for node in ast.walk(tree):\n"
            "    if isinstance(node, ast.Import):\n"
            "        names += [a.name for a in node.names]\n"
            "    elif isinstance(node, ast.ImportFrom):\n"
            "        names += [node.module or ''] + [a.name for a in node.names]\n"
            "assert not any('utils' in n for n in names), names\n"
        )
        self.assertEqual(result.returncode, 0, result.stderr)


class DeprecatedWrappers(unittest.TestCase):
    def call_and_catch(self, func, *args):
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            value = func(*args)
        return value, caught

    def test_format_price_warns_and_works(self):
        from shop import utils
        value, caught = self.call_and_catch(utils.format_price, D("2"), "USD")
        self.assertEqual(value, "$2.00")
        self.assertEqual(len(caught), 1)
        self.assertTrue(issubclass(caught[0].category, DeprecationWarning))
        self.assertIn("shop.money.format_money", str(caught[0].message))

    def test_parse_price_warns_and_works(self):
        from shop import utils
        value, caught = self.call_and_catch(utils.parse_price, "$3")
        self.assertEqual(value, D("3"))
        self.assertEqual(len(caught), 1)
        self.assertTrue(issubclass(caught[0].category, DeprecationWarning))
        self.assertIn("shop.money.parse_price", str(caught[0].message))

    def test_warning_points_at_caller(self):
        from shop import utils
        _, caught = self.call_and_catch(utils.format_price, D("2"))
        _, caught2 = self.call_and_catch(utils.parse_price, "2")
        here = os.path.abspath(__file__)
        self.assertEqual(os.path.abspath(caught[0].filename), here)
        self.assertEqual(os.path.abspath(caught2[0].filename), here)

    def test_warns_on_every_call(self):
        from shop import utils
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            for _ in range(3):
                utils.format_price(D("1"))
        self.assertEqual(len(caught), 3)

    def test_default_currency_kept(self):
        from shop import utils
        value, _ = self.call_and_catch(utils.format_price, D("5"))
        self.assertEqual(value, "€5.00")

    def test_slugify_unchanged_and_silent(self):
        from shop import utils
        value, caught = self.call_and_catch(utils.slugify, "Big  Red_Box 2")
        self.assertEqual(value, "big-red-box-2")
        self.assertEqual(caught, [])


class PackageSurface(unittest.TestCase):
    def test_imports_emit_no_warning(self):
        result = run_python(
            "import shop, shop.utils, shop.money, shop.cart, shop.report\n"
            "from shop.utils import format_price, parse_price, slugify\n"
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_package_exports(self):
        import shop
        self.assertEqual(
            sorted(shop.__all__),
            ["Cart", "format_money", "parse_price", "sales_report", "slugify"],
        )
        for name in shop.__all__:
            self.assertTrue(hasattr(shop, name), name)
        self.assertFalse(hasattr(shop, "format_price"))
        self.assertIs(shop.format_money, importlib.import_module("shop.money").format_money)

    def test_cart_and_report_work_without_warnings(self):
        result = run_python(
            "from shop import Cart, sales_report\n"
            "a = Cart(); a.add('Red Box', '€2.50', 2); a.add('red box', '€2.50')\n"
            "b = Cart('USD'); b.add('Pipe', '$1,000')\n"
            "assert a.summary() == 'red-box x3: €7.50\\ntotal: €7.50', a.summary()\n"
            "assert sales_report([a, b, a]) == ['EUR: €15.00', 'USD: $1,000.00']\n"
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_internal_modules_do_not_use_old_name(self):
        import shop.cart
        import shop.report
        for module in (shop.cart, shop.report):
            with open(module.__file__, encoding="utf-8") as handle:
                self.assertNotIn("format_price", handle.read(), module.__name__)
