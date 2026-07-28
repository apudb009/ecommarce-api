import { Command } from 'commander';
import { PrismaClient } from 'src/generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Options = {
  email: string;
  name: string;
  username: string;
  password: string;
};

// helper — prompt input
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

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';

    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        process.exit();
      } else if (char === '\u007F') {
        // backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + '*'.repeat(password.length));
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };

    process.stdin.on('data', onData);
  });
}

// ← export register function
export function registerCreateAdminCommand(program: Command) {
  program
    .command('admin:create')
    .description('Create a new admin user interactively')
    .option('-e, --email <email>', 'Admin email')
    .option('-n, --name <name>', 'Admin name')
    .option('-u, --username <username>', 'Admin username')
    .option('-p, --password <password>', 'Admin password')
    .action(async (options: Options) => {
      console.log('\n🛒  ShopApp — Create Admin\n');

      try {
        const email = options.email || (await prompt('Email:    '));
        const name = options.name || (await prompt('Name:     '));
        const username = options.username || (await prompt('Username: '));
        const password = options.password || (await promptHidden('Password: '));

        // ── validate ─────────────────────────────────
        if (!email || !name || !username || !password) {
          console.error('\n❌  All fields are required\n');
          process.exit(1);
        }

        if (password.length < 8) {
          console.error('\n❌  Password must be at least 8 characters\n');
          process.exit(1);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          console.error('\n❌  Invalid email format\n');
          process.exit(1);
        }

        // ── check existing ───────────────────────────
        const existing = await prisma.user.findFirst({
          where: { OR: [{ email }, { username }] },
        });

        if (existing) {
          const conflict = existing.email === email ? 'Email' : 'Username';
          console.error(`\n❌  ${conflict} already exists\n`);
          process.exit(1);
        }

        // ── create ───────────────────────────────────
        const hashed = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
          data: { email, name, username, password: hashed, role: 'ADMIN' },
        });

        console.log(`
        ✅  Admin created successfully!

            ID:       ${user.id}
            Name:     ${user.name}
            Email:    ${user.email}
            Username: ${user.username}
            Role:     ${user.role}
        `);
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.error(`\n❌  Failed: ${error.message}\n`);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
