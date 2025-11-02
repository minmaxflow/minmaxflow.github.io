import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Post, PostMetadata } from './types';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'content/posts');

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

async function markdownToHtml(markdown: string) {
  const result = await remark().use(html).process(markdown);
  return result.toString();
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    const htmlContent = await markdownToHtml(content);

    return {
      slug,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt || '',
      content: htmlContent,
    };
  } catch {
    return null;
  }
}

export async function getAllPosts(): Promise<Post[]> {
  const slugs = getAllPostSlugs();
  const posts = await Promise.all(
    slugs.map(async ({ params }) => await getPostBySlug(params.slug))
  );

  return posts
    .filter((post): post is Post => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}