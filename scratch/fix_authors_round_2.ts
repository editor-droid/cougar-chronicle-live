import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const correctAuthors = [
  { title: 'Editor’s Note', author: 'Jacob Christensen' },
  { title: 'BYU Mission Alignment', author: 'Professor Ralph Hancock' },
  { title: 'Embracing Our Particularity', author: 'Jacob Christensen' },
  { title: 'Authentic Propaganda', author: 'Jax McKinney' },
  { title: 'False Compromise', author: 'James Haymore' },
  { title: 'Defying The Spiral Of Silence', author: 'Greg Matsen' },
  { title: 'The Plague of Systemic Mediocrity', author: 'Logan Spears' },
  { title: 'Tempest-Tossed Men', author: 'Kimball Call' },
  { title: 'The Hollowness of', author: 'Mia Curry' },
  { title: 'Reclaiming the Family', author: 'Reagan Sumrall' },
  { title: 'Whose Land Is It Anyway', author: 'Emma Marcois Wilson' },
  { title: 'Dispelling Darkness', author: 'Ian Farris' },
  { title: 'Virtue or Vice', author: 'Adam Blake' },
  { title: 'Looking Back, Why I Stood Up', author: 'Thomas Stevenson' },
  { title: 'Are Latter-day Saints Really Pro-Life', author: 'Luke Hanson' },
  { title: 'Tragedy of The Rings of Power', author: 'Joseph Addington' },
  { title: 'Rediscovery', author: 'Jacob Fisher' },
  { title: 'Where Will We Go', author: 'Jacob Hansen' }
];

async function main() {
  const printEditions = await prisma.printEdition.findMany({ include: { posts: true } });
  const vol1 = printEditions.find(p => p.title.includes('Volume 1') || p.title.includes('Vol. 1') || p.title.includes('VOL. 1'));

  if (!vol1) {
    console.log('Could not find Volume 1 print edition.');
    return;
  }

  const dummyPassword = await bcrypt.hash('writer123', 10);

  for (const item of correctAuthors) {
    // Attempt to match the title
    const post = vol1.posts.find(p => p.title.toLowerCase().replace(/['‘’]/g, '').includes(item.title.toLowerCase().replace(/['‘’]/g, '')));
    
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
      console.log(`Updated author for: ${post.title} -> ${item.author}`);
    } else {
      console.log(`Could not find post matching: ${item.title}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
