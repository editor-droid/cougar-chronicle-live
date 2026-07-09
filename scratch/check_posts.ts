import prisma from '../src/lib/prisma';

async function main() {
  const posts = await prisma.post.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 5,
    select: { id: true, title: true, state: true, publishedAt: true, category: true }
  });
  console.log("Current Server Time:", new Date());
  console.log("Recent posts:");
  console.table(posts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
