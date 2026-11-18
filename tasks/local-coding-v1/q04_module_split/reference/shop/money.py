from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

_SYMBOLS = {"EUR": "€", "USD": "$", "GBP": "£"}


def format_money(amount, currency="EUR"):
    """Format a Decimal amount, for example Decimal("1234.5") -> "€1,234.50".

    Negative amounts put the minus sign before the symbol: "-€3.00".
    Raises ValueError for an unknown currency."""
    if currency not in _SYMBOLS:
        raise ValueError(f"unknown currency: {currency}")
    cents = Decimal(amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    sign = "-" if cents < 0 else ""
    return f"{sign}{_SYMBOLS[currency]}{abs(cents):,.2f}"


def parse_price(text):
    """Parse text such as "€1,234.50", "$3" or "-£0.99" into a Decimal.

    Raises ValueError if the text is not a price."""
    cleaned = text.strip().replace(",", "")
    sign = Decimal(1)
    if cleaned.startswith("-"):
        sign = Decimal(-1)
        cleaned = cleaned[1:]
    if cleaned[:1] in _SYMBOLS.values():
        cleaned = cleaned[1:]
    try:
        return sign * Decimal(cleaned)
    except InvalidOperation:
        raise ValueError(f"not a price: {text!r}") from None
