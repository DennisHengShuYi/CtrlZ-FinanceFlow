import os, datetime
from dateutil.relativedelta import relativedelta
import numpy as np
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
supabase: Client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

TODAY = datetime.date(2026, 3, 6)
TTM_START = (TODAY.replace(day=1) - relativedelta(months=11)).strftime("%Y-%m-%d")

def fetch_data():
    inv = supabase.table('invoices').select('*, clients(*)').execute().data
    pay = supabase.table('payments').select('*, clients(*)').execute().data
    stf = supabase.table('staff').select('*').execute().data
    return inv, pay, stf

def calculate_pcb(salary):
    annual = salary * 12
    taxable = max(0, annual - 13000)
    if taxable <= 5000: tax = 0
    elif taxable <= 20000: tax = (taxable - 5000) * 0.01
    elif taxable <= 35000: tax = 150 + (taxable - 20000) * 0.03
    elif taxable <= 50000: tax = 600 + (taxable - 35000) * 0.06
    elif taxable <= 70000: tax = 1500 + (taxable - 50000) * 0.11
    elif taxable <= 100000: tax = 3700 + (taxable - 70000) * 0.19
    elif taxable <= 400000: tax = 9400 + (taxable - 100000) * 0.25
    elif taxable <= 600000: tax = 84400 + (taxable - 400000) * 0.26
    else: tax = 136400 + (taxable - 600000) * 0.28
    return round(tax / 12, 2)

def generate_report():
    invoices, payments, staff = fetch_data()
    
    # Filter TTM
    ttm_invoices = [i for i in invoices if i['date'] >= TTM_START]
    is_m = lambda x: (x.get('invoice_number') or '').strip().upper().startswith('M')
    
    issuing = [i for i in ttm_invoices if is_m(i)]
    receiving = [i for i in ttm_invoices if not is_m(i)]
    
    total_revenue = sum(i['total_amount'] for i in issuing)
    monthly_avg_revenue = total_revenue / 12
    
    # Staff
    staff_costs = []
    for s in staff:
        gross = s.get('salary') or 0
        epf_co = s.get('epf_rate') or gross * 0.13
        socso = s.get('socso_rate') or gross * 0.0175
        eis = round(gross * 0.002, 2)
        staff_costs.append(gross + epf_co + socso + eis)
    total_monthly_staff = sum(staff_costs)
    
    # Suppliers
    total_supp = sum(i['total_amount'] for i in receiving)
    monthly_avg_supp = total_supp / 12
    
    monthly_net = monthly_avg_revenue - total_monthly_staff - monthly_avg_supp
    
    # Efficiency
    # Consistency
    m_map = {}
    for i in issuing:
        m = i['date'][:7]
        m_map[m] = m_map.get(m, 0) + i['total_amount']
    rev_list = list(m_map.values())
    while len(rev_list) < 12: rev_list.append(0)
    cv = np.std(rev_list) / np.mean(rev_list) if np.mean(rev_list) > 0 else 0
    consistency = max(0, 100 - (cv * 50))
    
    # Collection
    paid = sum(1 for i in issuing if i['status'] == 'paid')
    coll_eff = (paid / len(issuing)) * 100 if issuing else 0
    
    # DTI
    dti = (5000 / max(1, monthly_net)) * 100 if monthly_net > 0 else 100
    
    # CFC
    cfc = monthly_net / 25000 if monthly_net > 0 else 0
    
    # Tax
    ann_profit = max(0, monthly_net * 12)
    if ann_profit <= 150000: ann_tax = ann_profit * 0.15
    elif ann_profit <= 600000: ann_tax = 150000*0.15 + (ann_profit-150000)*0.17
    else: ann_tax = 150000*0.15 + 450000*0.17 + (ann_profit-600000)*0.24
    monthly_tax = ann_tax / 12
    
    # Score
    score = (consistency * 0.25) + (coll_eff * 0.25) + (min(100, 100 - dti) * 0.20) + (min(100, cfc * 10) * 0.20) + (100 * 0.10)
    
    with open("detailed_report.md", "w", encoding="utf-8") as f:
        f.write("# Detailed Financial Report (TTM)\n\n")
        f.write(f"**Period:** {TTM_START} to {TODAY}\n\n")
        
        f.write("## 1. Annual Revenue\n")
        f.write(f"- **Sum of all 'M' invoices in TTM:** RM {total_revenue:,.2f}\n")
        f.write(f"- **Dashboard Display:** RM {total_revenue:,.2f}\n\n")
        
        f.write("## 2. Monthly Revenue (Avg)\n")
        f.write(f"- **Formula:** Total Revenue / 12\n")
        f.write(f"- **Result:** RM {total_revenue:,.2f} / 12 = **RM {monthly_avg_revenue:,.2f}**\n\n")
        
        f.write("## 3. Monthly Net Income\n")
        f.write(f"- **Avg Revenue:** RM {monthly_avg_revenue:,.2f}\n")
        f.write(f"- **Monthly Staff Cost:** RM {total_monthly_staff:,.2f}\n")
        f.write(f"- **Avg Supplier Bills:** RM {monthly_avg_supp:,.2f}\n")
        f.write(f"- **Net Income:** RM {monthly_net:,.2f}\n\n")
        
        f.write("## 4. Current Efficiency\n")
        f.write(f"- **Revenue Consistency:** {consistency:.2f}% (Based on CV of monthly revenue)\n")
        f.write(f"- **Collection Efficiency:** {coll_eff:.2f}% ({paid} paid / {len(issuing)} total)\n")
        f.write(f"- **Debt-to-Income:** {dti:.2f}% (RM 5,000 debt / RM {monthly_net:,.2f} net)\n")
        f.write(f"- **Cash Flow Coverage:** {cfc:.2f}x (RM {monthly_net:,.2f} net / RM 25,000 benchmark)\n\n")
        
        f.write("## 5. Estimated Monthly Tax\n")
        f.write(f"- **Annualized Profit:** RM {ann_profit:,.2f}\n")
        f.write(f"- **Annual Tax:** RM {ann_tax:,.2f}\n")
        f.write(f"- **Monthly Tax:** RM {monthly_tax:,.2f}\n\n")
        
        f.write("## 6. Loan Readiness Score\n")
        f.write(f"- **Consistency (25%):** {consistency * 0.25:.2f}\n")
        f.write(f"- **Collection (25%):** {coll_eff * 0.25:.2f}\n")
        f.write(f"- **DTI (20%):** {min(100, 100 - dti) * 0.20:.2f}\n")
        f.write(f"- **CFC (20%):** {min(100, cfc * 10) * 0.20:.2f}\n")
        f.write(f"- **Compliance (10%):** 10.00\n")
        f.write(f"- **TOTAL SCORE:** **{score:.2f}%**\n")

if __name__ == "__main__":
    generate_report()
    print("Report generated: detailed_report.md")
