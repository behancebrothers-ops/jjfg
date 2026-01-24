export const generateProductSchema = (product: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `${product.name} from LUXE premium fashion collection`,
    "image": product.image_url || "https://luxurious-store.vercel.app/placeholder.svg",
    "brand": {
      "@type": "Brand",
      "name": "LUXE"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://luxurious-store.vercel.app/product/${product.id}`,
      "priceCurrency": "USD",
      "price": product.price,
      "availability": product.stock > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    },
    "category": product.category,
    "sku": product.id
  };
};