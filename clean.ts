import 'dotenv/config';
import prisma from './src/lib/prisma';

async function clean() {
  await prisma.post.deleteMany({
    where: { slug: { in: ['modern-era-news', 'faith-and-reason', 'policy-changes-capitol'] } }
  });
  
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  const seen = new Set();
  const duplicates = [];
  
  for (const p of posts) {
    if (seen.has(p.title)) {
      duplicates.push(p.id);
    } else {
      seen.add(p.title);
    }
  }
  
  if (duplicates.length > 0) {
    await prisma.post.deleteMany({
      where: { id: { in: duplicates } }
    });
  }
  
  console.log('Cleaned 3 filler articles and ' + duplicates.length + ' duplicates');
}

clean().catch(console.error).finally(() => prisma.$disconnect());
