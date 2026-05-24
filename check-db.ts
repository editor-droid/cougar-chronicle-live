import prisma from './src/lib/prisma';

async function main() {
  const count = await prisma.subscriber.count();
  console.log(`\nTotal subscribers in database: ${count}`);
  
  const sample = await prisma.subscriber.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\nSample of 10 recently added subscribers:');
  console.table(sample.map(s => ({ 
    email: s.email, 
    isActive: s.isActive, 
    news: s.wantsNews, 
    faith: s.wantsFaith, 
    opinion: s.wantsOpinion 
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
