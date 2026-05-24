import { permanentRedirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';

export default async function LegacyArticleRedirect({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  
  // Look up if this slug belongs to a post
  const post = await prisma.post.findUnique({
    where: { slug }
  });

  if (post) {
    // Perform a 308 Permanent Redirect for SEO preservation
    permanentRedirect(getArticleUrl(post));
  }

  // If no post exists with this slug, and it didn't match any other routes, return a 404
  notFound();
}
