import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';
import { format } from 'date-fns';

export default async function Home() {
  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto px-6 py-16">
        <header className="mb-16">
          <h1 className="text-3xl font-light text-gray-900 mb-2">
            Blog
          </h1>
          <p className="text-gray-600">
            Minimal thoughts on software and life.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {posts.map((post) => (
              <article key={post.slug} className="border-b border-gray-100 pb-12">
                <Link href={`/posts/${post.slug}`} className="group block">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <time dateTime={post.date}>
                      {format(new Date(post.date), 'MMMM d, yyyy')}
                    </time>
                  </div>
                  <h2 className="text-xl font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-gray-600 leading-relaxed">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
