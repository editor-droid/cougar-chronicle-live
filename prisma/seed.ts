import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('securepassword123', 10);

  // 1. Seed Core Editorial Board (ADMIN)
  const author = await prisma.user.upsert({
    where: { email: 'editor@thecougarchronicle.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'editor@thecougarchronicle.com',
      name: 'Editorial Board',
      role: 'ADMIN',
      password: hashedPassword,
    },
  });

  // 2. Seed Reagan Sumrall (ADMIN)
  await prisma.user.upsert({
    where: { email: 'reagan.sumrall@thecougarchronicle.com' },
    update: { password: hashedPassword, role: 'ADMIN' },
    create: {
      email: 'reagan.sumrall@thecougarchronicle.com',
      name: 'Reagan Sumrall',
      role: 'ADMIN',
      password: hashedPassword,
    },
  });

  // 3. Seed Section Editor (EDITOR / REVIEWER)
  await prisma.user.upsert({
    where: { email: 'reviewer@thecougarchronicle.com' },
    update: { password: hashedPassword, role: 'EDITOR' },
    create: {
      email: 'reviewer@thecougarchronicle.com',
      name: 'Section Editor',
      role: 'EDITOR',
      password: hashedPassword,
    },
  });

  // 4. Seed WordPress Team Members (WRITERS / CONTRIBUTORS)
  const teamMembers = [
    { name: 'Jackson Gallini', email: 'jackson.gallini@thecougarchronicle.com' },
    { name: 'Jacob Christensen', email: 'jacob.christensen@thecougarchronicle.com' },
    { name: 'James Haymore', email: 'james.haymore@thecougarchronicle.com' },
    { name: 'Jax McKinney', email: 'jax.mckinney@thecougarchronicle.com' },
    { name: 'Jonah Deforge', email: 'jonah.deforge@thecougarchronicle.com' },
    { name: 'Joshua Beck', email: 'joshua.beck@thecougarchronicle.com' },
    { name: 'Juliet Ingram', email: 'juliet.ingram@thecougarchronicle.com' },
    { name: 'Kai Schwemmer', email: 'kai.schwemmer@thecougarchronicle.com' },
    { name: 'Keating Mitchell', email: 'keating.mitchell@thecougarchronicle.com' },
    { name: 'Kimball Call', email: 'kimball.call@thecougarchronicle.com' },
    { name: 'Nathan Andersen', email: 'nathan.andersen@thecougarchronicle.com' },
    { name: 'Paige Huleis', email: 'paige.huleis@thecougarchronicle.com' },
    { name: 'Ramona Andersen', email: 'ramona.andersen@thecougarchronicle.com' },
    { name: 'Vera Smith', email: 'vera.smith@thecougarchronicle.com' },
  ];

  for (const member of teamMembers) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: {
        role: 'WRITER',
      },
      create: {
        email: member.email,
        name: member.name,
        role: 'WRITER',
        password: hashedPassword,
      },
    });
  }

  // 5. Seed Core Articles
  await prisma.post.upsert({
    where: { slug: 'modern-era-news' },
    update: {},
    create: {
      title: 'The Modern Era of News Delivery',
      slug: 'modern-era-news',
      content: '<p>A deep dive into how technology is reshaping our understanding of truth on campus and beyond. The digital age has brought us incredible access to information, but it has also fractured the unified reality that previous generations shared. As we navigate these new waters, the role of principled journalism has never been more vital.</p>',
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

  console.log('Database seeded successfully with all team members!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
