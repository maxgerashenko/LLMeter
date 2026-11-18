import unittest

from expr import ExprError, evaluate

VALUES = [
    ("1+2*3", 7),
    ("(1+2)*3", 9),
    ("10-4-3", 3),
    ("2**3**2", 512),
    ("-2**2", -4),
    ("(-2)**2", 4),
    ("2**-1", 0.5),
    ("--2", 2),
    ("-+-3", 3),
    ("2*-3", -6),
    ("2--3", 5),
    ("7/2", 3.5),
    ("7//2", 3),
    ("-7//2", -4),
    ("-7%3", 2),
    ("7%-3", -2),
    ("100/10/5", 2.0),
    ("2**-2**2", 0.0625),
    ("-2**-2", -0.25),
    (" 1 +\t2 ", 3),
    ("1.5e-3*2", 0.003),
    (".5+2.", 2.5),
    ("min(3, 1+1, 5)", 2),
    ("max(1, 2)*abs(-3)", 6),
    ("sqrt(16)+min(7)", 11.0),
    ("max(min(1,2), -abs(-5), sqrt(4))", 2.0),
    ("2*(3+(4-1))**2", 72),
    ("-(1+2)", -3),
    ("1e3", 1000.0),
    ("abs(-2**2)", 4),
]

TYPES = [
    ("4/2", float),
    ("4//2", int),
    ("2**2", int),
    ("1e3", float),
    ("2.", float),
    ("3*1.0", float),
    ("abs(-3)", int),
    ("sqrt(4)", float),
    ("2**-1", float),
    ("7%3", int),
]

ERRORS = [
    ("", 0),
    ("   ", 3),
    ("1 +", 3),
    ("1 + ", 4),
    ("1 2", 2),
    ("(1+2", 4),
    ("1+2)", 3),
    ("2 $ 3", 2),
    ("1/0", 1),
    ("5 // (2-2)", 2),
    ("5%0", 1),
    ("4 / 0.0", 2),
    ("x+1", 0),
    ("1+yy", 2),
    ("foo(1)", 0),
    ("2*sqrt(-4)", 2),
    ("abs(1,2)", 0),
    ("1+min()", 2),
    ("sqrt()", 0),
    ("min+1", 0),
    ("1/0 + )", 1),
    ("0**-1", 1),
    ("2 * * 3", 4),
    ("max(1,)", 6),
    ("(", 1),
    ("()", 1),
    ("3 ** ", 5),
    ("1..2", 2),
    ("10.0**400", 4),
    ("2 +* 3", 3),
]


class ValueTests(unittest.TestCase):
    pass


class TypeTests(unittest.TestCase):
    pass


class ErrorTests(unittest.TestCase):
    pass


def _value_case(text, expected):
    def test(self):
        self.assertAlmostEqual(evaluate(text), expected, places=12)
    return test


def _type_case(text, expected):
    def test(self):
        self.assertIs(type(evaluate(text)), expected)
    return test


def _error_case(text, pos):
    def test(self):
        with self.assertRaises(ExprError) as ctx:
            evaluate(text)
        self.assertEqual(ctx.exception.pos, pos)
        self.assertTrue(ctx.exception.message)
    return test


for _i, (_text, _expected) in enumerate(VALUES):
    setattr(ValueTests, f"test_value_{_i:02d}", _value_case(_text, _expected))
for _i, (_text, _expected) in enumerate(TYPES):
    setattr(TypeTests, f"test_type_{_i:02d}", _type_case(_text, _expected))
for _i, (_text, _pos) in enumerate(ERRORS):
    setattr(ErrorTests, f"test_error_{_i:02d}", _error_case(_text, _pos))


class VariableTests(unittest.TestCase):
    def test_variables(self):
        self.assertEqual(evaluate("a*b + c_1", {"a": 2, "b": 3, "c_1": 4}), 10)

    def test_variable_types_kept(self):
        self.assertIs(type(evaluate("x", {"x": 2.0})), float)
        self.assertIs(type(evaluate("x+1", {"x": 2})), int)

    def test_unknown_variable_position(self):
        with self.assertRaises(ExprError) as ctx:
            evaluate("a + bb * 2", {"a": 1})
        self.assertEqual(ctx.exception.pos, 4)

    def test_function_name_is_not_a_variable(self):
        with self.assertRaises(ExprError) as ctx:
            evaluate("1 + max", {"max": 3})
        self.assertEqual(ctx.exception.pos, 4)

    def test_variable_may_shadow_nothing_else(self):
        self.assertEqual(evaluate("e1 + _x", {"e1": 1, "_x": 2}), 3)

    def test_not_using_eval(self):
        with self.assertRaises(ExprError):
            evaluate("__import__('os')")
        with self.assertRaises(ExprError):
            evaluate("[1][0]")
