import stripe

stripe.api_key = ''

def charge(amount: int, token: str):
    return stripe.Charge.create(amount=amount, currency='usd', source=token)
