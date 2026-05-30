import prisma from '../src/lib/prisma';

const orderList = [
  { order: 1, text: 'BYU Mission Alignment' },
  { order: 2, text: 'Embracing Our Particularity' },
  { order: 3, text: 'Authentic Propaganda' },
  { order: 4, text: 'False Compromise' },
  { order: 5, text: 'Defying The Spiral Of Silence' },
  { order: 6, text: 'The Plague of Systemic Mediocrity' },
  { order: 7, text: 'Tempest-Tossed Men' },
  { order: 8, text: 'The Hollowness of' }, // Hollowness of Free Choice
  { order: 9, text: 'Reclaiming the Family' },
  { order: 10, text: 'Whose Land Is It Anyway' },
  { order: 11, text: 'Dispelling Darkness' },
  { order: 12, text: 'Virtue or Vice' }, // AI: Virtue or Vice
  { order: 13, text: 'Looking Back, Why I Stood Up' },
  { order: 14, text: 'Are Latter-day Saints Really Pro-Life' },
  { order: 15, text: 'Tragedy of The Rings of Power' },
  { order: 16, text: 'Rediscovery' }, // Review of Conservatism: A Rediscovery
  { order: 17, text: 'Where Will We Go' }
];

async function main() {
  console.log('Starting migration...');
  const printEditions = await prisma.printEdition.findMany({ include: { posts: true } });
  
  const vol1 = printEditions.find(p => p.title.includes('Volume 1') || p.title.includes('Vol. 1') || p.title.includes('VOL. 1'));
  
  if (!vol1) {
    console.log('Could not find Volume 1 print edition. Available:', printEditions.map(p => p.title));
    return;
  }
  
  console.log(`Found Print Edition: ${vol1.title} with ${vol1.posts.length} posts.`);
  
  let matches = 0;
  for (const item of orderList) {
    const post = vol1.posts.find(p => p.title.toLowerCase().includes(item.text.toLowerCase()));
    if (post) {
      console.log(`Matching: ${item.order} -> ${post.title}`);
      await prisma.post.update({
        where: { id: post.id },
        data: { printEditionOrder: item.order }
      });
      matches++;
    } else {
      console.log(`COULD NOT FIND POST FOR: ${item.text}`);
    }
  }
  
  console.log(`Migration complete. Matched ${matches} out of ${orderList.length}.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
