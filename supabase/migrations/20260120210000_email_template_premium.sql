-- Create email_layouts table for consistent branding
CREATE TABLE IF NOT EXISTS public.email_layouts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    html_content text NOT NULL, -- Must contain {{content}} placeholder
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add layout_id to email_templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS layout_id uuid REFERENCES public.email_layouts(id);

-- Enable RLS
ALTER TABLE public.email_layouts ENABLE ROW LEVEL SECURITY;

-- Admin-only RLS Policies
CREATE POLICY "Admins can manage email layouts" 
ON public.email_layouts 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin')) 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure email_templates is also locked to admins
-- Note: SELECT might be needed by Edge Functions using service_role, handled automatically
CREATE POLICY "Admins can manage email templates" 
ON public.email_templates 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin')) 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed a Default Master Layout
INSERT INTO public.email_layouts (name, html_content, is_default)
VALUES (
    'Luxee Master Layout',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url("https://fonts.googleapis.com/css2?family=Georgia&display=swap");
        body { margin: 0; padding: 0; background-color: #f8f6f3; font-family: "Georgia", serif; color: #1a1a2e; }
        .wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 20px; text-align: center; }
        .logo { color: #d4af37; font-size: 28px; font-weight: bold; text-decoration: none; }
        .content-area { padding: 40px 30px; line-height: 1.6; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e6ebf1; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <a href="https://luxee.store" class="logo">LUXEE STORE</a>
        </div>
        <div class="content-area">
            {{content}}
        </div>
        <div class="footer">
            <p>© {{year}} Luxee Store. All rights reserved.</p>
            <p>123 Luxury Lane, Fashion District</p>
        </div>
    </div>
</body>
</html>',
    true
) ON CONFLICT (name) DO NOTHING;
