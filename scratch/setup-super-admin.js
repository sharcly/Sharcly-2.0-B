const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Creating Super Admin Role & Assigning to User ---');
  
  // 1. Create or Update Super Admin Role
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
  console.log('Role Created/Updated:', superAdminRole.slug);

  // 2. Link ALL Permissions to Super Admin
  const allPermissions = await prisma.permission.findMany();
  console.log(`Linking ${allPermissions.length} permissions to Super Admin...`);
  
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
  console.log('All permissions linked.');

  // 3. Find user and assign role
  const userEmail = 'admin@sharcly.com';
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { roleId: superAdminRole.id }
    });
    console.log(`User ${userEmail} now has Super Admin role.`);
  } else {
    console.log(`Warning: User ${userEmail} not found. Role created but not assigned.`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error during execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
