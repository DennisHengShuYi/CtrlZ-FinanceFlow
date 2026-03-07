import os, json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path="backend/.env")
s = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

print("--- USER COMPANIES ---")
try:
    res = s.table('user_companies').select('*').execute()
    print(json.dumps(res.data, indent=2))
except Exception as e:
    print(f"Error: {e}")

print("\n--- CLIENTS (Earliest 5) ---")
try:
    res = s.table('clients').select('*').order('created_at').limit(5).execute()
    print(json.dumps(res.data, indent=2))
except Exception as e:
    print(f"Error: {e}")
