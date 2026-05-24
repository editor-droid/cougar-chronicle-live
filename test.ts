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
  const fileContent = fs.readFileSync('C:\\Users\\carte\\Downloads\\Pages_and_screens_Page_title_and_screen_class (1).csv', 'utf8');
  const lines = fileContent.split('\n');
  const line = lines[10].trim(); // The first data line
  console.log('RAW LINE:', line);
  
  const columns = parseCsvLine(line);
  console.log('COLUMNS:', columns);

  const rawTitle = columns[0];
  const viewsStr = columns[1];
  console.log('Raw Title:', rawTitle);
  console.log('Views Str:', viewsStr);
  
  let cleanTitle = rawTitle.replace(' - The Cougar Chronicle', '').trim();
  cleanTitle = cleanTitle.replace(' - Nexus News', '').trim();
  cleanTitle = cleanTitle.replace(/^"|"$/g, '').trim(); 
  
  console.log('Clean Title:', cleanTitle);

  const allPosts = await prisma.post.findMany({select: {id: true, title: true, views: true}});
  
  let matchingPost = allPosts.find((p: any) => p.title.trim() === cleanTitle);
  console.log('Exact match:', !!matchingPost);
  
  if (!matchingPost) {
    const normalize = (str: string) => str.toLowerCase().replace(/['"“”‘’\-—:.,\s]/g, '');
    const normalizedClean = normalize(cleanTitle);
    matchingPost = allPosts.find((p: any) => normalize(p.title) === normalizedClean);
    console.log('Fuzzy match:', !!matchingPost);
  }
  
  console.log('Final views to add:', parseInt(viewsStr.replace(/,/g, ''), 10));
}
run();
