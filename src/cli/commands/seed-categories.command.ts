import { Command } from 'commander';
import { PrismaClient } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEFAULT_CATEGORIES = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Phones, laptops, gadgets',
  },
  { name: 'Clothing', slug: 'clothing', description: 'Fashion for all' },
  {
    name: 'Books',
    slug: 'books',
    description: 'Fiction, non-fiction, educational',
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Furniture, decor, garden tools',
  },
  { name: 'Sports', slug: 'sports', description: 'Equipment and sportswear' },
  { name: 'Beauty', slug: 'beauty', description: 'Skincare, makeup, haircare' },
  { name: 'Toys', slug: 'toys', description: 'Games and toys for all ages' },
  { name: 'Food', slug: 'food', description: 'Gourmet foods and drinks' },
];

type Options = {
  force: boolean;
};

export function registerSeedCategoriesCommand(program: Command) {
  program
    .command('categories:seed')
    .description('Seed default product categories')
    .option('--force', 'Upsert even if category already exists')
    .action(async (options: Options) => {
      console.log('\n📁  ShopApp — Seed Categories\n');

      try {
        let created = 0;
        let skipped = 0;

        for (const cat of DEFAULT_CATEGORIES) {
          if (options.force) {
            await prisma.category.upsert({
              where: { slug: cat.slug },
              update: { name: cat.name, description: cat.description },
              create: cat,
            });
            console.log(`  ✅  Upserted: ${cat.name}`);
            created++;
          } else {
            const exists = await prisma.category.findFirst({
              where: { slug: cat.slug },
            });

            if (exists) {
              console.log(`  ⏭️   Skipped: ${cat.name} (already exists)`);
              skipped++;
            } else {
              await prisma.category.create({ data: cat });
              console.log(`  ✅  Created: ${cat.name}`);
              created++;
            }
          }
        }

        console.log(`\n📊  Summary: ${created} created, ${skipped} skipped\n`);
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.error(`\n❌  Error: ${error.message}\n`);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
