"""
Supabase client — shared instance for all backend services.
Configured with extended timeouts and retry logic for transient network failures.
"""

import os
import time
import functools
from supabase import create_client, Client, ClientOptions
from httpx import ConnectTimeout, ConnectError
from app.config import ROOT_DIR
from dotenv import load_dotenv

load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — DB calls will fail.")

# Extended timeouts: default is 5s which causes ConnectTimeout on slow networks
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    options=ClientOptions(
        postgrest_client_timeout=30,
        storage_client_timeout=30,
    ),
)


def with_retry(max_retries: int = 3, base_delay: float = 1.0):
    """
    Decorator that retries a function on transient network errors
    (ConnectTimeout, ConnectError) with exponential backoff.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (ConnectTimeout, ConnectError) as e:
                    last_exc = e
                    delay = base_delay * (2 ** attempt)
                    print(f"⚠️  Supabase connection failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {delay}s...")
                    time.sleep(delay)
            raise last_exc

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            import asyncio
            last_exc = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except (ConnectTimeout, ConnectError) as e:
                    last_exc = e
                    delay = base_delay * (2 ** attempt)
                    print(f"⚠️  Supabase connection failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
            raise last_exc

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return wrapper
    return decorator
