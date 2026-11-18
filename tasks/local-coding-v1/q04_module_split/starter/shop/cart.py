from decimal import Decimal

from shop.utils import format_price, parse_price, slugify


class Cart:
    def __init__(self, currency="EUR"):
        self.currency = currency
        self._lines = {}

    def add(self, name, price_text, qty=1):
        """Add `qty` of an item whose price is given as text."""
        key = slugify(name)
        price = parse_price(price_text)
        old_qty = self._lines.get(key, (price, 0))[1]
        self._lines[key] = (price, old_qty + qty)

    def total(self):
        return sum((p * q for p, q in self._lines.values()), Decimal("0"))

    def summary(self):
        """One line per item, sorted by key, then a total line."""
        rows = [
            f"{key} x{qty}: {format_price(price * qty, self.currency)}"
            for key, (price, qty) in sorted(self._lines.items())
        ]
        rows.append(f"total: {format_price(self.total(), self.currency)}")
        return "\n".join(rows)
