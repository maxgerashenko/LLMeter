import re
import warnings

from shop import money


def format_price(amount, currency="EUR"):
    """Deprecated: use shop.money.format_money."""
    warnings.warn(
        "shop.utils.format_price is deprecated; use shop.money.format_money",
        DeprecationWarning,
        stacklevel=2,
    )
    return money.format_money(amount, currency)


def parse_price(text):
    """Deprecated: use shop.money.parse_price."""
    warnings.warn(
        "shop.utils.parse_price is deprecated; use shop.money.parse_price",
        DeprecationWarning,
        stacklevel=2,
    )
    return money.parse_price(text)


def slugify(name):
    """Lower-case `name` and join its letter/digit runs with hyphens."""
    return "-".join(re.findall(r"[a-z0-9]+", name.lower()))
