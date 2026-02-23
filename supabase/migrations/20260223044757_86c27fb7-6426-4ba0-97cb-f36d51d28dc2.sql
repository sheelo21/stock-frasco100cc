
-- Add discount_rate column to profiles for client users
ALTER TABLE public.profiles ADD COLUMN discount_rate numeric DEFAULT NULL;

-- Allow admins to update any profile (for setting discount_rate)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
