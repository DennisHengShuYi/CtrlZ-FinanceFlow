import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.table('invoices').select('invoice_number, total_amount, date, status').execute()
invoices = res.data

import datetime as dt
from dateutil.relativedelta import relativedelta

# Today's date based on metadata (2026-03-06)
today = dt.date(2026, 3, 6)
ttm_start_date = (today.replace(day=1) - relativedelta(months=11)).strftime("%Y-%m-%d")

with open("audit_report.txt", "w", encoding="utf-8") as f:
    f.write(f"TRAILING 12-MONTH AUDIT (Starting from {ttm_start_date})\n")
    f.write(f"{'#':<3} | {'Inv Num':<15} | {'Amount':>10} | {'Date':<10} | {'Status':<10} | {'M-Prefix?'}\n")
    f.write("-" * 75 + "\n")

    total_m_ttm = 0
    idx_m = 1
    for idx, inv in enumerate(invoices):
        num = inv.get('invoice_number', '') or ''
        amount = inv.get('total_amount', 0)
        date = inv.get('date', '')
        is_m = num.strip().upper().startswith('M')
        is_in_ttm = date >= ttm_start_date
        
        if is_m and is_in_ttm:
            m_check = "YES (TTM)"
            f.write(f"{idx_m:<3} | {num:<15} | {amount:>10,.2f} | {date} | {inv.get('status')} | {m_check}\n")
            total_m_ttm += amount
            idx_m += 1
        elif is_m:
            m_check = "no (OLD)"
            f.write(f"--- | {num:<15} | {amount:>10,.2f} | {date} | {inv.get('status')} | {m_check}\n")

    f.write("-" * 75 + "\n")
    f.write(f"TOTAL TTM REVENUE (Sum of YES): RM {total_m_ttm:,.2f}\n")
    f.write(f"FORCED DIVISOR: 12\n")
    f.write(f"MONTHLY AVERAGE REVENUE: RM {total_m_ttm / 12:,.2f}\n")
