import os
from decimal import Decimal
import httpx
from dotenv import load_dotenv
from app.config import ROOT_DIR
import time

load_dotenv(ROOT_DIR / ".env")

CURRENCYLAYER_API_KEY = os.getenv("CURRENCYLAYER_API_KEY", "")
CURRENCYLAYER_BASE_URL = os.getenv("CURRENCYLAYER_BASE_URL", "http://api.currencylayer.com")

_FALLBACK_RATES = {
    "USD": 1.0,
    "EUR": 0.92,
    "AED": 3.67,
    "SGD": 1.34,
    "MYR": 4.75,
    "IDR": 15500.0,
    "PHP": 56.0,
    "THB": 35.0,
    "VND": 25000.0,
    "BND": 1.34,
    "KHR": 4100.0,
    "LAK": 20500.0,
    "MMK": 2100.0,
}

# Simple cache for CurrencyLayer API
_cache = {
    "timestamp": 0,
    "quotes": {}
}
CACHE_TTL = 3600  # 1 hour

async def _fetch_live_quotes() -> dict:
    """Fetch live quotes from CurrencyLayer, with caching."""
    global _cache
    now = time.time()
    
    # Return cache if valid
    if now - _cache["timestamp"] < CACHE_TTL and _cache["quotes"]:
        return _cache["quotes"]
        
    if not CURRENCYLAYER_API_KEY:
        return {}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{CURRENCYLAYER_BASE_URL}/live?access_key={CURRENCYLAYER_API_KEY}",
                timeout=5.0
            )
            data = resp.json()
            if data.get("success") and "quotes" in data:
                _cache["quotes"] = data["quotes"]
                _cache["timestamp"] = now
                return data["quotes"]
    except Exception as e:
        print(f"CurrencyLayer API Error: {e}")
        
    return _cache["quotes"]

async def fetch_exchange_rate(from_currency: str, base_currency: str) -> Decimal:
    """
    Fetch exchange rate to convert `from_currency` to `base_currency`.
    Utilizes CurrencyLayer API.
    """
    from_currency = from_currency.upper()
    base_currency = base_currency.upper()

    if from_currency == base_currency:
        return Decimal("1.0")

    quotes = await _fetch_live_quotes()
    
    # CurrencyLayer returns pairs like USDMYR, USDEUR.
    # Because free tier source is always USD.
    
    # Get USD -> from_currency rate
    from_usd_rate = quotes.get(f"USD{from_currency}")
    if not from_usd_rate:
        from_usd_rate = _FALLBACK_RATES.get(from_currency, 1.0)
        
    # Get USD -> base_currency rate
    base_usd_rate = quotes.get(f"USD{base_currency}")
    if not base_usd_rate:
        base_usd_rate = _FALLBACK_RATES.get(base_currency, 1.0)
        
    # Calculate cross rate
    try:
        rate_to_usd = 1.0 / float(from_usd_rate)
        final_rate = rate_to_usd * float(base_usd_rate)
        return Decimal(str(round(final_rate, 6)))
    except ZeroDivisionError:
        return Decimal("1.0")

def convert_to_base(amount: Decimal, from_currency: str, base_currency: str, exchange_rate: Decimal) -> Decimal:
    """
    Convert amount in from_currency to base_currency using the recorded exchange_rate.
    """
    return amount * exchange_rate
