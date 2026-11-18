import math
import re


class ExprError(Exception):
    def __init__(self, message, pos):
        super().__init__(f"{message} (at {pos})")
        self.message = message
        self.pos = pos


_TOKEN = re.compile(
    r"(?P<num>(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?)"
    r"|(?P<name>[A-Za-z_]\w*)"
    r"|(?P<op>\*\*|//|[-+*/%(),])"
)
_ARITY = {"min": None, "max": None, "abs": 1, "sqrt": 1}


def _tokenize(text):
    tokens = []
    i = 0
    while i < len(text):
        if text[i] in " \t":
            i += 1
            continue
        match = _TOKEN.match(text, i)
        if not match:
            raise ExprError("unexpected character", i)
        tokens.append((match.lastgroup, match.group(), i))
        i = match.end()
    tokens.append(("end", "", len(text)))
    return tokens


class _Parser:
    def __init__(self, text, variables):
        self.tokens = _tokenize(text)
        self.i = 0
        self.variables = variables or {}

    @property
    def tok(self):
        return self.tokens[self.i]

    def take(self, value=None):
        kind, text, pos = self.tok
        if value is not None and text != value:
            return None
        if kind == "end":
            return None
        self.i += 1
        return (kind, text, pos)

    def fail_here(self):
        kind, _text, pos = self.tok
        raise ExprError("unexpected end" if kind == "end" else "unexpected token", pos)

    def parse(self):
        value = self.additive()
        if self.tok[0] != "end":
            self.fail_here()
        return value

    def additive(self):
        left = self.term()
        while self.tok[1] in ("+", "-") and self.tok[0] == "op":
            _k, op, _pos = self.take()
            right = self.term()
            left = left + right if op == "+" else left - right
        return left

    def term(self):
        left = self.unary()
        while self.tok[0] == "op" and self.tok[1] in ("*", "/", "//", "%"):
            _k, op, pos = self.take()
            right = self.unary()
            try:
                if op == "*":
                    left = left * right
                elif op == "/":
                    left = left / right
                elif op == "//":
                    left = left // right
                else:
                    left = left % right
            except ZeroDivisionError:
                raise ExprError("division by zero", pos) from None
        return left

    def unary(self):
        if self.tok[0] == "op" and self.tok[1] in ("+", "-"):
            _k, op, _pos = self.take()
            value = self.unary()
            return -value if op == "-" else +value
        return self.power()

    def power(self):
        base = self.atom()
        if self.tok[0] == "op" and self.tok[1] == "**":
            _k, _op, pos = self.take()
            exponent = self.unary()
            try:
                result = base ** exponent
            except (ZeroDivisionError, OverflowError):
                raise ExprError("arithmetic error", pos) from None
            if isinstance(result, complex):
                raise ExprError("arithmetic error", pos)
            return result
        return base

    def atom(self):
        kind, text, pos = self.tok
        if kind == "num":
            self.i += 1
            if text.isdigit():
                return int(text)
            return float(text)
        if kind == "name":
            self.i += 1
            if self.tok[0] == "op" and self.tok[1] == "(":
                return self.call(text, pos)
            if text in _ARITY or text not in self.variables:
                raise ExprError("unknown name", pos)
            return self.variables[text]
        if kind == "op" and text == "(":
            self.i += 1
            value = self.additive()
            if not self.take(")"):
                self.fail_here()
            return value
        self.fail_here()

    def call(self, name, pos):
        if name not in _ARITY:
            raise ExprError("unknown function", pos)
        self.take("(")
        args = []
        if not (self.tok[0] == "op" and self.tok[1] == ")"):
            args.append(self.additive())
            while self.take(","):
                args.append(self.additive())
        if not self.take(")"):
            self.fail_here()
        arity = _ARITY[name]
        if (arity is None and not args) or (arity is not None and len(args) != arity):
            raise ExprError("wrong number of arguments", pos)
        if name == "min":
            return min(args)
        if name == "max":
            return max(args)
        if name == "abs":
            return abs(args[0])
        if args[0] < 0:
            raise ExprError("sqrt of a negative number", pos)
        return math.sqrt(args[0])


def evaluate(expression, variables=None):
    return _Parser(expression, variables).parse()
