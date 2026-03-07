import sys

file_path = "backend/app/routers/fintech.py"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Make it a router
text = text.replace("from fastapi import FastAPI", "from fastapi import FastAPI, APIRouter")
text = text.replace("app = FastAPI(", "router = APIRouter(#")
text = text.replace("@app.", "@router.")

# Disable middleware definitions from the router since main.py has it
text = text.replace("app.add_middleware", "# app.add_middleware")
text = text.replace("CORSMiddleware,", "# CORSMiddleware,")
text = text.replace("allow_origins=", "# allow_origins=")
text = text.replace("allow_credentials=", "# allow_credentials=")
text = text.replace("allow_methods=", "# allow_methods=")
text = text.replace("allow_headers=", "# allow_headers=")

# Fix database and path dependencies
text = text.replace('DATABASE = "fintech.db"', 'DATABASE = "app/fintech.db"')
text = text.replace('with open("clients_data.json"', 'with open("app/clients_data.json"')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Patching complete!")
