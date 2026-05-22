import prisma from './src/lib/prisma';

async function main() {
  try {
    const result = await prisma.subscriber.upsert({
      where: { email: 'test@updates.thecougarchronicle.com' },
      update: { isActive: true, name: undefined },
      create: { email: 'test@updates.thecougarchronicle.com', name: null }
    });
    console.log('Upsert successful:', result);
  } catch (err) {
    console.error('Upsert failed:', err);
  } finally {
    // DO nothing
  }
}

main();
