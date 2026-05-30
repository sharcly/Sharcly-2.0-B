import bcrypt from "bcryptjs";
import { prisma } from "./src/common/lib/prisma";
import dotenv from "dotenv";

dotenv.config();

async function resetAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@sharcly.com";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("ADMIN_PASSWORD not set in .env");
    return;
  }

  console.log(`Resetting password for ${email}...`);
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
    console.log("✅ Admin password reset successfully!");
  } catch (error) {
    console.error("❌ Failed to reset password. Make sure the user exists.");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
