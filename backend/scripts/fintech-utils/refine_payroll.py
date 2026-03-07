import os
import math
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def calculate_pcb(monthly_salary):
    """Malaysia PCB (Monthly Tax Deduction) calculation logic"""
    annual_salary = monthly_salary * 12
    taxable_income = max(0, annual_salary - 13000) # Basic relief
    
    tax = 0
    if taxable_income <= 5000:
        tax = 0
    elif taxable_income <= 20000:
        tax = (taxable_income - 5000) * 0.01
    elif taxable_income <= 35000:
        tax = 150 + (taxable_income - 20000) * 0.03
    elif taxable_income <= 50000:
        tax = 600 + (taxable_income - 35000) * 0.06
    elif taxable_income <= 70000:
        tax = 1500 + (taxable_income - 50000) * 0.11
    elif taxable_income <= 100000:
        tax = 3700 + (taxable_income - 70000) * 0.19
    elif taxable_income <= 400000:
        tax = 9400 + (taxable_income - 100000) * 0.25
    elif taxable_income <= 600000:
        tax = 84400 + (taxable_income - 400000) * 0.26
    else:
        tax = 136400 + (taxable_income - 600000) * 0.28
        
    return round(tax / 12, 2)

def get_net(gross):
    epf = gross * 0.11 # Employee share is 11%
    socso = gross * 0.005 # Rough SOCSO employee share
    eis = gross * 0.002 # Rough EIS
    tax = calculate_pcb(gross)
    return gross - epf - socso - eis - tax

def find_gross_for_target_net(target_net):
    # Search for gross salary that produces target net
    gross = target_net
    while True:
        net = get_net(gross)
        if net >= target_net:
            return round(gross, 2)
        gross += 1.0

def refine_payroll():
    print("Refining payroll to achieve round net salaries...")
    
    # 1. Fetch Staff
    res = supabase.table('staff').select('*').execute()
    staff = res.data
    
    # Define cleaner targets near current levels
    # Alex (was 15k gross) -> Target 13,000 Net
    # Siti (was 12k gross) -> Target 10,000 Net
    # Raj (was 6k gross)   -> Target 5,000 Net
    
    targets = {
        "Alex Wong Kah Leong": 13000,
        "Siti Aminah binti Rashid": 10000,
        "Raj Kumar": 5000
    }
    
    for s in staff:
        name = s['name']
        if name in targets:
            target_net = targets[name]
            new_gross = find_gross_for_target_net(target_net)
            
            # Recalculate components for DB storage
            epf_emp = new_gross * 0.11
            epf_co = new_gross * 0.13
            socso = new_gross * 0.0175 # Total contrib
            eis = new_gross * 0.002
            
            print(f"Updating {name}: Target Net RM {target_net} -> New Gross RM {new_gross}")
            
            supabase.table('staff').update({
                "salary": new_gross,
                "epf_rate": round(epf_co, 2),
                "socso_rate": round(socso, 2),
                "tax_rate": calculate_pcb(new_gross)
            }).eq('id', s['id']).execute()

if __name__ == "__main__":
    refine_payroll()
