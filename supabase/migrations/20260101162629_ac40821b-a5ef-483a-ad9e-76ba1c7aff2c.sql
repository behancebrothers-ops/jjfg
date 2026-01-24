-- Create advertisements table for flyer popups
CREATE TABLE public.advertisements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  display_frequency TEXT DEFAULT 'once_per_session', -- once_per_session, once_per_day, always
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active advertisements"
ON public.advertisements
FOR SELECT
USING (active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "Admins can manage advertisements"
ON public.advertisements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add more sample banners to sale_banners
INSERT INTO public.sale_banners (title, subtitle, badge, bg_gradient, icon_type, cta_text, cta_link, position, active)
VALUES 
  ('Flash Sale', 'Up to 70% Off - Limited Time Only!', 'HOT DEAL', 'from-rose-500 via-pink-500 to-purple-500', 'flame', 'Shop Flash Sale', '/sale', 1, true),
  ('New Arrivals', 'Fresh Styles Just Dropped', 'NEW', 'from-emerald-500 via-teal-500 to-cyan-500', 'sparkles', 'Explore New', '/new-arrivals', 2, true),
  ('Free Shipping', 'On Orders Over PKR 3000', 'PROMO', 'from-blue-500 via-indigo-500 to-violet-500', 'truck', 'Learn More', '/shipping-info', 3, true),
  ('Members Only', 'Extra 15% Off for Subscribers', 'EXCLUSIVE', 'from-amber-500 via-orange-500 to-red-500', 'crown', 'Join Now', '/auth', 4, true);