
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
  const args = process.argv.slice(2);
  const search = args[0] || 'Gummies';
  
  console.log(`Searching for products matching: "${search}"`);
  
  const products = await prisma.product.findMany({
    where: {
      name: { contains: search, mode: 'insensitive' }
    },
    include: {
      images: { orderBy: { order: 'asc' } },
      variants: { orderBy: { createdAt: 'asc' } }
    },
    take: 5
  });

  if (products.length === 0) {
    console.log("No products found.");
    return;
  }

  for (const p of products) {
    console.log(`\n==================================================`);
    console.log(`PRODUCT: ${p.name} (${p.id})`);
    console.log(`--------------------------------------------------`);
    console.log(`GALLERY IMAGES:`);
    p.images.forEach((img, i) => {
      console.log(`  ${i}. ID: ${img.id} | Order: ${img.order} | Thumbnail: ${img.isThumbnail}`);
    });

    console.log(`--------------------------------------------------`);
    console.log(`VARIANTS:`);
    p.variants.forEach((v, i) => {
      const linkedImgIndex = p.images.findIndex(img => img.id === v.image);
      console.log(`  ${i}. ${v.title} | ImageID: ${v.image || 'NULL'} | Matches Gallery Index: ${linkedImgIndex !== -1 ? linkedImgIndex : 'NONE'}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
