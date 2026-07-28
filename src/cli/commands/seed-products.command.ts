import { Command } from 'commander';
import { PrismaClient } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Options = {
  force: boolean;
  dryRun: boolean;
  skipErrors: boolean;
};

type Record = {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  isActive: string;
  category?: string;
};

type SeedOptions = {
  path: string;
  dryRun: boolean;
  skipErrors: boolean;
  count: string;
  images: string;
};

export function registerSeedProductsCommand(program: Command) {
  // ── seed dummy products ────────────────────────
  program
    .command('products:seed')
    .description('Seed dummy products for testing')
    .option('-c, --count <count>', 'Products per category', '5')
    .action(async (options: SeedOptions) => {
      console.log('\n📦  ShopApp — Seed Products\n');

      try {
        const categories = await prisma.category.findMany();

        if (categories.length === 0) {
          console.error(
            '❌  No categories found. Run categories:seed first.\n',
          );
          process.exit(1);
        }

        const count = Number(options.count);
        let created = 0;

        for (const category of categories) {
          for (let i = 1; i <= count; i++) {
            const name = `${category.name} Product ${i}`;
            const slug = `${category.slug}-product-${i}-${Date.now()}`;

            await prisma.product.create({
              data: {
                name,
                slug,
                description: `Sample ${category.name.toLowerCase()} product ${i}`,
                price: Number((Math.random() * 200 + 10).toFixed(2)),
                stock: Math.floor(Math.random() * 100) + 10,
                isActive: true,
                categoryId: category.id,
              },
            });

            console.log(`  ✅  Created: ${name}`);
            created++;
          }
        }

        console.log(
          `\n✅  Seeded ${created} products across ${categories.length} categories\n`,
        );
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.error(`\n❌  Error: ${error.message}\n`);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  // ── import from CSV ────────────────────────────
  program
    .command('products:import <file>')
    .description('Import products from a CSV file')
    .option('--dry-run', 'Preview without saving')
    .option('--skip-errors', 'Continue on row errors')
    .action(async (file: string, options: Options) => {
      console.log('\n📦  ShopApp — Import Products\n');

      const filePath = path.resolve(process.cwd(), file);

      if (!fs.existsSync(filePath)) {
        console.error(`❌  File not found: ${filePath}\n`);
        process.exit(1);
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const records: Record[] = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });

        console.log(
          `📄  Found ${records.length} rows in ${path.basename(filePath)}`,
        );
        if (options.dryRun) {
          console.log('🔍  DRY RUN — no data will be saved\n');
        }

        const categories = await prisma.category.findMany();
        const categoryMap = new Map(
          categories.map((c) => [c.name.toLowerCase(), c.id]),
        );

        let success = 0;
        let failed = 0;
        let skipped = 0;

        for (let i = 0; i < records.length; i++) {
          const row = records[i];
          const rowNum = i + 2;

          try {
            if (!row.name || !row.slug || !row.price) {
              throw new Error('Missing required: name, slug, price');
            }

            if (isNaN(Number(row.price))) {
              throw new Error(`Invalid price: "${row.price}"`);
            }

            const categoryId = row.category
              ? categoryMap.get(row.category.toLowerCase())
              : null;

            if (row.category && !categoryId) {
              throw new Error(`Category not found: "${row.category}"`);
            }

            const existing = await prisma.product.findFirst({
              where: { slug: row.slug },
            });

            if (existing) {
              console.log(
                `  ⏭️   Row ${rowNum}: Skipped "${row.name}" (slug exists)`,
              );
              skipped++;
              continue;
            }

            const data = {
              name: row.name,
              slug: row.slug,
              description: row.description || null,
              price: Number(row.price),
              stock: Number(row.stock) || 0,
              isActive: row.isActive !== 'false',
              categoryId: categoryId!,
            };

            if (options.dryRun) {
              console.log(
                `  🔍  Row ${rowNum}: Would create "${row.name}" ($${data.price}, stock: ${data.stock})`,
              );
            } else {
              await prisma.product.create({ data });
              console.log(`  ✅  Row ${rowNum}: Created "${row.name}"`);
            }

            success++;
          } catch (error: any) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            console.error(`  ❌  Row ${rowNum}: ${error.message}`);
            failed++;

            if (!options.skipErrors) {
              console.error('\n💥  Stopped. Use --skip-errors to continue.\n');
              process.exit(1);
            }
          }
        }

        console.log(`
          📊  Import Summary:
              ✅  Success: ${success}
              ⏭️   Skipped: ${skipped}
              ❌  Failed:  ${failed}
              📄  Total:   ${records.length}
          ${options.dryRun ? '\n⚠️   DRY RUN — run without --dry-run to actually import\n' : ''}
        `);
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.error(`\n❌  Error: ${error.message}\n`);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
