The `shop` package keeps its money helpers in `shop/utils.py`. Move them into a new module and keep the old names working for existing users.

Required result:

1. Create `shop/money.py`. It defines `format_money(amount, currency="EUR")` (the function now called `format_price`, renamed, same behaviour) and `parse_price(text)` (moved, same behaviour).
2. `shop/utils.py` keeps `slugify` unchanged. It also keeps `format_price` and `parse_price` as deprecated wrappers that return the same results as before and, on every call, emit a `DeprecationWarning`:
   - the message names the replacement in full: `shop.money.format_money` or `shop.money.parse_price`;
   - the warning is attributed to the line that called the wrapper (the caller's file), not to `shop/utils.py`.
   Importing `shop.utils` or its names must not emit any warning; only calling the deprecated wrappers does.
3. `shop/cart.py` and `shop/report.py` use the new module and never trigger a deprecation warning.
4. `shop/__init__.py` exports `format_money`, `parse_price`, `slugify`, `Cart` and `sales_report` (and lists them in `__all__`). `format_price` is no longer exported from `shop`.
5. `shop/money.py` must not import from `shop.utils` (no circular import).

Reply with every file of the package that you created or changed.
