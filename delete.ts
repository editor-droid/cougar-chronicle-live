import 'dotenv/config';
import prisma from './src/lib/prisma';

async function main() {
  const posts = await prisma.post.findMany({
    where: {
      title: {
        contains: 'Faith and Reason',
      }
    }
  });

  if (posts.length > 0) {
    for (const post of posts) {
      await prisma.post.delete({
        where: { id: post.id }
      });
      console.log('Deleted:', post.title);
    }
  } else {
    console.log('Post not found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
