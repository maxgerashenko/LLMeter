from shop import utils


def sales_report(carts):
    """Total per currency over several carts, as sorted text lines."""
    totals = {}
    for cart in carts:
        totals[cart.currency] = totals.get(cart.currency, 0) + cart.total()
    return [
        f"{currency}: {utils.format_price(amount, currency)}"
        for currency, amount in sorted(totals.items())
    ]
