
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_number text,
  ADD COLUMN IF NOT EXISTS model_number text,
  ADD COLUMN IF NOT EXISTS catalog_page text,
  ADD COLUMN IF NOT EXISTS parent_category text,
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS price_with_tax integer,
  ADD COLUMN IF NOT EXISTS price_without_tax integer,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false;
