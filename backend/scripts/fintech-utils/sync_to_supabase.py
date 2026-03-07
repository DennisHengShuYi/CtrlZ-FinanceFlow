import os
import uuid
import sqlite3
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(url, key)

DATABASE = "fintech.db"

def sync_all():
    comp_id = 'f228c56c-14af-45e7-b877-9dc73b415116'
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # 1. Sync Clients
    cursor.execute("SELECT name, type, id FROM clients")
    sqlite_clients = cursor.fetchall()
    
    # Map for client id sync
    id_map = {}
    
    for name, ctype, old_id in sqlite_clients:
        try:
            # Check if exists
            res = supabase.table('clients').select('id').eq('name', name).execute()
            if res.data:
                id_map[old_id] = res.data[0]['id']
            else:
                res = supabase.table('clients').insert({"name": name, "type": ctype}).execute()
                id_map[old_id] = res.data[0]['id']
        except: pass
        
    # 2. Sync Invoices
    cursor.execute("SELECT client_id, invoice_number, date, month, status, total_amount, currency, exchange_rate, type FROM invoices")
    rows = cursor.fetchall()
    
    invoices_to_push = []
    for r in rows:
        cid = id_map.get(r[0])
        if cid:
            invoices_to_push.append({
                "client_id": cid,
                "invoice_number": r[1],
                "date": r[2],
                "month": r[3],
                "status": r[4],
                "total_amount": r[5],
                "currency": r[6],
                "exchange_rate": r[7],
                "type": r[8]
            })
            
    try:
        supabase.table('invoices').delete().neq('invoice_number', '0').execute()
        supabase.table('invoices').insert(invoices_to_push).execute()
        print(f"Synced {len(invoices_to_push)} invoices to Supabase.")
    except Exception as e:
        print(f"Invoice Sync Error: {e}")
        
    # 3. Sync Payments
    cursor.execute("SELECT client_id, amount, date, method, notes, currency, exchange_rate FROM payments")
    rows = cursor.fetchall()
    
    payments_to_push = []
    for r in rows:
        cid = id_map.get(r[0])
        if cid:
            payments_to_push.append({
                "client_id": cid,
                "amount": r[1],
                "date": r[2],
                "method": r[3],
                "notes": r[4],
                "currency": r[5],
                "exchange_rate": r[6]
            })
            
    try:
        supabase.table('payments').delete().neq('date', '1900-01-01').execute()
        supabase.table('payments').insert(payments_to_push).execute()
        print(f"Synced {len(payments_to_push)} payments to Supabase.")
    except Exception as e:
        print(f"Payment Sync Error: {e}")
        
    conn.close()

if __name__ == "__main__":
    sync_all()
