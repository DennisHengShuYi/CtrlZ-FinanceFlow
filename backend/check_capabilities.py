import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

try:
    print("Listing models with capabilities:")
    for model in client.models.list():
        if 'generateContent' in model.supported_generation_methods:
             print(f"- {model.name} (GenerateContent supported)")
except Exception as e:
    print(f"Error: {e}")
