export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  image_url: string | null;
  is_featured: boolean | null;
  is_new_arrival: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
  price_adjustment: number | null;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  position: number | null;
  created_at: string | null;
}

export interface ProductWithImages extends Product {
  product_images: ProductImage[];
}

export interface ProductWithVariants extends Product {
  product_variants: ProductVariant[];
}

export interface ProductFull extends Product {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

export interface ProductView {
  id: string;
  product_id: string;
  user_id: string | null;
  session_id: string | null;
  viewed_at: string;
  created_at: string;
}
