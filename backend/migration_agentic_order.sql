-- Migration: Agentic Order-to-Payment Schema Extensions
-- Run this in Supabase SQL Editor to add new columns

-- 1. clients: add address and country
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country varchar(2);

-- 2. products: add cost_price, unit, origin_country; update threshold default
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit varchar(20);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin_country varchar(2);
ALTER TABLE public.products ALTER COLUMN threshold SET DEFAULT 10;

-- 3. invoice_items: add unit, origin_country, unit_price
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS unit varchar(20);
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS origin_country varchar(2);
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS unit_price numeric;

-- 4. invoices: add notes field for shipping terms (e.g. "FOB Port Klang")
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;

-- 5. invoice_items: add product_id FK to link line items to tracked products
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  NOT VALID;

-- 6. Stored procedure for atomic inventory updates (avoids race conditions)
CREATE OR REPLACE FUNCTION public.adjust_inventory(p_product_id uuid, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_val integer;
BEGIN
  UPDATE public.products
  SET inventory = GREATEST(0, inventory + p_delta),
      updated_at = now()
  WHERE id = p_product_id
  RETURNING inventory INTO new_val;
  RETURN new_val;
END;
$$;
