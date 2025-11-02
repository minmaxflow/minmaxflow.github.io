export interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
}

export interface PostMetadata {
  title: string;
  date: string;
  excerpt?: string;
}