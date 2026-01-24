-- Add stripe_enabled column to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stripe_enabled boolean DEFAULT false;

-- Create sale_settings table for global sale configuration
CREATE TABLE IF NOT EXISTS public.sale_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_navbar_visible boolean DEFAULT false,
  sale_active boolean DEFAULT false,
  sale_title text,
  sale_subtitle text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create sale_banners table for promotional banners
CREATE TABLE IF NOT EXISTS public.sale_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  cta_text text DEFAULT 'Shop Now',
  cta_link text DEFAULT '/sale',
  bg_gradient text DEFAULT 'from-red-500 via-orange-500 to-amber-500',
  badge text,
  icon_type text DEFAULT 'zap',
  position integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_banners ENABLE ROW LEVEL SECURITY;

-- Policies for sale_settings
CREATE POLICY "Anyone can view sale settings"
ON public.sale_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage sale settings"
ON public.sale_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies for sale_banners
CREATE POLICY "Anyone can view active banners"
ON public.sale_banners FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage sale banners"
ON public.sale_banners FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default sale settings row
INSERT INTO public.sale_settings (sale_navbar_visible, sale_active, sale_title, sale_subtitle)
VALUES (true, false, 'Flash Sale', 'Up to 50% OFF — Limited Time Only!')
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at on sale_settings
CREATE TRIGGER update_sale_settings_updated_at
BEFORE UPDATE ON public.sale_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on sale_banners
CREATE TRIGGER update_sale_banners_updated_at
BEFORE UPDATE ON public.sale_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();