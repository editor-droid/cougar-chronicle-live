const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const posts = await prisma.post.findMany({ where: { title: { contains: 'Policy Changes', mode: 'insensitive' } } });
  if (posts.length > 0) {
    await prisma.post.delete({ where: { id: posts[0].id } });
    console.log('Deleted!');
  } else {
    console.log('Not found');
  }
}
main().finally(() => prisma.$disconnect());
