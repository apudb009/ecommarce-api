import { Command } from 'commander';
import { PrismaClient } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as readline from 'node:readline';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Options = {
  email?: string;
  password?: string;
};

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerResetPasswordCommand(program: Command) {
  program
    .command('password:reset')
    .description('Reset a user password by email')
    .option('-e, --email <email>', 'User email')
    .option('-p, --password <password>', 'New password')
    .action(async (options: Options) => {
      console.log('\n🔑  ShopApp — Reset Password\n');

      try {
        const email = options.email || (await prompt('Email:        '));
        const password = options.password || (await prompt('New Password: '));

        if (password.length < 8) {
          console.error('\n❌  Password must be at least 8 characters\n');
          process.exit(1);
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          console.error(`\n❌  No user found with email: ${email}\n`);
          process.exit(1);
        }

        const hashed = await bcrypt.hash(password, 10);

        await prisma.user.update({
          where: { email },
          data: { password: hashed },
        });

        console.log(
          `\n✅  Password reset for ${user.name || user.username} (${user.email})\n`,
        );
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.error(`\n❌  Error: ${error.message}\n`);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
