import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import { localStorage, STORAGE_KEYS } from "@/lib/storage";

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

const MAX_RECENTLY_VIEWED = 8;

export const RecentlyViewed = () => {
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  const allProducts = [
    { id: 1, name: "Classic White Tee", price: 49, image: product1, category: "Basics" },
    { id: 2, name: "Denim Jacket", price: 129, image: product2, category: "Outerwear" },
    { id: 3, name: "Cotton Hoodie", price: 89, image: product3, category: "Hoodies" },
  ];

  useEffect(() => {
    const viewedIds = localStorage.getJSON<number[]>(STORAGE_KEYS.RECENTLY_VIEWED, []);
    const products = viewedIds
      .map((id: number) => allProducts.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, MAX_RECENTLY_VIEWED);
    setRecentProducts(products);
  }, []);

  if (recentProducts.length === 0) return null;

  return (
    <div className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Recently Viewed</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {recentProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const addToRecentlyViewed = (productId: number) => {
  const viewedIds = localStorage.getJSON<number[]>(STORAGE_KEYS.RECENTLY_VIEWED, []);
  const filteredIds = viewedIds.filter((id: number) => id !== productId);
  const newIds = [productId, ...filteredIds].slice(0, MAX_RECENTLY_VIEWED);
  localStorage.setJSON(STORAGE_KEYS.RECENTLY_VIEWED, newIds);
};
