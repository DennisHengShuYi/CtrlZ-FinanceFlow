import os
import json
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path

# NEW: Import the new SDK
from google import genai
from google.genai import types

# Load environment variables from the project root
env_path = Path(__file__).parent.parent.parent.parent / '.env.example'
load_dotenv(dotenv_path=env_path)

print("🔍 Current working directory:", os.getcwd())
print("🔍 .env path being used:", env_path)
print("🔍 Does .env file exist?", env_path.exists())
print("🔍 GEMINI_API_KEY from os.getenv:", os.getenv("GEMINI_API_KEY"))

from google import genai
import os

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Configure Gemini with the new SDK
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        # NEW: Create a client instead of configuring globally
        client = genai.Client(api_key=GEMINI_API_KEY)
        # Test the client by listing models (optional)
        print("✅ Gemini client initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize Gemini client: {e}")
        client = None
else:
    print("⚠️ No Gemini API key found, using fallback only")
    client = None

# Optional Supabase
USE_SUPABASE = os.getenv("USE_SUPABASE", "false").lower() == "true"
if USE_SUPABASE:
    from supabase import create_client
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )

# Import Clerk auth dependency (adjust path if needed)
from app.auth import require_auth

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

# --- Pydantic models (unchanged) ---
class WhatsAppMessage(BaseModel):
    from_number: str
    text: str
    timestamp: Optional[str] = None

class WhatsAppReply(BaseModel):
    intent: str
    mood: str
    reply: str

# --- Helper to fetch conversation history from Supabase (unchanged) ---
def get_conversation_history(session_id: str, limit: int = 10) -> List[dict]:
    """Retrieve the last `limit` messages for a given session (from_number)."""
    if not USE_SUPABASE:
        return []
    try:
        response = supabase.table("whatsapp_messages") \
            .select("role, content, intent, mood") \
            .eq("session_id", session_id) \
            .order("created_at", desc=False) \
            .limit(limit) \
            .execute()
        return response.data
    except Exception as e:
        print(f"Failed to fetch history: {e}")
        return []

# --- Store a message in Supabase (unchanged) ---
def store_message(session_id: str, role: str, content: str, intent: str = None, mood: str = None):
    if not USE_SUPABASE:
        return
    try:
        supabase.table("whatsapp_messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content,
            "intent": intent,
            "mood": mood
        }).execute()
    except Exception as e:
        print(f"Failed to store message: {e}")

# --- Fallback keyword logic (unchanged) ---
def fallback_classify(text: str) -> dict:
    text_lower = text.lower()
    
    # Intent
    if any(word in text_lower for word in ["order", "buy", "want", "how to order"]):
        intent = "order"
    elif any(word in text_lower for word in ["pay", "paid", "payment", "transfer"]):
        intent = "payment"
    else:
        intent = "interest"
    
    # Mood
    if any(word in text_lower for word in ["thank", "great", "love", "sedap", "best"]):
        mood = "happy"
    elif any(word in text_lower for word in ["why", "how", "what", "when", "where"]):
        mood = "neutral"
    elif any(word in text_lower for word in ["expensive", "bad", "not good", "sad", "mahal"]):
        mood = "sad"
    else:
        mood = "neutral"
    
    # Generate simple reply based on intent+mood
    if intent == "order":
        reply = "Great! Could you please confirm the quantity and your delivery address?"
    elif intent == "payment":
        reply = "Thank you! You can pay via DuitNow or bank transfer. I'll send you the details."
    else:  # interest
        if mood == "happy":
            reply = "We're glad you like our products! Would you like to place an order? 😊"
        elif mood == "neutral":
            reply = "Do you have any questions about our products? I'm here to help!"
        else:  # sad
            reply = "We're sorry to hear that. Could you share your feedback so we can improve?"
    
    return {"intent": intent, "mood": mood, "reply": reply}

# --- NEW: Gemini classification with conversation history using google-genai ---
def classify_with_gemini(text: str, history: List[dict]) -> dict:
    if not client:
        raise Exception("Gemini not configured")
    
    # Build conversation history string
    history_str = ""
    for msg in history:
        role = "Customer" if msg["role"] == "user" else "Assistant"
        history_str += f"{role}: {msg['content']}\n"
    
    prompt = f"""
You are an AI assistant for a Malaysian food business selling frozen snacks like curry puffs, roti canai, and onde-onde.
Here is the conversation so far:
{history_str}
Customer: {text}

Analyze the customer's latest message and return JSON with:
- intent: one of "interest", "order", "payment"
- mood: one of "happy", "neutral", "sad"
- reply: a friendly, appropriate response (use Malaysian/English mix if suitable)

Rules:
- If intent is "order", reply should confirm order and ask for details.
- If intent is "interest" and mood is "happy", encourage them to order.
- If intent is "interest" and mood is "neutral", ask if they have questions.
- If intent is "interest" and mood is "sad", acknowledge feedback and offer assistance.
- Keep replies warm and helpful.

Return ONLY valid JSON.
"""
    
    # NEW: Use the client to generate content
    # Using gemini-1.5-flash (or you can use gemini-2.0-flash if available)
    response = client.models.generate_content(
        model='gemini-2.5-flash',  # or 'gemini-2.0-flash'
        contents=prompt
    )
    
    raw = response.text.strip()
    # Remove markdown code fences if present
    if raw.startswith("```json"):
        raw = raw[7:-3]
    elif raw.startswith("```"):
        raw = raw[3:-3]
    return json.loads(raw)

# --- Endpoint (unchanged) ---
@router.post("/webhook", response_model=WhatsAppReply)
# Removed auth for testing purpose
async def whatsapp_webhook(message: WhatsAppMessage):
    """
    Simulate an incoming WhatsApp webhook.
    Maintains conversation history via Supabase and returns an AI-generated reply.
    """
    session_id = message.from_number  # use phone number as session identifier
    
    # Fetch conversation history
    history = get_conversation_history(session_id)
    
    try:
        # Try Gemini first
        if client:  # NEW: check client instead of model
            result = classify_with_gemini(message.text, history)
        else:
            result = fallback_classify(message.text)
    except Exception as e:
        print(f"Gemini error, using fallback: {e}")
        result = fallback_classify(message.text)
    
    # Store user message
    store_message(
        session_id=session_id,
        role="user",
        content=message.text,
        intent=result["intent"],
        mood=result["mood"]
    )
    
    # Store assistant reply
    store_message(
        session_id=session_id,
        role="assistant",
        content=result["reply"]
    )
    
    return result