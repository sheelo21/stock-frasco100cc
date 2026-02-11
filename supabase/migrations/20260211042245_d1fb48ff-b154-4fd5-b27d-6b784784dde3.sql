-- Allow authenticated users to delete products
CREATE POLICY "Authenticated users can delete products"
ON public.products
FOR DELETE
USING (true);
