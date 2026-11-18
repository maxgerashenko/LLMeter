from decimal import ROUND_HALF_UP, Decimal
from functools import lru_cache

CENT = Decimal("0.01")

_TIERS = {
    # region: (minimum quantity, discount percent), lowest tier first
    "eu": [(1, 0), (10, 5), (50, 10), (200, 15)],
    "us": [(1, 0), (25, 4), (100, 8)],
}

_TAX = {"eu": Decimal("0.19"), "us": Decimal("0.07")}


@lru_cache(maxsize=None)
def tier_table(region):
    """Discount tiers for a region, lowest tier first.

    Raises KeyError for an unknown region."""
    return list(_TIERS[region])


def best_discount(tiers, qty):
    """Percent discount of the highest tier whose minimum quantity is
    reached. `tiers` is ordered lowest tier first. Returns 0 if none is."""
    tiers.reverse()
    for min_qty, percent in tiers:
        if qty >= min_qty:
            return percent
    return 0


def line_price(unit_price, qty, region):
    """Price of one order line after the quantity discount, before tax,
    rounded half up to cents."""
    percent = best_discount(tier_table(region), qty)
    gross = unit_price * qty
    net = gross * (Decimal(100) - percent) / Decimal(100)
    return net.quantize(CENT, rounding=ROUND_HALF_UP)


class Order:
    """A list of lines priced for one region."""

    def __init__(self, region):
        if region not in _TIERS:
            raise KeyError(region)
        self.region = region
        self._lines = []

    def add(self, name, unit_price, qty):
        if qty < 1:
            raise ValueError("qty must be at least 1")
        self._lines.append((name, unit_price, qty))

    def subtotal(self):
        """Sum of the discounted line prices, before tax."""
        total = Decimal("0.00")
        for _name, unit_price, qty in self._lines:
            total += line_price(unit_price, qty, self.region)
        return total

    def total(self):
        """Subtotal plus tax, rounded half up to cents."""
        gross = self.subtotal() * (Decimal(1) + _TAX[self.region])
        return gross.quantize(CENT, rounding=ROUND_HALF_UP)
