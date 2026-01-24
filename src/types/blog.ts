export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  category: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogCategory {
  name: string;
  count: number;
}
