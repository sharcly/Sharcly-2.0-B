
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const productId = 'a2f03132-6bf7-4f34-87ba-170d5f303ab8';
  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { order: 'asc' },
    select: { id: true, order: true, isThumbnail: true }
  });
  console.log("Images for product:", productId);
  console.log(JSON.stringify(images, null, 2));

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, image: true }
  });
  console.log("Variants for product:", productId);
  console.log(JSON.stringify(variants, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
