import { Command } from 'commander';
import { PrismaClient, Role } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Options = {
  role?: string;
  limit?: string;
};

export function registerListUsersCommand(program: Command) {
  program
    .command('user:list')
    .description('List all users')
    .option('-r, --role <role>', 'Filter by role: ADMIN or CUSTOMER')
    .option('-l, --limit <limit>', 'Max users to show', '20')
    .action(async (options: Options) => {
      try {
        const users = await prisma.user.findMany({
          where: options.role
            ? { role: options.role.toUpperCase() as Role }
            : undefined,
          take: Number(options.limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });

        if (users.length === 0) {
          console.log('\nNo users found\n');
          process.exit(0);
        }

        console.log(`\n👥  Users (${users.length}):\n`);
        console.log('─'.repeat(85));
        console.log(
          'ID   '.padEnd(6) +
            'Name'.padEnd(22) +
            'Username'.padEnd(18) +
            'Email'.padEnd(30) +
            'Role',
        );
        console.log('─'.repeat(85));

        users.forEach((u) => {
          console.log(
            String(u.id).padEnd(6) +
              (u.name || '—').substring(0, 20).padEnd(22) +
              u.username.substring(0, 16).padEnd(18) +
              u.email.substring(0, 28).padEnd(30) +
              u.role,
          );
        });

        console.log('─'.repeat(85));
        console.log(`Total: ${users.length} users\n`);
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.error(`\n❌  Error: ${error.message}\n`);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
