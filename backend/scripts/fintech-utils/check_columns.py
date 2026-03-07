import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

res = supabase.table('staff').select('*').limit(1).execute()
if res.data:
    print(f"Columns in 'staff': {res.data[0].keys()}")
else:
    print("No data in 'staff'")
