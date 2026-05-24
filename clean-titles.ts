import prisma from './src/lib/prisma';

// Map of common HTML entities found in WordPress exports or scraped data
const entities: Record<string, string> = {
  '&#8216;': "'", // Left single quote
  '&#8217;': "'", // Right single quote
  '&#8220;': '"', // Left double quote
  '&#8221;': '"', // Right double quote
  '&#8211;': '-', // En dash
  '&#8212;': '—', // Em dash
  '&#038;': '&',
  '&amp;': '&',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&#160;': ' ', // Non-breaking space
  '&nbsp;': ' ',
};

function decodeHtmlEntities(text: string) {
  if (!text) return text;
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    // Regex to match globally
    const regex = new RegExp(entity, 'g');
    decoded = decoded.replace(regex, char);
  }
  return decoded;
}

async function run() {
  console.log('Fetching all posts...');
  const posts = await prisma.post.findMany({
    select: { id: true, title: true }
  });

  let updatedCount = 0;

  for (const post of posts) {
    const cleanTitle = decodeHtmlEntities(post.title);
    
    if (cleanTitle !== post.title) {
      await prisma.post.update({
        where: { id: post.id },
        data: { title: cleanTitle }
      });
      updatedCount++;
      console.log(`Fixed: "${cleanTitle}"`);
    }
  }

  console.log(`\nDONE! Cleaned up HTML entities in ${updatedCount} titles.`);
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
