import { generateProductSchema } from "@/lib/structuredDataProduct";

type ProductStructuredDataProps = {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category: string;
    stock: number;
  };
};

export const ProductStructuredData = ({ product }: ProductStructuredDataProps) => {
  const schema = generateProductSchema(product);
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};