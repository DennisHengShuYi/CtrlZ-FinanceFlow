import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

try:
    print("Trying model: gemini-pro-latest")
    response = client.models.generate_content(
        model="gemini-pro-latest",
        contents="Say hello"
    )
    print(f"Success: {response.text}")
except Exception as e:
    print(f"Failed: {e}")
