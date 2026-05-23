const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function seed() {
  const data = JSON.parse(fs.readFileSync('articles.json', 'utf8'));

  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    console.log("No user found in DB");
    return;
  }

  const edition = await prisma.printEdition.create({
    data: {
      title: 'Volume 1: Standing For Something',
      pdfUrl: `${process.env.CLOUDFLARE_PUBLIC_URL}/Final_with_covers.pdf`,
      coverImageUrl: 'https://pub-7540640451dd48c6af04cad9907c1784.r2.dev/vol1_cover.jpg',
      isActive: true
    }
  });

  for (const article of data) {
    await prisma.post.upsert({
      where: { slug: article.slug },
      update: {
        printEditionId: edition.id
      },
      create: {
        title: article.title,
        slug: article.slug,
        category: 'Opinion',
        content: article.content,
        customAuthor: article.customAuthor,
        isPremium: true,
        state: 'PUBLISHED',
        authorId: defaultUser.id,
        printEditionId: edition.id
      }
    });
    console.log(`Seeded: ${article.title}`);
  }
  
  console.log("Finished seeding articles!");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
