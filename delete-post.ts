import 'dotenv/config';
import prisma from './src/lib/prisma';

async function main() {
  const posts = await prisma.post.findMany({ where: { title: { contains: 'The Modern Era of News Delivery', mode: 'insensitive' } } });
  if (posts.length > 0) {
    await prisma.post.delete({ where: { id: posts[0].id } });
    console.log('Deleted!');
  } else {
    console.log('Not found');
  }
}
main().finally(() => process.exit(0));
