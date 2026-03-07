import os
import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def debug_financials():
    print("=== FINANCIAL DEBUG ===")
    
    # 1. Fetch Invoices
    res = supabase.table('invoices').select('*, clients(*)').execute()
    invoices = res.data
    print(f"Total Invoices in Supabase: {len(invoices)}")
    
    # Range used in code
    today = datetime.date.today()
    first_day_current_month = today.replace(day=1)
    last_month_end = first_day_current_month - datetime.timedelta(days=1)
    ttm_end_str = last_month_end.strftime("%Y-%m-%d")
    
    year = last_month_end.year
    month = last_month_end.month
    start_year = year - 1
    start_month = month + 1
    if start_month > 12:
        start_month = 1
        start_year = year
    ttm_start_date = datetime.date(start_year, start_month, 1)
    ttm_start_str = ttm_start_date.strftime("%Y-%m-%d")
    
    print(f"TTM Range: {ttm_start_str} to {ttm_end_str}")
    
    issuing_all = []
    receiving_all = []
    
    for i in invoices:
        amount = i['total_amount']
        date = i['date']
        it_type = i['type']
        client_type = i['clients']['type'] if i.get('clients') else "Unknown"
        
        entry = (date, amount, it_type, client_type, i['invoice_number'], i['status'])
        if it_type == 'issuing':
            issuing_all.append(entry)
        else:
            receiving_all.append(entry)
            
    print("\n--- Issuing Invoices (Revenue) ---")
    total_issuing = 0
    ttm_issuing = 0
    months_with_data = set()
    for d, a, t, ct, n, s in sorted(issuing_all):
        total_issuing += a
        is_ttm = ttm_start_str <= d <= ttm_end_str
        if is_ttm:
            ttm_issuing += a
        months_with_data.add(d[:7])
        print(f"{d} | RM {a:10,.2f} | {n} | {s} | TTM: {is_ttm}")
        
    print(f"\nTotal Issuing (All Time): RM {total_issuing:,.2f}")
    print(f"Total Issuing (TTM): RM {ttm_issuing:,.2f}")
    print(f"Months with data: {len(months_with_data)} ({sorted(list(months_with_data))})")
    print(f"Calculation: {total_issuing:,.2f} / {len(months_with_data)} = RM {total_issuing/len(months_with_data):,.2f}")
    
    # 2. Fetch Payments
    res = supabase.table('payments').select('*, clients(*)').execute()
    payments = res.data
    print("\n--- Payments ---")
    total_in = 0
    total_out = 0
    for p in payments:
        ct = p['clients']['type'] if p.get('clients') else "Unknown"
        a = p['amount']
        if ct == 'customer':
            total_in += a
        else:
            total_out += a
        print(f"{p['date']} | RM {a:10,.2f} | {ct} | {p['notes']}")
    
    print(f"Total In: RM {total_in:,.2f}")
    print(f"Total Out: RM {total_out:,.2f}")
    print(f"Cash on Hand: RM {total_in - total_out:,.2f}")
    
    # 3. Staff
    res = supabase.table('staff').select('*').execute()
    staff = res.data
    print("\n--- Staff & Payroll ---")
    total_gross = 0
    total_employer = 0
    for s in staff:
        sal = s['salary']
        epf = s.get('epf_rate', sal * 0.13)
        socso = s.get('socso_rate', sal * 0.0175)
        eis = s.get('eis_rate', sal * 0.002)
        total_gross += sal
        total_employer += (epf + socso + eis)
        print(f"{s['name']:25} | Gross: RM {sal:10,.2f} | EPF: {epf:10,.2f} | SOCSO: {socso:10,.2f}")
        
    print(f"Total Monthly Payroll (Gross): RM {total_gross:,.2f}")
    print(f"Total Monthly Employer Contrib: RM {total_employer:,.2f}")
    print(f"Total Monthly Expense (Staff): RM {total_gross + total_employer:,.2f}")

if __name__ == "__main__":
    debug_financials()
