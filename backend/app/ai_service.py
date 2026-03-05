"""
AI Service — uses Gemini 2.0 Flash to extract invoice data from WhatsApp messages.
"""

import json
import os
import re
import base64
from app.config import ROOT_DIR
from dotenv import load_dotenv

load_dotenv(ROOT_DIR / ".env")

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")


def _extract_json(text: str) -> dict:
    """
    Robustly extract JSON from an AI response.
    Handles: raw JSON, ```json fences, conversational text around JSON, etc.
    """
    text = text.strip()

    # 1. Try direct parse first (ideal case)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Try extracting from ```json ... ``` code fences
    fence_match = re.search(r"```(?:json)?\s*\n?(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Find the first { ... } block anywhere in the text
    brace_match = re.search(r"(\{.*\})", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(1))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON from AI response: {text[:200]}")

SYSTEM_PROMPT = """You are an expert invoice assistant for FinanceFlow.
Your task is to extract invoice details from WhatsApp messages.

Required Fields:
1. Client Name (e.g., "ABC Corp")
2. Invoice Date (YYYY-MM-DD format)
3. Invoice Month (e.g., "March 2024")
4. Currency (e.g., "MYR", "USD", "EUR", "SGD", "IDR", "PHP", "THB", "VND", "AED" - default to "MYR" if not mentioned. Detect RM/Ringgit as MYR, S$ as SGD, Rp as IDR, ₱ as PHP, ฿ as THB, ₫ as VND)
5. Items: List of objects containing { description, price, quantity }

Rules:
- If a field is missing or ambiguous, you MUST identify it.
- If the message says "ABC Corp 5 laptops at 1000 each", extract Client: "ABC Corp", Item: "laptops", Qty: 5, Price: 1000.
- If the user only says "I want to create an invoice for ABC Corp for 5 laptops", ask for the price.
- Always return valid JSON only, no markdown formatting.

Output Format (JSON):
{
  "status": "complete" | "incomplete",
  "data": {
    "client_name": string | null,
    "date": string | null,
    "month": string | null,
    "currency": string | null,
    "items": Array<{ "description": string, "price": number, "quantity": number }>
  },
  "questions": string[]
}"""


async def extract_invoice_data(message: str) -> dict:
    """
    Send a WhatsApp message to Gemini and extract structured invoice data.
    Returns parsed JSON with status, data, and questions.
    """
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        response = model.generate_content(
            [
                {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
                {
                    "role": "model",
                    "parts": [
                        {
                            "text": "Understood. I will extract invoice data from messages and return valid JSON."
                        }
                    ],
                },
                {"role": "user", "parts": [{"text": message}]},
            ]
        )

        # Robust JSON extraction
        text = response.text.strip()
        return _extract_json(text)
    except Exception as e:
        return {
            "status": "error",
            "data": {"client_name": None, "date": None, "month": None, "items": []},
            "questions": [f"Sorry, I couldn't process your message. Error: {str(e)}"],
        }


async def extract_receipt_data(image_bytes: bytes, mime_type: str) -> dict:
    """
    Send a receipt image to Gemini and extract structured data.
    """
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        system_prompt = """You are an expert OCR and financial data extraction AI.
Extract the following information from the receipt image:
1. transaction_date (YYYY-MM-DD format)
2. amount (numeric only, omit currency symbols)
3. currency (string, e.g., "MYR", "USD", "SGD", "IDR", "PHP", "THB" - detect RM/Ringgit as MYR, S$ as SGD, Rp as IDR, ₱ as PHP, ฿ as THB, ₫ as VND. Default to "MYR" if not found)
4. reference_number (string)
5. sender_name (string)
6. bank_name (string)

Return valid JSON exactly matching these keys. If a field is not found or ambiguous, return null for that field. Do not include markdown formatting.
"""
        response = model.generate_content(
            [
                {
                    "role": "user",
                    "parts": [
                        {"text": system_prompt},
                        {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode("utf-8")}},
                    ],
                }
            ]
        )

        # Robust JSON extraction
        text = response.text.strip()
        return _extract_json(text)
    except Exception as e:
        return {"error": str(e)}


async def evaluate_supplier_bill(
    amount: float,
    currency: str,
    description: str,
    supplier_name: str,
    cash_on_hand: float,
    available_for_expenses: float,
    base_currency: str,
) -> dict:
    """
    Ask Gemini if it's safe to auto-pay this supplier bill based on cash flow.
    """
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        system_prompt = f"""You are a financial controller. 
Analyze if it is appropriate to pay this incoming supplier invoice immediately. Consider cash flow preservation.

Invoice Details:
- Supplier Name: {supplier_name}
- Total Amount: {amount} {currency}
- Details: {description}

Current Financial Health:
- Cash On Hand: {cash_on_hand} {base_currency}
- Available for Expenses: {available_for_expenses} {base_currency}

Return a JSON object with exactly these keys:
- "approve" (boolean): true if safe to pay now, false otherwise.
- "reason" (string): A short explanation for your decision (max 1-2 sentences).
Do not include markdown formatting.
        """
        response = model.generate_content([{"role": "user", "parts": [{"text": system_prompt}]}])
        text = response.text.strip()
        return _extract_json(text)
    except Exception as e:
        print(f"Error evaluating bill: {e}")
        return {"approve": False, "reason": "Failed to invoke AI evaluation."}
