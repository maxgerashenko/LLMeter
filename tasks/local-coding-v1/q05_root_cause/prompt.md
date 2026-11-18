The test below fails against `pricing.py`: the same order gives a different total the second time it is priced.

```python
from decimal import Decimal
from pricing import Order

def test_total_is_stable():
    order = Order("eu")
    order.add("bolt", Decimal("2.00"), 20)
    first = order.total()
    assert first == Decimal("45.22")
    assert order.total() == first
```

Find the root cause and fix it there. Do not hide the symptom (for example by caching totals or by rebuilding data on every call): the hidden tests call the helper functions directly as well as `Order.total`. Keep all names and signatures.
