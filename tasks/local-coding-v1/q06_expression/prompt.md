Write `expr.py` with a function `evaluate(expression, variables=None)` that evaluates an arithmetic expression given as a string, and an exception class `ExprError`. Do not use `eval`, `exec`, `compile` or the `ast` module.

**Values.** Numbers are Python `int` or `float`. A number literal is an int if it is only digits (`12`). It is a float if it has a decimal point or an exponent: `1.5`, `.5`, `2.`, `1e3`, `1.5e-3`. `variables` maps names to numbers. Names are letters, digits and underscores, not starting with a digit. Spaces and tabs between tokens are ignored.

**Operators**, from lowest to highest precedence:

1. `+` `-` (binary, left-associative)
2. `*` `/` `//` `%` (left-associative)
3. unary `+` and `-` (may be repeated: `--2` is `2`)
4. `**` (right-associative: `2**3**2` is `512`)

`**` binds tighter than a unary operator on its left, so `-2**2` is `-4`. The right operand of `**` may itself start with a unary operator: `2**-1` is `0.5`. Parentheses group as usual. All operators give the same value and type as the same Python operator on the same operands (`7/2` is `3.5`, `7//2` is `3`, `-7%3` is `2`, `4/2` is `2.0`).

**Functions.** `min(a, b, ...)` and `max(a, b, ...)` take one or more arguments. `abs(x)` and `sqrt(x)` take exactly one. `sqrt` returns a float. Arguments are full expressions. A function name is only a function when followed by `(`; function names cannot be used as variables.

**Errors.** Every failure raises `ExprError`. It has two attributes: `message` (any non-empty string) and `pos`, the 0-based index in the original string where the problem is:

| Problem | `pos` |
| --- | --- |
| Character that cannot start a token | index of that character |
| Unexpected token (for example the `2` in `1 2`, or a `)` with no matching `(`) | index where that token starts |
| Expression ends too early (also: empty or blank expression, missing `)`) | `len(expression)` |
| Unknown variable, or unknown function | index where the name starts |
| Wrong number of function arguments | index where the function name starts |
| `sqrt` of a negative number | index where the function name starts |
| Division or modulo by zero (`/`, `//`, `%`) | index of the operator |
| Any other arithmetic failure in `**` (for example `0**-1`, or a result too large for a float) | index of the `**` operator |

When an expression has several problems, report the one a left-to-right evaluation meets first; syntax is checked as the expression is read, so `1/0 + )` reports the division.
