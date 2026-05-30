import { PrismaClient } from '../src/generated/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Seeding Permissions ---');
  const permissions = [
    { name: 'View Products', slug: 'products.view', group: 'Products', description: 'Allows viewing of products and their details' },
    { name: 'Add Products', slug: 'products.create', group: 'Products', description: 'Allows adding new products to the store' },
    { name: 'Edit Products', slug: 'products.update', group: 'Products', description: 'Allows editing of existing product information' },
    { name: 'Delete Products', slug: 'products.delete', group: 'Products', description: 'Allows permanent removal of products' },
    { name: 'Categories', slug: 'categories.manage', group: 'Management', description: 'Full control over product categories' },
    { name: 'View Orders', slug: 'orders.view', group: 'Management', description: 'Allows viewing of customer orders' },
    { name: 'Manage Orders', slug: 'orders.manage', group: 'Management', description: 'Allows updating order status and shipping details' },
    { name: 'Blog Posts', slug: 'blogs.manage', group: 'Content', description: 'Full control over blog articles and news' },
    { name: 'Page Content', slug: 'cms.manage', group: 'Content', description: 'Allows editing of website pages and banners' },
    { name: 'Coupons', slug: 'coupons.manage', group: 'Content', description: 'Allows creation and management of discount codes' },
    { name: 'User Accounts', slug: 'users.manage', group: 'Management', description: 'Manage staff accounts and their permission levels' },
    { name: 'Store Settings', slug: 'settings.manage', group: 'Management', description: 'Manage general store settings and business info' },
    { name: 'Sales Stats', slug: 'dashboard.view', group: 'System', description: 'Allows viewing of store performance and analytics' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  console.log('--- Seeding Roles ---');
  const roles = [
    { name: 'Administrator', slug: 'admin', description: 'Total access to all system features' },
    { name: 'Manager', slug: 'manager', description: 'Manage products, orders and customers' },
    { name: 'Content Manager', slug: 'content_manager', description: 'Manage blogs and CMS content' },
    { name: 'User', slug: 'user', description: 'Default customer role' },
  ];

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { slug: r.slug },
      update: r,
      create: r,
    });

    // Assign permissions
    if (r.slug === 'admin') {
      const allPerms = await prisma.permission.findMany();
      for (const p of allPerms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id },
        });
      }
    } else if (r.slug === 'manager') {
      const managerPerms = ['products.view', 'products.create', 'products.update', 'orders.view', 'orders.manage', 'categories.manage', 'dashboard.view'];
      const perms = await prisma.permission.findMany({ where: { slug: { in: managerPerms } } });
      for (const p of perms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id },
        });
      }
    } else if (r.slug === 'content_manager') {
      const contentPerms = ['blogs.manage', 'cms.manage', 'products.view'];
      const perms = await prisma.permission.findMany({ where: { slug: { in: contentPerms } } });
      for (const p of perms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id },
        });
      }
    }
  }

  console.log('--- Assigning Admin Role to existing users ---');
  const adminRole = await prisma.role.findUnique({ where: { slug: 'admin' } });
  if (adminRole) {
    await prisma.user.updateMany({
      where: { email: { contains: 'admin' } }, 
      data: { roleId: adminRole.id }
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
