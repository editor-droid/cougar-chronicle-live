import prisma from '../src/lib/prisma';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const authorsList = [
  { title: 'BYU Mission Alignment', author: 'Professor Ralph Hancock' },
  { title: 'Embracing Our Particularity', author: 'Jacob Christensen' },
  { title: 'Authentic Propaganda', author: 'Jax McKinney' },
  { title: 'False Compromise', author: 'James Haymore' },
  { title: 'Defying The Spiral Of Silence', author: 'Greg Matsen' },
  { title: 'The Plague of Systemic Mediocrity', author: 'Logan Spears' },
  { title: 'Tempest-Tossed Men', author: 'Michael Orton' },
  { title: 'The Hollowness of', author: 'Professor Ralph Hancock' },
  { title: 'Reclaiming the Family', author: 'Luke Bowman' },
  { title: 'Whose Land Is It Anyway', author: 'Luke Hanson' },
  { title: 'Dispelling Darkness', author: 'Ian Farris' },
  { title: 'Virtue or Vice', author: 'Thomas Jex' },
  { title: 'Looking Back, Why I Stood Up', author: 'Thomas Rogers' },
  { title: 'Are Latter-day Saints Really Pro-Life', author: 'Gabriel R. Sanchez' },
  { title: 'Tragedy of The Rings of Power', author: 'C.S. Johnson' },
  { title: 'Rediscovery', author: 'Samuel Benson' },
  { title: 'Where Will We Go', author: 'Ben Pectol' }
];

async function main() {
  const printEditions = await prisma.printEdition.findMany({ include: { posts: true } });
  const vol1 = printEditions.find(p => p.title.includes('Volume 1') || p.title.includes('Vol. 1') || p.title.includes('VOL. 1'));

  if (!vol1) {
    console.log('Could not find Volume 1 print edition.');
    return;
  }

  const dummyPassword = await bcrypt.hash('writer123', 10);

  for (const item of authorsList) {
    const post = vol1.posts.find(p => p.title.toLowerCase().includes(item.title.toLowerCase()));
    
    if (post) {
      // Find or create user
      let user = await prisma.user.findFirst({
        where: { name: item.author }
      });

      if (!user) {
        const emailSlug = item.author.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/(^\.|\.$)/g, '');
        const email = `${emailSlug}@writers.thecougarchronicle.com`;
        
        let existingEmail = await prisma.user.findUnique({ where: { email } });
        if (!existingEmail) {
          user = await prisma.user.create({
            data: {
              name: item.author,
              email: email,
              password: dummyPassword,
              role: 'WRITER'
            }
          });
          console.log(`Created user for ${item.author}`);
        } else {
          user = existingEmail;
        }
      }

      await prisma.post.update({
        where: { id: post.id },
        data: {
          customAuthor: item.author,
          authorId: user.id
        }
      });
      console.log(`Updated author for: ${post.title}`);
    } else {
      console.log(`Could not find post matching: ${item.title}`);
    }
  }

  // Now, let's fix the formatting for "Dispelling Darkness"
  try {
    const html = fs.readFileSync('scratch/final_doc.html', 'utf8');
    
    // We'll search for identifying strings in the mammoth output.
    // Mammoth usually outputs pure paragraphs without indentation.
    const startString = "Ian is a recent graduate from Brigham Young University";
    const endString = "find the beacons necessary to dispel it.</p>";
    
    let startIndex = html.indexOf(startString);
    if (startIndex !== -1) {
       // Look back to the closest <p>
       const pStart = html.lastIndexOf('<p', startIndex);
       if (pStart !== -1) startIndex = pStart;
    }
    
    let endIndex = html.indexOf(endString);
    if (endIndex !== -1) {
       endIndex += endString.length;
    }
    
    if (startIndex !== -1 && endIndex !== -1) {
       const articleHtml = html.substring(startIndex, endIndex);
       
       const dispellingPost = vol1.posts.find(p => p.title.toLowerCase().includes('dispelling darkness'));
       if (dispellingPost) {
         await prisma.post.update({
           where: { id: dispellingPost.id },
           data: { content: articleHtml }
         });
         console.log('Successfully updated content for Dispelling Darkness with correct HTML formatting.');
       }
    } else {
      console.log('Could not extract article HTML from mammoth output. Start:', startIndex, 'End:', endIndex);
    }
  } catch(e) {
    console.error('Error extracting HTML formatting:', e);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
