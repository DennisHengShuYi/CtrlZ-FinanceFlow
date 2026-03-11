import os
import uuid
from dotenv import load_dotenv
from supabase import create_client

# Load .env from root
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
    exit(1)

supabase = create_client(url, key)

# 1. Get a company_id
comp_res = supabase.table('user_companies').select('id').limit(1).execute()
if not comp_res.data:
    print("Error: No company found in user_companies. Please create one first.")
    exit(1)

company_id = comp_res.data[0]['id']
print(f"Using Company ID: {company_id}")

# 2. Staff data
mock_staff = [
    {
        "id": str(uuid.uuid4()),
        "name": "Dennis Heng",
        "email": "dennis@techlance.my",
        "role": "Director",
        "salary": 15000,
        "company_id": company_id,
        "epf_rate": 0.13,
        "socso_rate": 0.0175,
        "eis_rate": 0.002
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Min Han",
        "email": "minhan@techlance.my",
        "role": "Director",
        "salary": 12000,
        "company_id": company_id,
        "epf_rate": 0.13,
        "socso_rate": 0.0175,
        "eis_rate": 0.002
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Sarah Tan",
        "email": "sarah@techlance.my",
        "role": "Software Engineer",
        "salary": 6000,
        "company_id": company_id,
        "epf_rate": 0.11,
        "socso_rate": 0.0175,
        "eis_rate": 0.002
    }
]

# 3. Insert
for staff in mock_staff:
    try:
        res = supabase.table('staff').insert(staff).execute()
        print(f"Inserted: {staff['name']}")
    except Exception as e:
        print(f"Failed to insert {staff['name']}: {e}")

print("Seeding complete.")
