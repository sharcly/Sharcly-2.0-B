import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const variants = await prisma.productVariant.findMany({
    where: {
      OR: [
        { sku: null },
        { sku: "" }
      ]
    }
  });
  console.log("Variants with null or empty SKU:", variants.length);
  variants.forEach(v => {
    console.log(`ID: ${v.id}, SKU: "${v.sku}", ProductID: ${v.productId}`);
  });

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { sku: null },
        { sku: "" }
      ]
    }
  });
  console.log("Products with null or empty SKU:", products.length);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
