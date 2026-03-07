import os
from dotenv import load_dotenv
from google import genai as google_genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

try:
    client = google_genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Hello, say test."
    )
    print("SUCCESS:", response.text)
except Exception as e:
    print("ERROR:", e)
