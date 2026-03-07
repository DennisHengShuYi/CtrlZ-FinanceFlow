import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path="backend/.env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

res = supabase.table('clients').select('*').execute()
for client in res.data:
    print(f"ID: {client['id']}, Name: {client['name']}, Type: {client['type']}, Created: {client['created_at']}")
