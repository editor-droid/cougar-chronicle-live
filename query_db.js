const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.printEdition.findMany().then(res => console.log(res)).catch(e => console.error(e)).finally(() => prisma.$disconnect());
