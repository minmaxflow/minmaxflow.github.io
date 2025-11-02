import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/posts';
import { format } from 'date-fns';
import { remark } from 'remark';
import html from 'remark-html';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post not found',
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

// 处理 MDX 内容（当作 Markdown 处理，但保留 .mdx 扩展名）
async function processMDXContent(slug: string) {
  const fs = require('fs');
  const matter = require('gray-matter');
  const path = require('path');

  const contentDirectory = path.join(process.cwd(), 'src/content');
  const fullPath = path.join(contentDirectory, `${slug}.mdx`);

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { content } = matter(fileContents);

  // 使用 remark 处理内容
  const result = await remark().use(html).process(content);
  return result.toString();
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const htmlContent = await processMDXContent(slug);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
        >
          ← Back to posts
        </Link>

        <article className="prose prose-lg max-w-none">
          <header className="mb-8 not-prose">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              {post.title}
            </h1>
            <time
              dateTime={post.date}
              className="text-sm text-gray-500"
            >
              {format(new Date(post.date), 'MMMM d, yyyy')}
            </time>
          </header>

          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </article>
      </main>
    </div>
  );
}