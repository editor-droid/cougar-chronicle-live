import fs from 'fs';
import prisma from './src/lib/prisma';

// Basic CSV line parser handling quotes
function parseCsvLine(text: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i+1] === '"') {
      current += '"';
      i++; // Skip escaped quote
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

  let updatedCount = 0;
  let notFoundCount = 0;

  const allPosts = await prisma.post.findMany({
    select: { id: true, title: true, views: true }
  });
  console.log(`Loaded ${allPosts.length} posts from database.`);

  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const columns = parseCsvLine(line.trim());
    const rawTitle = columns[0];
    const viewsStr = columns[1];
    
    if (!rawTitle || !viewsStr) continue;

    const views = parseInt(viewsStr.replace(/,/g, ''), 10);
    if (isNaN(views) || views === 0) continue;

    // Clean up title
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
      // Add GA views to any existing organic views we already started tracking today
      const finalViews = matchingPost.views + views;
      
      await prisma.post.update({
        where: { id: matchingPost.id },
        data: { views: finalViews } 
      });
      updatedCount++;
    } else {
      notFoundCount++;
    }
  }

  console.log(`\nDONE!`);
  console.log(`Successfully matched and updated views for ${updatedCount} articles.`);
  console.log(`Could not match ${notFoundCount} rows (these are likely pages, categories, or deleted posts).`);
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
