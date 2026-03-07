import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path="backend/.env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.table('staff').select('*').execute()
for s in res.data:
    print(f"--- {s.get('name')} ---")
    keys = sorted(s.keys())
    for k in keys:
        if k in ['salary', 'epf', 'socso', 'eis', 'epf_rate', 'socso_rate', 'eis_rate', 'tax']:
            print(f"  {k}: {s.get(k)}")
