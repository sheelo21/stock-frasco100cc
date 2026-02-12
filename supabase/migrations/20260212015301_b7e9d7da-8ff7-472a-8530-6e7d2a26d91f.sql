
CREATE TABLE public.dropdown_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(type, value)
);

ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view options"
  ON public.dropdown_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert options"
  ON public.dropdown_options FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update options"
  ON public.dropdown_options FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete options"
  ON public.dropdown_options FOR DELETE
  TO authenticated
  USING (true);
