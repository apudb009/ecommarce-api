import { Command } from 'commander';

const program = new Command();

program
  .name('Ecommerce App CLI')
  .description('ShopApp CLI — manage your store from the terminal')
  .version('1.0.0');

// ── import and register each command ──────────────
import { registerCreateAdminCommand } from './commands/create-admin.command';
import { registerListUsersCommand } from './commands/list-users.command';
import { registerResetPasswordCommand } from './commands/reset-password.command';
import { registerSeedCategoriesCommand } from './commands/seed-categories.command';
import { registerSeedProductsCommand } from './commands/seed-products.command';

registerCreateAdminCommand(program);
registerListUsersCommand(program);
registerResetPasswordCommand(program);
registerSeedCategoriesCommand(program);
registerSeedProductsCommand(program);

program.parse(process.argv);
