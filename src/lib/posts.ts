import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Post, PostMetadata } from './types';

const postsDirectory = path.join(process.cwd(), 'src/content');

export function getAllPostSlugs() {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames.map((name) => {
    return {
      params: {
        slug: name.replace(/\.mdx$/, ''),
      },
    };
  });
}

export function getPostBySlug(slug: string): Post | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt || '',
      content: '', // Next.js 将直接处理 MDX 内容
    };
  } catch {
    return null;
  }
}

export function getAllPosts(): Post[] {
  const slugs = getAllPostSlugs();
  const posts = slugs
    .map(({ params }) => getPostBySlug(params.slug))
    .filter((post): post is Post => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}