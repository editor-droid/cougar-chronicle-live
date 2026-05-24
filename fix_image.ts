import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixArticle() {
  const slug = 'why-kirks-assassin-deserves-the-death-penalty';
  
  // Fetch from WP
  console.log('Fetching post info for slug: ' + slug);
  const res = await fetch('https://thecougarchronicle.com/wp-json/wp/v2/posts?slug=' + slug);
  const posts = await res.json();
  const post = posts[0];
  
  if (post && post.featured_media) {
    console.log('Fetching media info for ID: ' + post.featured_media);
    const mediaRes = await fetch('https://thecougarchronicle.com/wp-json/wp/v2/media/' + post.featured_media);
    const media = await mediaRes.json();
    if (media && media.source_url) {
      await prisma.post.update({
        where: { slug },
        data: { imageUrl: media.source_url }
      });
      console.log('Fixed image: ' + media.source_url);
    } else {
      console.log('No media source URL found. Media object: ', media);
    }
  } else {
    console.log('No featured media ID found for post.');
  }
}

fixArticle()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
