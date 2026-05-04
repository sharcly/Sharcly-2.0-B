import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('--- Setting up Super Admin ---');
  
  // 1. Upsert Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { slug: 'super_admin' },
    update: {
      name: 'Super Admin',
      description: 'Supreme access level with control over all system modules and analytics'
    },
    create: {
      name: 'Super Admin',
      slug: 'super_admin',
      description: 'Supreme access level with control over all system modules and analytics'
    },
  });
  console.log('Role:', superAdminRole.slug);

  // 2. Link all permissions
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { 
        roleId_permissionId: { 
          roleId: superAdminRole.id, 
          permissionId: perm.id 
        } 
      },
      update: {},
      create: { 
        roleId: superAdminRole.id, 
        permissionId: perm.id 
      },
    });
  }
  console.log('Linked all permissions.');

  // 3. Assign to user
  const userEmail = 'admin@sharcly.com';
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { roleId: superAdminRole.id }
    });
    console.log(`Updated user ${userEmail} to Super Admin.`);
  } else {
    // If user doesn't exist, maybe create it? 
    // The user didn't ask to create the user, just to assign the role.
    console.log(`User ${userEmail} not found.`);
  }

  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
