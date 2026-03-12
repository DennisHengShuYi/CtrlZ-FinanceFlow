import os
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

from app.supabase_client import supabase
from app.ai_service import extract_product_details_from_caption

env_path = Path(__file__).parent.parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

router = APIRouter(prefix="/api/products", tags=["products"])

# --- Pydantic models ---
class ProductBase(BaseModel):
    name: str
    inventory: int
    threshold: int = 10
    image: Optional[str] = None
    price: Optional[float] = 0.0
    cost_price: Optional[float] = 0.0
    currency: Optional[str] = "MYR"
    company_id: Optional[str] = None
    supplier_id: Optional[str] = None
    unit: Optional[str] = None
    origin_country: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    inventory: Optional[int] = None
    threshold: Optional[int] = None
    image: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    currency: Optional[str] = None
    supplier_id: Optional[str] = None
    unit: Optional[str] = None
    origin_country: Optional[str] = None

class Product(ProductBase):
    id: str

class TopProduct(Product):
    score: int
    inquiries: int

class MostEnquired(BaseModel):
    name: str
    inquiries: int


# --- Helper: compute scores (same logic as before, using DB product names) ---
def get_all_instagram_posts():
    if not supabase:
        return []
    try:
        resp = supabase.table("instagram_posts").select("*").execute()
        return resp.data
    except Exception as e:
        print(f"Error fetching posts: {e}")
        return []

def get_all_whatsapp_messages():
    if not supabase:
        return []
    try:
        resp = supabase.table("whatsapp_messages") \
            .select("content, intent") \
            .eq("role", "user") \
            .execute()
        return resp.data
    except Exception as e:
        print(f"Error fetching whatsapp messages: {e}")
        return []

def count_mentions_in_text(text: str, product_name: str) -> bool:
    return product_name.lower() in text.lower()

def compute_product_scores(products):
    if not products:
        return {}, {}

    posts = get_all_instagram_posts()
    whatsapp_msgs = get_all_whatsapp_messages()

    product_scores = {p["name"]: 0 for p in products}
    product_inquiries = {p["name"]: 0 for p in products}

    # Process Instagram posts
    for post in posts:
        caption = post.get("caption", "")
        mentioned = [p["name"] for p in products if count_mentions_in_text(caption, p["name"])]
        if not mentioned:
            continue
        likes = post.get("likes_count", 0)
        comments_count = post.get("comments_count", 0)
        for prod in mentioned:
            product_scores[prod] += likes * 1
            product_scores[prod] += comments_count * 2

    # Process WhatsApp messages
    for msg in whatsapp_msgs:
        content = msg.get("content", "")
        intent = msg.get("intent", "")
        if intent not in ["order", "interest"]:
            continue
        for prod in products:
            if count_mentions_in_text(content, prod["name"]):
                product_scores[prod["name"]] += 3
                product_inquiries[prod["name"]] += 1

    return product_scores, product_inquiries


# --- Helper to fetch Instagram posts (optionally filtered by company) ---
async def get_all_instagram_posts_for_company(company_id: str):
    if not supabase:
        return []
    try:
        # If you have a company_id column in instagram_posts, filter by it.
        # For now, return all posts.
        resp = supabase.table("instagram_posts").select("*").execute()
        return resp.data
    except Exception as e:
        print(f"Error fetching posts: {e}")
        return []


# --- Endpoints (auth removed, no company filtering) ---

@router.get("", response_model=List[Product])
async def get_products():
    """Return all products (no authentication, all companies)."""
    if not supabase:
        return []
    resp = supabase.table("products").select("*").execute()
    return [Product(**p) for p in resp.data]

@router.get("/top", response_model=List[TopProduct])
async def get_top_products(limit: int = 5):
    """Return top products by weighted score across all companies."""
    if not supabase:
        return []
    resp = supabase.table("products").select("*").execute()
    products = resp.data
    if not products:
        return []
    
    scores, inquiries = compute_product_scores(products)
    result = []
    for prod in products:
        result.append({
            **prod,
            "score": scores.get(prod["name"], 0),
            "inquiries": inquiries.get(prod["name"], 0)
        })
    result.sort(key=lambda x: x["score"], reverse=True)
    return result[:limit]

@router.get("/most-enquired", response_model=MostEnquired)
async def get_most_enquired_product():
    """Return the product with the highest WhatsApp inquiry count across all companies."""
    if not supabase:
        return {"name": "None", "inquiries": 0}
    resp = supabase.table("products").select("*").execute()
    products = resp.data
    _, inquiries = compute_product_scores(products)
    if not inquiries:
        return {"name": "None", "inquiries": 0}
    max_name = max(inquiries.items(), key=lambda x: x[1])[0]
    return {"name": max_name, "inquiries": inquiries[max_name]}

@router.post("", response_model=Product)
async def create_product(product: ProductCreate):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Since auth is removed, we need a company_id. For testing, you can either:
    # 1. Accept company_id in the request body (it's optional in ProductCreate)
    # 2. Hardcode a default company ID
    # We'll require company_id in the request for now.
    payload = product.dict(exclude_none=True)
    if "company_id" not in payload:
        raise HTTPException(status_code=400, detail="company_id is required")
    
    try:
        resp = supabase.table("products").insert(payload).execute()
        return Product(**resp.data[0])
    except Exception as e:
        print(f"Create err: {e}")
        raise HTTPException(status_code=500, detail="Failed to create product")

@router.patch("/{product_id}", response_model=Product)
async def update_product(product_id: str, updates: ProductUpdate):
    """Update inventory, threshold, price, etc. of a product."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.utcnow().isoformat()

    try:
        resp = supabase.table("products").update(update_data).eq("id", product_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Product not found")
        return Product(**resp.data[0])
    except Exception as e:
        print(f"Update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update product")

@router.delete("/{product_id}")
async def delete_product(product_id: str):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        supabase.table("products").delete().eq("id", product_id).execute()
        return {"status": "success"}
    except Exception as e:
        print(f"Delete err: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete product")

@router.post("/sync-from-instagram")
async def sync_products_from_instagram():
    """
    Fetch all Instagram posts, extract product details, and update the products table.
    This version does not filter by company; updates all products.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    # Get all products (across all companies)
    products_resp = supabase.table("products").select("id, name, details").execute()
    products = products_resp.data
    if not products:
        return {"message": "No products found in any company."}

    # Get all Instagram posts
    posts_resp = supabase.table("instagram_posts").select("*").execute()
    posts = posts_resp.data
    if not posts:
        return {"message": "No Instagram posts found."}

    updated_count = 0
    for post in posts:
        caption = post.get("caption", "")
        if not caption:
            continue
        for prod in products:
            if prod["name"].lower() in caption.lower():
                details = await extract_product_details_from_caption(caption, prod["name"])
                if details:
                    current = supabase.table("products").select("details").eq("id", prod["id"]).execute()
                    current_details = current.data[0].get("details", {}) if current.data else {}
                    merged = {**current_details, **details}
                    supabase.table("products").update({"details": merged}).eq("id", prod["id"]).execute()
                    updated_count += 1

    return {"message": f"Sync complete. Updated {updated_count} products."}