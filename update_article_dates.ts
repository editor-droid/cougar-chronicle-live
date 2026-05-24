import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const WP_API_URL = 'https://thecougarchronicle.com/wp-json/wp/v2';

async function main() {
  console.log('Starting WordPress Date Sync...');

  let page = 1;
  let totalUpdated = 0;
  
  while (true) {
    console.log(`Fetching Posts Page ${page}...`);
    const postsRes = await fetch(`${WP_API_URL}/posts?per_page=100&page=${page}`);
    if (!postsRes.ok) break; 
    const posts = await postsRes.json();
    
    if (posts.length === 0) break;

    for (const post of posts) {
      const updateResult = await prisma.post.updateMany({
        where: { slug: post.slug },
        data: {
          createdAt: new Date(post.date),
          updatedAt: new Date(post.modified),
          publishedAt: new Date(post.date) // Also sync the publishedAt date!
        }
      });
      
      if (updateResult.count > 0) {
        totalUpdated += updateResult.count;
      }
    }
    
    page++;
  }

  console.log(`\nDate Sync Complete!`);
  console.log(`Successfully Updated Dates for: ${totalUpdated} articles`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
