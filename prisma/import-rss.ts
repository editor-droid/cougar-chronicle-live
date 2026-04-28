import 'dotenv/config';
import Parser from 'rss-parser';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'dc:creator', 'category'],
  }
});

async function main() {
  console.log('Fetching RSS feed...');
  const feed = await parser.parseURL('https://thecougarchronicle.com/feed/');

  console.log(`Found ${feed.items.length} items. Importing...`);

  for (const item of feed.items) {
    const slug = item.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `post-${Date.now()}`;
    
    // Categorize based on WordPress tags/categories
    let mappedCategory = 'news';
    const categories = item.categories || [];
    const catStr = categories.join(' ').toLowerCase();
    
    if (catStr.includes('faith') || catStr.includes('lds') || catStr.includes('church')) {
      mappedCategory = 'faith';
    } else if (catStr.includes('opinion') || catStr.includes('editorial')) {
      mappedCategory = 'opinion';
    }

    const rawContent = item['content:encoded'] || item.content || '';
    
    // Extract Image URL
    const imgMatch = rawContent.match(/<img[^>]+src="([^">]+)"/);
    let imageUrl = imgMatch ? imgMatch[1] : null;

    // Clean up WordPress query strings on image URLs to get high res
    if (imageUrl) {
      imageUrl = imageUrl.split('?')[0]; 
    }

    // Extract Author
    const authorName = item.creator || item['dc:creator'] || 'Editorial Board';
    const authorEmail = `${authorName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@cougarchronicle.com`;
    
    const author = await prisma.user.upsert({
      where: { email: authorEmail },
      update: {},
      create: {
        email: authorEmail,
        name: authorName,
        role: 'WRITER'
      }
    });

    try {
      await prisma.post.upsert({
        where: { slug },
        update: {
          title: item.title || 'Untitled',
          content: rawContent,
          category: mappedCategory,
          imageUrl: imageUrl,
          authorId: author.id
        },
        create: {
          title: item.title || 'Untitled',
          slug,
          content: rawContent,
          category: mappedCategory,
          state: 'PUBLISHED',
          authorId: author.id,
          imageUrl: imageUrl,
          createdAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          views: Math.floor(Math.random() * 500)
        }
      });
      console.log(`Imported: ${item.title}`);
    } catch (e: any) {
      console.error(`Failed to import: ${item.title} - ${e.message}`);
    }
  }

  console.log('Import complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
