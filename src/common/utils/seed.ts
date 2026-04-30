import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  // Create Admin
  await prisma.user.upsert({
    where: { email: "admin@sharcly.com" },
    update: {},
    create: {
      email: "admin@sharcly.com",
      password: hashedPassword,
      name: "Super Admin",
    },
  });

  // Create Category
  const category = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
    },
  });

  // Create Product
  await prisma.product.upsert({
    where: { slug: "premium-watch" },
    update: {},
    create: {
      name: "Premium Minimalist Watch",
      slug: "premium-watch",
      description: "A high-end minimalist watch for modern aesthetics.",
      price: 129.99,
      stock: 50,
      categoryId: category.id,
      images: {
        create: [
          { 
            data: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
            mimeType: "image/png"
          }
        ]
      },
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
