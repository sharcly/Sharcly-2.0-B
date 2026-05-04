const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- Adding Sales Analytics Permission ---');
  
  const permission = await prisma.permission.upsert({
    where: { slug: 'sales.view' },
    update: {
      name: 'Sales Analytics',
      group: 'Analytics',
      description: 'Full access to sales performance, regional data, and revenue trends'
    },
    create: {
      name: 'Sales Analytics',
      slug: 'sales.view',
      group: 'Analytics',
      description: 'Full access to sales performance, regional data, and revenue trends'
    },
  });

  console.log('Permission created/updated:', permission.slug);

  const adminRole = await prisma.role.findUnique({ where: { slug: 'admin' } });
  if (adminRole) {
    await prisma.rolePermission.upsert({
      where: { 
        roleId_permissionId: { 
          roleId: adminRole.id, 
          permissionId: permission.id 
        } 
      },
      update: {},
      create: { 
        roleId: adminRole.id, 
        permissionId: permission.id 
      },
    });
    console.log('Assigned to Admin role.');
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
