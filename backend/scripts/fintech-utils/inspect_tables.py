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

def list_table(table_name):
    print(f"\n--- {table_name.upper()} ---")
    try:
        response = supabase.table(table_name).select("*").execute()
        if response.data:
            print(json.dumps(response.data, indent=2))
        else:
            print(f"No data found in table: {table_name}")
    except Exception as e:
        print(f"Error reading {table_name}: {e}")

list_table('invoices')
list_table('staff')
