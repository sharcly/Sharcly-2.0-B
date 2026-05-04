const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function main() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const pool = new Pool({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const slug = 'schar10';
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: true,
      images: {
        select: { id: true, order: true, isThumbnail: true }
      },
      category: true
    }
  });

  console.log('--- PRODUCT DATA START ---');
  console.log(JSON.stringify(product, null, 2));
  console.log('--- PRODUCT DATA END ---');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
