import os, datetime, sys
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
from supabase import create_client, Client
import numpy as np
from dateutil.relativedelta import relativedelta

load_dotenv()
supabase: Client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

SEP = "-" * 70

# Today's date based on metadata (2026-03-06)
TODAY = datetime.date(2026, 3, 6)
TTM_START = (TODAY.replace(day=1) - relativedelta(months=11)).strftime("%Y-%m-%d")

def calculate_pcb(monthly_salary):
    annual_salary = monthly_salary * 12
    taxable_income = max(0, annual_salary - 13000)
    if taxable_income <= 5000:       tax = 0
    elif taxable_income <= 20000:    tax = (taxable_income - 5000) * 0.01
    elif taxable_income <= 35000:    tax = 150 + (taxable_income - 20000) * 0.03
    elif taxable_income <= 50000:    tax = 600 + (taxable_income - 35000) * 0.06
    elif taxable_income <= 70000:    tax = 1500 + (taxable_income - 50000) * 0.11
    elif taxable_income <= 100000:   tax = 3700 + (taxable_income - 70000) * 0.19
    elif taxable_income <= 400000:   tax = 9400 + (taxable_income - 100000) * 0.25
    elif taxable_income <= 600000:   tax = 84400 + (taxable_income - 400000) * 0.26
    else:                            tax = 136400 + (taxable_income - 600000) * 0.28
    return round(tax / 12, 2)

def _inv_num(i): return (i.get('invoice_number') or '').strip()
def is_issuing(i):   
    num = _inv_num(i).upper()
    return num.startswith('M') or num.startswith('INV')
def is_receiving(i): return not is_issuing(i)

print("=" * 70)
print(f"  FULL TTM FINANCIAL CALCULATION TRACE (Start: {TTM_START})")
print("=" * 70)

invoices = supabase.table('invoices').select('*, clients(*)').execute().data
payments = supabase.table('payments').select('*, clients(*)').execute().data
staff    = supabase.table('staff').select('*').execute().data

# TTM Filtering
ttm_invoices = [i for i in invoices if i['date'] >= TTM_START]
issuing_ttm   = [i for i in ttm_invoices if is_issuing(i)]
receiving_ttm = [i for i in ttm_invoices if is_receiving(i)]

total_rev   = sum(i['total_amount'] for i in issuing_ttm)
divisor     = 12
monthly_rev = total_rev / divisor

print(f"\n{SEP}")
print("  A. REVENUE (TTM)")
print(SEP)
print(f"  Invoices starting with 'M' or 'INV' dated >= {TTM_START}:")
for i in issuing_ttm:
    print(f"    [{i['date']}] {i['invoice_number']:20s}  RM {i['total_amount']:>10,.2f}  ({i['status']})")
print(f"\n  Total TTM Revenue        = RM {total_rev:>10,.2f}")
print(f"  Forced Divisor           = {divisor}")
print(f"  Monthly Avg Revenue      = {total_rev:,.2f} / {divisor} = RM {monthly_rev:,.2f}")

print(f"\n{SEP}")
print("  B. PAYROLL (Staff Salary)")
print(SEP)

payroll = []
for s in staff:
    salary = s.get('salary') or 0
    epf_co = s.get('epf_rate') or salary * 0.13
    epf_ee = round(salary * 0.11, 2)
    socso  = s.get('socso_rate') or salary * 0.0175
    eis    = round(salary * 0.002, 2)
    pcb    = calculate_pcb(salary)
    net    = round(salary - epf_ee - eis - pcb, 2)
    payroll.append({"name": s['name'], "gross": salary, "epf_co": epf_co,
                    "epf_ee": epf_ee, "socso": socso, "eis": eis, "pcb": pcb, "net": net})
    print(f"\n  {s['name']}")
    print(f"    Gross (staff.salary)  = RM {salary:>10,.2f}")
    print(f"    Employer Contribs     = RM {epf_co + socso + eis:>10,.2f}")
    print(f"    Net Pay to Staff      = RM {net:>10,.2f}")

total_staff_cost = sum(p['gross'] + p['epf_co'] + p['socso'] + p['eis'] for p in payroll)
print(f"\n  Total Monthly Staff Cost  = RM {total_staff_cost:>10,.2f}")

print(f"\n{SEP}")
print("  C. SUPPLIER EXPENSES (TTM)")
print(SEP)
total_supp = sum(i['total_amount'] for i in receiving_ttm)
monthly_supp = total_supp / divisor
for i in receiving_ttm:
    print(f"    [{i['date']}] {i['invoice_number']:20s}  RM {i['total_amount']:>10,.2f}")
print(f"\n  Total TTM Supplier Bills = RM {total_supp:>10,.2f}")
print(f"  Monthly Avg Supp Exp     = {total_supp:,.2f} / {divisor} = RM {monthly_supp:,.2f}")

print(f"\n{SEP}")
print("  D. MONTHLY NET INCOME")
print(SEP)
monthly_net = monthly_rev - total_staff_cost - monthly_supp
print(f"  Monthly Net Income        = {monthly_rev:,.2f} - {total_staff_cost:,.2f} - {monthly_supp:,.2f}")
print(f"                            = RM {monthly_net:>10,.2f}")

print(f"\n{SEP}")
print("  E. EFFICIENCY METRICS")
print(SEP)

# Consistency
monthly_revs_map = {}
for i in issuing_ttm:
    m = i['date'][:7]
    monthly_revs_map[m] = monthly_revs_map.get(m, 0) + i['total_amount']
rev_list = list(monthly_revs_map.values())
while len(rev_list) < 12: rev_list.append(0)
cv = np.std(rev_list) / np.mean(rev_list) if np.mean(rev_list) > 0 else 0
consistency = max(0, 100 - (cv * 50))
print(f"  Revenue Consistency:   {consistency:.2f}%")

# Collection
paid = sum(1 for i in issuing_ttm if i['status'] == 'paid')
coll_eff = (paid / len(issuing_ttm)) * 100 if issuing_ttm else 0
print(f"  Collection Efficiency: {coll_eff:.2f}%")

# DTI
dti = (5000 / max(1, monthly_net)) * 100 if monthly_net > 0 else 100
print(f"  Debt-to-Income:        {dti:.2f}%")

# CFC
cfc = monthly_net / 25000 if monthly_net > 0 else 0
print(f"  Cash Flow Coverage:    {cfc:.2f}x")

print(f"\n{SEP}")
print("  F. MONTHLY TAX")
print(SEP)
annual_profit = max(0, monthly_net * 12)
if annual_profit <= 150000: ann_tax = annual_profit * 0.15
elif annual_profit <= 600000: ann_tax = 150000*0.15 + (annual_profit-150000)*0.17
else: ann_tax = 150000*0.15 + 450000*0.17 + (annual_profit-600000)*0.24
monthly_tax = ann_tax / 12
print(f"  Annualized Profit = RM {annual_profit:,.2f}")
print(f"  Monthly Tax       = RM {monthly_tax:,.2f}")

# Loan Readiness calculation
score = (consistency * 0.25) + (coll_eff * 0.25) + (min(100, 100 - dti) * 0.20) + (min(100, cfc * 10) * 0.20) + (100 * 0.10)
print(f"\n{SEP}")
print("  G. LOAN READINESS SCORE")
print(SEP)
print(f"  Weighted Average: {score:.2f}%")
print("=" * 70)
