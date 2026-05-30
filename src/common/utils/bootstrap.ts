import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

export async function bootstrap() {
  console.log("🚀 Initializing system bootstrap...");

  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@sharcly.com";
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("❌ ADMIN_PASSWORD env var is not set. Skipping admin creation for security.");
      return;
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      console.log(`👤 Creating default admin: ${adminEmail}`);
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
      if (!adminRole) {
        console.error("❌ Cannot bootstrap: 'admin' role not found. Please run seed script first.");
        return;
      }

      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: "Super Admin",
          roleId: adminRole.id,
          isEmailVerified: true
        },
      });
      console.log("✅ Default admin created successfully.");
    } else {
      console.log("ℹ️ Admin already exists, updating password to match environment.");
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await prisma.user.update({
        where: { email: adminEmail },
        data: { password: hashedPassword }
      });
      console.log("✅ Admin password synchronized.");
    }

    // Manager Account
    const managerEmail = process.env.MANAGER_EMAIL || "manager@sharcly.com";
    const managerPassword = process.env.MANAGER_PASSWORD || "manager123";
    const existingManager = await prisma.user.findUnique({ where: { email: managerEmail } });
    if (!existingManager) {
      console.log(`👤 Creating default manager: ${managerEmail}`);
      const hashedPassword = await bcrypt.hash(managerPassword, 12);
      const managerRole = await prisma.role.findUnique({ where: { slug: "manager" } });
      if (managerRole) {
        await prisma.user.create({
          data: {
            email: managerEmail,
            password: hashedPassword,
            name: "Default Manager",
            roleId: managerRole.id,
            isEmailVerified: true
          },
        });
        console.log("✅ Default manager created successfully.");
      }
    }

    // User Account
    const userEmail = process.env.USER_EMAIL || "user@sharcly.com";
    const userPassword = process.env.USER_PASSWORD || "user123";
    const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!existingUser) {
      console.log(`👤 Creating default user: ${userEmail}`);
      const hashedPassword = await bcrypt.hash(userPassword, 12);
      const userRole = await prisma.role.findUnique({ where: { slug: "user" } });
      if (userRole) {
        await prisma.user.create({
          data: {
            email: userEmail,
            password: hashedPassword,
            name: "Default User",
            roleId: userRole.id,
            isEmailVerified: true
          },
        });
        console.log("✅ Default user created successfully.");
      }
    }


    // Ensure at least one category exists for a premium look
    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
      console.log("📁 Creating default categories...");
      await prisma.category.createMany({
        data: [
          { name: "Chill Series", slug: "series-chill", description: "Dial it down, stay in control." },
          { name: "Lift Series", slug: "series-lift", description: "Lock in with zero noise." },
          { name: "Balance Series", slug: "series-balance", description: "Stay steady, all day." },
          { name: "Entourage Series", slug: "series-entourage", description: "Whole plant, full effect." },
          { name: "Sleep Series", slug: "series-sleep", description: "Power down and drift easy." },
          { name: "Vape Series", slug: "series-vape", description: "Fast hits with a clean feel." },
        ],
      });
    }

    // Ensure some sample products exist
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      console.log("🛍️ Creating sample products...");
      const categories = await prisma.category.findMany();
      const chillCat = categories.find(c => c.slug === "series-chill");
      const sleepCat = categories.find(c => c.slug === "series-sleep");

      if (chillCat && sleepCat) {
        await prisma.product.createMany({
          data: [
            {
              name: "Original Chill Gummies",
              slug: "original-chill-gummies",
              description: "The perfect way to unwind after a long day.",
              price: 34.99,
              stock: 100,
              categoryId: chillCat.id,
            },
            {
              name: "Deep Sleep Tincture",
              slug: "deep-sleep-tincture",
              description: "Fall asleep faster and stay asleep longer.",
              price: 49.99,
              stock: 50,
              categoryId: sleepCat.id,
            }
          ]
        });
      }
    }

    // Ensure default SEO entries exist
    const seoCount = await prisma.seoMeta.count();
    if (seoCount === 0) {
      console.log("🔍 Creating default SEO meta...");
      await prisma.seoMeta.createMany({
        data: [
          {
            pageSlug: "home",
            title: "Scarly | Premium Lifestyle & Performance",
            description: "Experience the next generation of lifestyle performance. Clean, laboratory-verified, and ethically sourced.",
            ogTitle: "Scarly | Premium Lifestyle",
            ogDescription: "Clean, lab-verified performance essentials for the modern lifestyle.",
            keywords: "performance, wellness, lifestyle, premium"
          },
          {
            pageSlug: "products",
            title: "Shop Full Collection | Scarly Official",
            description: "Browse our complete range of premium botanical extracts and performance supplements.",
            ogTitle: "Shop Scarly Premium Collection",
            ogDescription: "The complete Scarly range, verified for purity and performance."
          }
        ]
      });
    }

    console.log("✨ Bootstrap completed successfully.");
  } catch (error) {
    console.error("❌ Bootstrap failed:", error);
  }
}

if (require.main === module) {
  bootstrap().then(() => prisma.$disconnect());
}

