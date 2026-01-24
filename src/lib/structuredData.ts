/**
 * Utility functions to generate JSON-LD structured data for SEO
 */

interface OrganizationSchema {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  logo: string;
  description: string;
  contactPoint: {
    "@type": string;
    telephone: string;
    contactType: string;
    email: string;
    availableLanguage: string[];
  };
  sameAs: string[];
}

interface ProductSchema {
  "@context": string;
  "@type": string;
  name: string;
  image: string[];
  description: string;
  sku: string;
  brand: {
    "@type": string;
    name: string;
  };
  offers: {
    "@type": string;
    url: string;
    priceCurrency: string;
    price: string;
    availability: string;
    priceValidUntil: string;
  };
  aggregateRating?: {
    "@type": string;
    ratingValue: string;
    reviewCount: string;
  };
}

interface BreadcrumbSchema {
  "@context": string;
  "@type": string;
  itemListElement: Array<{
    "@type": string;
    position: number;
    name: string;
    item?: string;
  }>;
}

export const generateOrganizationSchema = (): OrganizationSchema => {
  const baseUrl = "https://luxurious-store.vercel.app";
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LUXE Premium Fashion",
    url: baseUrl,
    logo: `${baseUrl}/assets/hero-banner-BXWkFNj9.jpg`,
    description: "Discover timeless pieces that define modern elegance. Premium fashion clothing and accessories.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-555-LUXE-SHOP",
      contactType: "Customer Service",
      email: "contact@luxefashion.com",
      availableLanguage: ["English"]
    },
    sameAs: [
      "https://facebook.com/luxefashion",
      "https://instagram.com/luxefashion",
      "https://twitter.com/luxefashion"
    ]
  };
};

export const generateProductSchema = (
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    stock: number;
  },
  additionalImages: string[] = [],
  aggregateRating?: { rating: number; count: number }
): ProductSchema => {
  const baseUrl = "https://luxurious-store.vercel.app";
  const productUrl = `${baseUrl}/products/${product.id}`;
  
  // Prepare images array
  const images = [
    product.image_url || `${baseUrl}/placeholder.svg`,
    ...additionalImages
  ].filter(Boolean);
  
  // Determine availability based on stock
  const availability = product.stock > 0 
    ? "https://schema.org/InStock" 
    : "https://schema.org/OutOfStock";
  
  // Price valid for 1 year from now
  const priceValidUntil = new Date();
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);
  
  const schema: ProductSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: product.description || `Premium ${product.name} from LUXE Fashion`,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "LUXE"
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "USD",
      price: product.price.toFixed(2),
      availability,
      priceValidUntil: priceValidUntil.toISOString().split('T')[0]
    }
  };
  
  // Add aggregate rating if available
  if (aggregateRating && aggregateRating.count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.rating.toFixed(1),
      reviewCount: aggregateRating.count.toString()
    };
  }
  
  return schema;
};

export const generateBreadcrumbSchema = (
  items: Array<{ name: string; url?: string }>
): BreadcrumbSchema => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url })
    }))
  };
};

/**
 * Helper to create structured data script element
 * Use this in useEffect or component render
 */
export const createStructuredDataScript = (data: any, id: string): HTMLScriptElement => {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.text = JSON.stringify(data);
  script.id = id;
  return script;
};
