import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path

# Load env variables
_ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    response = supabase.table('staff').select("*").limit(1).execute()
    if response.data:
        print("Staff columns:", list(response.data[0].keys()))
        print("Sample raw staff data:", response.data[0])
    else:
        print("Staff table exists but is empty.")
except Exception as e:
    print(f"Error checking 'staff' table: {e}. It might not exist or schema is different.")
