import { PrismaClient } from 'src/generated/prisma/client';
import {
  MODULES,
  ACTIONS,
  ADMIN_PERMISSIONS,
} from '../src/common/permissions/permissions.config';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('🌱 Seeding permissions...');

  // seed permissions
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action, description: `Can ${action} ${module}` },
      });
    }
  }

  console.log('🌱 Seeding permissions completed');

  console.log('🌱 Seeding admin role ...');

  // seed ADMIN role
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Full access', isSystem: true },
  });

  for (const perm of ADMIN_PERMISSIONS) {
    const [module, action] = perm.split(':');
    const permission = await prisma.permission.findUnique({
      where: { module_action: { module, action } },
    });
    if (!permission) continue;
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('✅ Seeding + admin role adding completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
