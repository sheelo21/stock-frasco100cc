
-- Add doc_type column to orders table
ALTER TABLE public.orders ADD COLUMN doc_type text NOT NULL DEFAULT '発注書';

-- Update existing orders: set doc_type based on status
UPDATE public.orders SET doc_type = '納品書' WHERE status = '納品済';

-- Remove status column as it's being replaced by doc_type
-- Keep status for now but change default
