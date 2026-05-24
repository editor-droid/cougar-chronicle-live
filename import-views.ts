import fs from 'fs';
import prisma from './src/lib/prisma';

function parseCsvLine(text: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i+1] === '"') {
      current += '"';
      i++; 
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function run() {
  console.log('Reading CSV...');
  const fileContent = fs.readFileSync('C:\\Users\\carte\\Downloads\\Pages_and_screens_Page_title_and_screen_class (1).csv', 'utf8');
  
  const lines = fileContent.split('\n');
  let headerIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Page title and screen class')) {
      headerIndex = i;
      break;
    }
  }

  const dataLines = lines.slice(headerIndex + 1);

  const allPosts = await prisma.post.findMany({
    select: { id: true, title: true, views: true }
  });
  console.log(`Loaded ${allPosts.length} posts from database.`);

  const accumulatedViews: Record<string, number> = {};

  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const columns = parseCsvLine(line.trim());
    const rawTitle = columns[0];
    const viewsStr = columns[1];
    
    if (!rawTitle || !viewsStr) continue;

    const views = parseInt(viewsStr.replace(/,/g, ''), 10);
    if (isNaN(views) || views === 0) continue;

    let cleanTitle = rawTitle.replace(' - The Cougar Chronicle', '').trim();
    cleanTitle = cleanTitle.replace(' - Nexus News', '').trim();
    cleanTitle = cleanTitle.replace(/^"|"$/g, '').trim(); 

    if (cleanTitle === 'Home' || cleanTitle.includes('Archives') || cleanTitle.includes('Category:') || cleanTitle === 'Contact Us' || cleanTitle === 'About Us' || cleanTitle === 'Donate') {
      continue;
    }

    let matchingPost = allPosts.find((p: any) => p.title.trim() === cleanTitle);

    if (!matchingPost) {
      const normalize = (str: string) => str.toLowerCase().replace(/['"“”‘’\-—:.,\s]/g, '');
      const normalizedClean = normalize(cleanTitle);
      matchingPost = allPosts.find((p: any) => normalize(p.title) === normalizedClean);
    }

    if (matchingPost) {
      if (!accumulatedViews[matchingPost.id]) accumulatedViews[matchingPost.id] = 0;
      accumulatedViews[matchingPost.id] += views;
    }
  }

  let updatedCount = 0;
  // Now apply the accumulated views to the DB!
  for (const postId of Object.keys(accumulatedViews)) {
    const originalPost = allPosts.find((p: any) => p.id === postId);
    if (originalPost) {
      // NOTE: Because the previous script completely botched the views (it set them to small numbers),
      // we should just overwrite them with the accumulated views from the CSV (which is historical + accurate).
      // We will assume the CSV views are the single source of truth for historical views.
      await prisma.post.update({
        where: { id: postId },
        data: { views: accumulatedViews[postId] }
      });
      updatedCount++;
    }
  }

  console.log(`\nDONE!`);
  console.log(`Successfully accumulated and updated views for ${updatedCount} unique articles.`);
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
