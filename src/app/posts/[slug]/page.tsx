import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/posts';
import { format } from 'date-fns';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

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

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

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
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>
    </div>
  );
}