import 'dotenv/config';
import prisma from '../../src/lib/prisma';

async function main() {
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      isPremium: true,
      printEditionId: true,
      state: true
    }
  });
  console.log('Total posts in database:', posts.length);
  for (const post of posts) {
    const isPrint = !!post.printEditionId;
    const type = isPrint ? 'print' : (post.isPremium ? 'premium' : 'regular');
    console.log(`- Slug: ${post.slug} | Title: "${post.title}" | Type: ${type} | State: ${post.state}`);
  }
  await prisma.$disconnect();
}

main();
