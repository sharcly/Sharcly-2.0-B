
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
  console.log("Starting auto-link of variant images...");
  
  const products = await prisma.product.findMany({
    include: {
      variants: {
        orderBy: { createdAt: 'asc' }
      },
      images: {
        orderBy: { order: 'asc' }
      }
    }
  });

  console.log(`Found ${products.length} products.`);

  for (const product of products) {
    console.log(`Processing product: ${product.name} (${product.id})`);
    
    if (product.variants.length === 0) {
      console.log("  No variants found. Skipping.");
      continue;
    }

    if (product.images.length === 0) {
      console.log("  No images found. Skipping.");
      continue;
    }

    let linkedCount = 0;
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      
      // If variant already has an image linked, skip it
      if (variant.image) {
        console.log(`  Variant ${i} (${variant.title}) already has image linked: ${variant.image}`);
        continue;
      }

      // If we have an image at this index in the gallery
      if (product.images[i]) {
        const image = product.images[i];
        console.log(`  Linking variant ${i} (${variant.title}) to image ${i} (ID: ${image.id})`);
        
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { image: image.id }
        });
        linkedCount++;
      }
    }
    console.log(`  Linked ${linkedCount} variants.`);
  }

  console.log("Auto-link process completed.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
