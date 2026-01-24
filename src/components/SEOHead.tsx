import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  structuredData?: object;
  noIndex?: boolean;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const BASE_URL = "https://luxee-store.vercel.app";
const DEFAULT_IMAGE = `${BASE_URL}/assets/hero-banner-BXWkFNj9.jpg`;
const SITE_NAME = "LUXEES Premium Fashion";

/**
 * SEO Head component for managing page-level meta tags
 * Updates document head with meta tags for SEO and social sharing
 */
export const SEOHead = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  structuredData,
  noIndex = false,
  author,
  publishedTime,
  modifiedTime,
}: SEOHeadProps) => {
  const fullTitle = title.includes("LUXEES") ? title : `${title} | ${SITE_NAME}`;
  const fullCanonical = canonicalUrl?.startsWith("http") ? canonicalUrl : `${BASE_URL}${canonicalUrl || ""}`;
  const truncatedDescription = description.length > 160 ? description.substring(0, 157) + "..." : description;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Basic meta tags
    updateMeta("description", truncatedDescription);
    if (keywords) updateMeta("keywords", keywords);
    if (author) updateMeta("author", author);
    
    // Robots meta
    if (noIndex) {
      updateMeta("robots", "noindex, nofollow");
    } else {
      updateMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    }
    updateMeta("googlebot", noIndex ? "noindex, nofollow" : "index, follow");

    // Open Graph
    updateMeta("og:title", fullTitle, true);
    updateMeta("og:description", truncatedDescription, true);
    updateMeta("og:type", ogType, true);
    updateMeta("og:url", fullCanonical, true);
    updateMeta("og:image", ogImage, true);
    updateMeta("og:image:width", "1200", true);
    updateMeta("og:image:height", "630", true);
    updateMeta("og:image:alt", fullTitle, true);
    updateMeta("og:site_name", SITE_NAME, true);
    updateMeta("og:locale", "en_US", true);

    // Article specific Open Graph
    if (ogType === "article") {
      if (publishedTime) updateMeta("article:published_time", publishedTime, true);
      if (modifiedTime) updateMeta("article:modified_time", modifiedTime, true);
      if (author) updateMeta("article:author", author, true);
    }

    // Twitter Card
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:site", "@luxeesfashion");
    updateMeta("twitter:creator", "@luxeesfashion");
    updateMeta("twitter:title", fullTitle);
    updateMeta("twitter:description", truncatedDescription);
    updateMeta("twitter:image", ogImage);
    updateMeta("twitter:image:alt", fullTitle);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", fullCanonical);

    // Structured Data
    if (structuredData) {
      const existingScript = document.getElementById("page-structured-data");
      if (existingScript) existingScript.remove();

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "page-structured-data";
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Cleanup
    return () => {
      const script = document.getElementById("page-structured-data");
      if (script) script.remove();
    };
  }, [fullTitle, truncatedDescription, keywords, fullCanonical, ogImage, ogType, structuredData, noIndex, author, publishedTime, modifiedTime]);

  return null;
};

/**
 * Generate WebPage structured data
 */
export const generateWebPageSchema = (params: {
  name: string;
  description: string;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${params.url}#webpage`,
  name: params.name,
  description: params.description,
  url: params.url,
  inLanguage: "en-US",
  isPartOf: {
    "@id": `${BASE_URL}/#website`,
  },
  potentialAction: {
    "@type": "ReadAction",
    target: [params.url],
  },
});

/**
 * Generate FAQ structured data
 */
export const generateFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${BASE_URL}/faq#faqpage`,
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

/**
 * Generate BreadcrumbList structured data
 */
export const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
  })),
});

/**
 * Generate LocalBusiness/ClothingStore structured data
 */
export const generateLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  "@id": `${BASE_URL}/#organization`,
  name: SITE_NAME,
  description: "Discover timeless pieces that define modern elegance. Premium fashion clothing and accessories for men, women, and kids.",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: DEFAULT_IMAGE,
    width: 1200,
    height: 630,
  },
  image: DEFAULT_IMAGE,
  priceRange: "$$",
  currenciesAccepted: "PKR",
  paymentAccepted: "Credit Card, Debit Card, Cash on Delivery",
  address: {
    "@type": "PostalAddress",
    streetAddress: "123 Fashion Avenue",
    addressLocality: "Lahore",
    addressRegion: "Punjab",
    postalCode: "54000",
    addressCountry: "PK",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 31.5204,
    longitude: 74.3587,
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+92-300-LUXEES",
    contactType: "customer service",
    email: "contact@luxees.com",
    availableLanguage: ["English", "Urdu"],
  },
  sameAs: [
    "https://facebook.com/luxeesfashion",
    "https://instagram.com/luxeesfashion",
    "https://twitter.com/luxeesfashion",
    "https://pinterest.com/luxeesfashion",
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "LUXEES Fashion Collection",
    itemListElement: [
      { "@type": "OfferCatalog", name: "Men's Fashion" },
      { "@type": "OfferCatalog", name: "Women's Fashion" },
      { "@type": "OfferCatalog", name: "Kids Fashion" },
      { "@type": "OfferCatalog", name: "Accessories" },
      { "@type": "OfferCatalog", name: "Shoes" },
    ],
  },
});

/**
 * Generate Product structured data
 */
export const generateProductSchema = (product: {
  name: string;
  description: string;
  image: string;
  price: number;
  salePrice?: number;
  currency?: string;
  sku?: string;
  brand?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  category?: string;
  rating?: number;
  reviewCount?: number;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": `${product.url}#product`,
  name: product.name,
  description: product.description,
  image: product.image,
  sku: product.sku || product.name.toLowerCase().replace(/\s+/g, "-"),
  brand: {
    "@type": "Brand",
    name: product.brand || "LUXEES",
  },
  category: product.category,
  offers: {
    "@type": "Offer",
    url: product.url,
    priceCurrency: product.currency || "PKR",
    price: product.salePrice || product.price,
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    availability: `https://schema.org/${product.availability || "InStock"}`,
    seller: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  },
  ...(product.rating && product.reviewCount && {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
  }),
});

/**
 * Generate Article/BlogPosting structured data
 */
export const generateArticleSchema = (article: {
  headline: string;
  description: string;
  image: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  url: string;
  category?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": `${article.url}#article`,
  headline: article.headline,
  description: article.description,
  image: article.image,
  author: {
    "@type": "Person",
    name: article.author,
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    logo: {
      "@type": "ImageObject",
      url: DEFAULT_IMAGE,
    },
  },
  datePublished: article.datePublished,
  dateModified: article.dateModified || article.datePublished,
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": article.url,
  },
  articleSection: article.category,
});

/**
 * Generate CollectionPage structured data for product listings
 */
export const generateCollectionSchema = (params: {
  name: string;
  description: string;
  url: string;
  products?: Array<{ name: string; url: string; image: string; price: number }>;
}) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${params.url}#collection`,
  name: params.name,
  description: params.description,
  url: params.url,
  isPartOf: {
    "@id": `${BASE_URL}/#website`,
  },
  ...(params.products && params.products.length > 0 && {
    mainEntity: {
      "@type": "ItemList",
      itemListElement: params.products.slice(0, 10).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          url: product.url,
          image: product.image,
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "PKR",
          },
        },
      })),
    },
  }),
});

/**
 * Generate SearchAction structured data for site search
 */
export const generateSearchActionSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  name: SITE_NAME,
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});