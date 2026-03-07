import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path="backend/.env")
s = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

staff = s.table('staff').select('name, salary, epf_rate, socso_rate, eis_rate').execute().data

total_stat = 0
print(f"{'Name':<25} | {'Salary':<10} | {'EPF':<10} | {'SOCSO':<10} | {'EIS':<10}")
print("-" * 75)

for p in staff:
    sal = p.get("salary", 0) or 0
    e = p.get("epf_rate", 0) or 0
    so = p.get("socso_rate", 0) or 0
    ei = p.get("eis_rate", 0) or 0
    row_stat = e + so + ei
    total_stat += row_stat
    print(f"{p.get('name', 'Unknown'):<25} | {sal:<10,.2f} | {e:<10,.2f} | {so:<10,.2f} | {ei:<10,.2f}")

print("-" * 75)
print(f"Total Statutory: RM {total_stat:,.2f}")
