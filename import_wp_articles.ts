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
  console.log('Starting WordPress Article Import...');

  // 1. Fetch WP Categories
  console.log('Fetching WordPress Categories...');
  const catRes = await fetch(`${WP_API_URL}/categories?per_page=100`);
  const wpCategories = await catRes.json();
  const catMap = new Map(); // id -> name
  for (const cat of wpCategories) {
    catMap.set(cat.id, cat.name);
  }

  // 2. Fetch WP Authors
  console.log('Fetching WordPress Authors...');
  const authRes = await fetch(`${WP_API_URL}/users?per_page=100`);
  const wpAuthors = await authRes.json();
  const authMap = new Map(); // id -> name
  for (const auth of wpAuthors) {
    authMap.set(auth.id, auth.name);
  }

  // 3. Fetch All Posts (Pagination)
  let page = 1;
  let totalImported = 0;
  let totalSkipped = 0;
  
  while (true) {
    console.log(`Fetching Posts Page ${page}...`);
    const postsRes = await fetch(`${WP_API_URL}/posts?per_page=100&page=${page}`);
    if (!postsRes.ok) break; // End of pagination (400 Bad Request if page out of bounds)
    const posts = await postsRes.json();
    
    if (posts.length === 0) break;

    for (const post of posts) {
      // Check if post already exists
      const existingPost = await prisma.post.findUnique({
        where: { slug: post.slug }
      });

      if (existingPost) {
        totalSkipped++;
        continue;
      }

      // Resolve Category String
      let categoryName = 'News'; // Default
      if (post.categories && post.categories.length > 0) {
        categoryName = catMap.get(post.categories[0]) || 'News';
      }

      // Resolve Author
      let authorName = 'Cougar Chronicle Staff';
      if (post.author) {
        authorName = authMap.get(post.author) || 'Cougar Chronicle Staff';
      }

      // Upsert User (Author)
      let author = await prisma.user.findFirst({
        where: { name: { equals: authorName, mode: 'insensitive' }, role: 'WRITER' }
      });
      if (!author) {
        author = await prisma.user.create({
          data: {
            name: authorName,
            role: 'WRITER'
          }
        });
      }

      // Create Post
      await prisma.post.create({
        data: {
          title: post.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&#038;/g, "&").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"'),
          slug: post.slug,
          seoDescription: post.excerpt.rendered.replace(/<[^>]*>?/gm, '').replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&#038;/g, "&").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').substring(0, 200).trim(),
          content: post.content.rendered, // raw HTML
          imageUrl: '/images/default-article.jpg', // WP REST API requires a separate media fetch for this, default for now
          state: 'PUBLISHED',
          createdAt: new Date(post.date),
          updatedAt: new Date(post.modified),
          authorId: author.id,
          category: categoryName,
        }
      });
      
      console.log(`Imported: ${post.slug}`);
      totalImported++;
    }
    
    page++;
  }

  console.log(`\nImport Complete!`);
  console.log(`Successfully Imported: ${totalImported}`);
  console.log(`Skipped (Already Exists): ${totalSkipped}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
