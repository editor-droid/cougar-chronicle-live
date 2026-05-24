import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching articles missing key insights...');
  
  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { keyInsights: null },
        { keyInsights: '' }
      ],
      state: 'PUBLISHED'
    },
    select: {
      id: true,
      title: true,
      content: true,
      slug: true
    }
  });

  console.log(`Found ${posts.length} articles that need Key Insights.`);

  let count = 0;
  for (const post of posts) {
    count++;
    console.log(`[${count}/${posts.length}] Generating insights for: ${post.slug}`);
    
    try {
      if (!post.content) {
        console.log(`Skipping ${post.slug} - no content`);
        continue;
      }

      const cleanContent = post.content.replace(/<[^>]*>?/gm, ' ').substring(0, 5000);

      const { text } = await generateText({
        model: google('gemini-3.5-flash'),
        prompt: `You are an expert journalist and editor. Extract the 3 most important key takeaways or insights from the following article.
        
        Format your response STRICTly as an HTML unordered list (<ul>) with three list items (<li>). 
        Do NOT include any markdown formatting, backticks, or text outside of the <ul> tags.
        Keep each point concise (1-2 sentences).
        
        Article Title: ${post.title}
        
        Article Content:
        ${cleanContent}
        `
      });

      // Ensure it's just the HTML
      let html = text.trim();
      if (html.startsWith('```html')) {
        html = html.replace(/```html/g, '').replace(/```/g, '').trim();
      }

      await prisma.post.update({
        where: { id: post.id },
        data: { keyInsights: html }
      });
      
      // Delay to respect API rate limits
      await sleep(2000);

    } catch (e) {
      console.error(`Failed to generate insights for ${post.slug}:`, e);
      // Wait longer on error (potential rate limit)
      await sleep(5000);
    }
  }

  console.log('\nFinished generating all Key Insights!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
