import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

inv_res = supabase.table('invoices').select('*, clients(*)').execute()
pay_res = supabase.table('payments').select('*, clients(*)').execute()
staff_res = supabase.table('staff').select('*').execute()

invoices = inv_res.data
payments = pay_res.data
staff_list = staff_res.data

# Logic from perform_analysis
issuing = [i for i in invoices if i.get('type') == 'issuing']
monthly_revs = {}
for i in issuing:
    m = i['date'][:7]
    monthly_revs[m] = monthly_revs.get(m, 0) + i['total_amount']
rev_list = list(monthly_revs.values())
months = len(rev_list)
total_rev = sum(i['total_amount'] for i in issuing)

recov = [i for i in invoices if i.get('type') == 'receiving' or (i.get('clients') and i['clients'].get('type') == 'supplier')]
total_supp_exp = sum(i['total_amount'] for i in recov)

monthly_payroll = sum(s.get('salary', 0) for s in staff_list)
monthly_epf = sum(s.get('epf_rate', 0) for s in staff_list)
monthly_socso = sum(s.get('socso_rate', 0) for s in staff_list)
monthly_eis = sum(s.get('eis_rate', 0) for s in staff_list)

monthly_avg_rev = total_rev / months
monthly_avg_supp = total_supp_exp / months
monthly_avg_staff = monthly_payroll + monthly_epf + monthly_socso + monthly_eis

profit = monthly_avg_rev - monthly_avg_supp - monthly_avg_staff
tax = profit * 0.24

print(f"Months: {months}")
print(f"Total Revenue: {total_rev}")
print(f"Monthly Avg Rev: {monthly_avg_rev}")
print(f"Monthly Avg Staff: {monthly_avg_staff}")
print(f"Monthly Avg Supp: {monthly_avg_supp}")
print(f"Monthly Profit: {profit}")
print(f"Monthly Tax: {tax}")
