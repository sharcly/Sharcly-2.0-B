import bcrypt from "bcryptjs";
import { prisma } from "../src/common/lib/prisma";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const adminEmail = "admin@sharcly.com";
  const adminPassword = "admin@123";
  
  console.log(`Resetting password for ${adminEmail}...`);
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  
  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
  
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { 
      password: hashedPassword,
      roleId: adminRole?.id,
      isEmailVerified: true,
      isBlocked: false
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: "Super Admin",
      roleId: adminRole?.id || "",
      isEmailVerified: true
    }
  });
  
  console.log("✅ Admin password reset successfully.");
}

main().then(() => prisma.$disconnect());
