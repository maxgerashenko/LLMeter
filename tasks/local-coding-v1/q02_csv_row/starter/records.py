from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

_TRUE = {"true", "yes", "1"}
_FALSE = {"false", "no", "0"}


class RecordError(ValueError):
    """Raised when a record field is invalid."""

    def __init__(self, field, message):
        super().__init__(f"{field}: {message}")
        self.field = field
        self.message = message


@dataclass(frozen=True)
class Record:
    name: str
    qty: int
    price: Decimal
    active: bool

    @classmethod
    def from_dict(cls, data):
        """Build a Record from a dict of strings.

        name: not empty after stripping.
        qty: whole number, zero or more.
        price: decimal number, zero or more, at most two decimal places.
        active: one of true/yes/1 or false/no/0, in any letter case.
        """
        name = str(data.get("name", "")).strip()
        if not name:
            raise RecordError("name", "must not be empty")

        raw_qty = str(data.get("qty", "")).strip()
        try:
            qty = int(raw_qty)
        except ValueError:
            raise RecordError("qty", f"not a whole number: {raw_qty!r}") from None
        if qty < 0:
            raise RecordError("qty", "must be zero or more")

        raw_price = str(data.get("price", "")).strip()
        try:
            price = Decimal(raw_price)
        except InvalidOperation:
            raise RecordError("price", f"not a number: {raw_price!r}") from None
        if not price.is_finite() or price < 0:
            raise RecordError("price", "must be zero or more")
        if price.as_tuple().exponent < -2:
            raise RecordError("price", "at most two decimal places")

        raw_active = str(data.get("active", "")).strip().lower()
        if raw_active in _TRUE:
            active = True
        elif raw_active in _FALSE:
            active = False
        else:
            raise RecordError("active", f"not a yes/no value: {raw_active!r}")

        return cls(name=name, qty=qty, price=price, active=active)
