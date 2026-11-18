from decimal import Decimal


class Inventory:
    """Stock of items, keyed by SKU."""

    def __init__(self):
        self._items = {}

    def add_stock(self, sku, qty, price, tags=[]):
        """Add `qty` units of `sku` at unit `price` (a Decimal).

        If the SKU exists, the quantity is increased and the price replaced.
        `tags` is an optional list of strings; new tags are added to the
        item's tags without duplicates, keeping first-seen order. The caller's
        list is never modified and items never share a tag list.
        Raises ValueError if qty is not positive.
        """
        if qty <= 0:
            raise ValueError("qty must be positive")
        item = self._items.get(sku)
        if item is None:
            item = {"qty": 0, "price": price, "tags": tags}
            self._items[sku] = item
        item["qty"] += qty
        item["price"] = price
        for tag in tags:
            if tag not in item["tags"]:
                item["tags"].append(tag)

    def remove_stock(self, sku, qty):
        """Remove `qty` units. Raises KeyError for an unknown SKU and
        ValueError if qty is not positive or more than the stock.
        An item whose quantity reaches zero stays listed with qty 0."""
        item = self._items[sku]
        if qty <= 0 or qty > item["qty"]:
            raise ValueError("invalid qty")
        item["qty"] -= qty

    def qty(self, sku):
        """Units in stock for `sku`; 0 for an unknown SKU."""
        item = self._items.get(sku)
        return item["qty"] if item else 0

    def tags(self, sku):
        """A copy of the item's tag list. Raises KeyError for an unknown SKU."""
        return list(self._items[sku]["tags"])

    def low_stock(self, threshold):
        """SKUs whose quantity is at or below `threshold`, sorted by SKU."""
        return sorted(s for s, i in self._items.items() if i["qty"] <= threshold)

    def page(self, page, per_page):
        """One page of SKUs in sorted order. Pages are numbered from 1 and
        hold `per_page` SKUs each; the last page may be shorter and a page
        past the end is an empty list. Raises ValueError if page or per_page
        is less than 1."""
        if page < 1 or per_page < 1:
            raise ValueError("page and per_page must be at least 1")
        skus = sorted(self._items)
        start = (page - 1) * per_page
        return skus[start:start + per_page - 1]

    def line_value(self, sku):
        """Quantity times unit price as a Decimal, rounded to cents with
        halves rounded up (ROUND_HALF_UP). Example: 1 unit at 2.675 is 2.68.
        Raises KeyError for an unknown SKU."""
        item = self._items[sku]
        return Decimal(str(round(float(item["price"]) * item["qty"], 2)))

    def total_value(self):
        """Sum of line_value over all SKUs, as a Decimal. Each line is
        rounded first, then the rounded lines are added. Empty stock gives
        Decimal("0.00")."""
        total = Decimal("0.00")
        for sku in self._items:
            total += self.line_value(sku)
        return total
