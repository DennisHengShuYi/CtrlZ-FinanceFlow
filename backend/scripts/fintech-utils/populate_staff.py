import os
import json
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path

# Load env variables
_ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def populate_staff():
    print("Populating staff table in Supabase...")
    staff_data = [
        {"id": str(uuid.uuid4()), "name": "Alex Wong Kah Leong", "role": "Director", "salary": 15000},
        {"id": str(uuid.uuid4()), "name": "Siti Aminah binti Rashid", "role": "Director", "salary": 12000}
    ]
    try:
        response = supabase.table('staff').insert(staff_data).execute()
        print("Staff populated successfully!")
        print(json.dumps(response.data, indent=2))
    except Exception as e:
        print(f"Error populating staff: {e}")

if __name__ == "__main__":
    populate_staff()
