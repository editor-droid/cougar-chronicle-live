import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Fetching all posts from WordPress REST API...');
  let page = 1;
  let totalImported = 0;
  
  while (true) {
    console.log(`Fetching page ${page}...`);
    const res = await fetch(`https://thecougarchronicle.com/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=1`);
    if (!res.ok) {
      if (res.status === 400) {
        break; // Reached end of pagination
      }
      throw new Error(`Failed to fetch page ${page}: ${res.statusText}`);
    }
    
    const posts = await res.json();
    if (posts.length === 0) break;

    for (const post of posts) {
      const slug = post.slug || `post-${Date.now()}`;
      
      let mappedCategory = 'news';
      let catStr = '';
      if (post._embedded && post._embedded['wp:term']) {
         for (const termGroup of post._embedded['wp:term']) {
             for (const term of termGroup) {
                 catStr += term.name.toLowerCase() + ' ';
             }
         }
      }
      
      if (catStr.includes('faith') || catStr.includes('lds') || catStr.includes('church') || catStr.includes('religion')) {
        mappedCategory = 'faith';
      } else if (catStr.includes('opinion') || catStr.includes('editorial') || catStr.includes('op-ed') || catStr.includes('editorials')) {
        mappedCategory = 'opinion';
      }

      const rawContent = post.content.rendered || '';
      
      let imageUrl = null;
      if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0] && post._embedded['wp:featuredmedia'][0].source_url) {
        imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
      } else {
        const imgMatch = rawContent.match(/<img[^>]+src="([^">]+)"/);
        imageUrl = imgMatch ? imgMatch[1] : null;
      }

      if (imageUrl) {
        imageUrl = imageUrl.split('?')[0]; 
      }

      let authorName = 'Editorial Board';
      if (post._embedded && post._embedded.author && post._embedded.author[0] && post._embedded.author[0].name) {
          authorName = post._embedded.author[0].name;
      }
      
      const emailName = authorName.trim().toLowerCase().split(' ').join('.');
      const authorEmail = `${emailName}@thecougarchronicle.com`;
      
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
            title: post.title.rendered || 'Untitled',
            content: rawContent,
            category: mappedCategory,
            imageUrl: imageUrl,
            authorId: author.id
          },
          create: {
            title: post.title.rendered || 'Untitled',
            slug,
            content: rawContent,
            category: mappedCategory,
            state: 'PUBLISHED',
            authorId: author.id,
            imageUrl: imageUrl,
            createdAt: post.date ? new Date(post.date) : new Date(),
            views: Math.floor(Math.random() * 500)
          }
        });
        totalImported++;
      } catch (e: any) {
        console.error(`Failed to import: ${post.title.rendered} - ${e.message}`);
      }
    }
    
    page++;
  }

  console.log(`Import complete! Total imported: ${totalImported}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
