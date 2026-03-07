import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# Fix supplier invoices marked as issuing
res = supabase.table('invoices').update({"type": "receiving"}).ilike("invoice_number", "INV-SUP%").execute()
print(f"Fixed supplier invoices: {len(res.data)} records")

# Also check for other supplier-type clients
res = supabase.table('invoices').select('*, clients!inner(*)').eq('clients.type', 'supplier').execute()
for inv in res.data:
    if inv['type'] != 'receiving':
        print(f"Updating {inv['invoice_number']} to receiving")
        supabase.table('invoices').update({'type': 'receiving'}).eq('id', inv['id']).execute()
