import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# 1. Get a company and a customer client
comp_res = supabase.table('user_companies').select('id').limit(1).execute()
company_id = comp_res.data[0]['id']

client_res = supabase.table('clients').select('id').eq('company_id', company_id).eq('type', 'customer').limit(1).execute()
if not client_res.data:
    # Create a mock customer if none
    client_res = supabase.table('clients').insert({
        "company_id": company_id,
        "name": "Global Tech Corp",
        "type": "customer",
        "phone_number": "+60123456789"
    }).execute()

client_id = client_res.data[0]['id']

# 2. Seed issuing invoices for the last 6 months
for i in range(6):
    date = (datetime.now() - timedelta(days=30*i)).strftime("%Y-%m-%d")
    month = date[:7]
    inv_num = f"M-INV-2026-{i:03d}"
    amount = 50000 + (1000 * i) # Increasing revenue
    
    payload = {
        "client_id": client_id,
        "invoice_number": inv_num,
        "date": date,
        "month": month,
        "status": "paid",
        "total_amount": str(amount),
        "currency": "MYR",
        "type": "issuing",
        "exchange_rate": "1.0"
    }
    
    res = supabase.table('invoices').insert(payload).execute()
    print(f"Inserted invoice {inv_num}: RM {amount}")

print("Revenue seeding complete.")
