import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import prisma from './src/lib/prisma';

async function seed() {
  const data = JSON.parse(fs.readFileSync('articles.json', 'utf8'));

  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    console.log("No user found in DB");
    return;
  }

  for (const article of data) {
    await prisma.post.upsert({
      where: { slug: article.slug },
      update: {},
      create: {
        title: article.title,
        slug: article.slug,
        category: 'Opinion',
        content: article.content,
        customAuthor: article.customAuthor,
        isPremium: true,
        state: 'DRAFT',
        authorId: defaultUser.id,
      }
    });
    console.log(`Seeded: ${article.title}`);
  }
  
  console.log("Finished seeding articles!");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
