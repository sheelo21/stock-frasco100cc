
-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discount_rate NUMERIC(5,4) NOT NULL DEFAULT 0.6,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '発注済',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  model_number TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL DEFAULT '',
  color TEXT DEFAULT '',
  size TEXT DEFAULT '',
  price_with_tax INTEGER NOT NULL DEFAULT 0,
  price_without_tax INTEGER NOT NULL DEFAULT 0,
  discounted_price_with_tax INTEGER NOT NULL DEFAULT 0,
  discounted_price_without_tax INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update order items" ON public.order_items FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete order items" ON public.order_items FOR DELETE USING (true);
