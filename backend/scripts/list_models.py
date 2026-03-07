from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=key)
try:
    for m in client.models.list():
        print(f"Model ID: {m.name}")
except Exception as e:
    print("FAILED:", e)
