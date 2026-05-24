import prisma from './src/lib/prisma';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

async function main() {
  const csvPath = 'C:\\Users\\carte\\Downloads\\thecougarchronicle4-212502647-all.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  // Parse CSV
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  let imported = 0;
  let skipped = 0;

  console.log(`Found ${records.length} total rows in CSV...`);

  for (const record of records as Record<string, string>[]) {
    const email = record.Email?.trim();
    const status = record.Email_Subscriber?.trim();

    if (!email) continue;

    // Only import those who are marked as Subscribed
    if (status !== 'Subscribed') {
      skipped++;
      continue;
    }

    try {
      await prisma.subscriber.upsert({
        where: { email },
        update: {
          isActive: true, // Reactivate if they previously unsubscribed but are in this CSV as Subscribed
        },
        create: {
          email,
          isActive: true,
          wantsNews: true,
          wantsFaith: true,
          wantsOpinion: true,
        }
      });
      imported++;
    } catch (e) {
      console.error(`Failed to import ${email}:`, e);
    }
  }

  console.log(`\nImport complete!`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Skipped (Not Subscribed): ${skipped}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
