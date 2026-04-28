import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const author = await prisma.user.upsert({
    where: { email: 'editor@cougarchronicle.com' },
    update: {},
    create: {
      email: 'editor@cougarchronicle.com',
      name: 'Editorial Board',
      role: 'EDITOR',
    },
  });

  await prisma.post.upsert({
    where: { slug: 'modern-era-news' },
    update: {},
    create: {
      title: 'The Modern Era of News Delivery',
      slug: 'modern-era-news',
      content: '<p>A deep dive into how technology is reshaping our understanding of truth on campus and beyond. The digital age has brought us incredible access to information, but it has also fractured the unified reality that previous generations shared. As we navigate these new waters, the role of rigorous, principled journalism has never been more vital.</p>',
      category: 'news',
      state: 'PUBLISHED',
      authorId: author.id,
      views: 1500,
    },
  });
  
  await prisma.post.upsert({
    where: { slug: 'faith-and-reason' },
    update: {},
    create: {
      title: 'Faith and Reason in the 21st Century',
      slug: 'faith-and-reason',
      content: '<p>Exploring the intersection of modern scientific discovery and enduring gospel truths. Many assume that faith and intellect are fundamentally at odds, but a careful examination of our theology suggests otherwise. True intelligence is the glory of God, and seeking learning by study and by faith provides a holistic view of the universe.</p>',
      category: 'faith',
      state: 'PUBLISHED',
      authorId: author.id,
      views: 850,
    },
  });

  await prisma.post.upsert({
    where: { slug: 'policy-changes-capitol' },
    update: {},
    create: {
      title: 'Policy Changes at the Capitol',
      slug: 'policy-changes-capitol',
      content: '<p>What the latest legislative session means for Utah families and businesses. Lawmakers have introduced a sweeping set of bills aimed at addressing housing affordability and water conservation, two of the most pressing issues facing our rapidly growing state.</p>',
      category: 'news',
      state: 'PUBLISHED',
      authorId: author.id,
      views: 2100,
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
