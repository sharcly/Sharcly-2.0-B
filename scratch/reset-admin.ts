import bcrypt from "bcryptjs";
import { prisma } from "../src/common/lib/prisma";

async function resetAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@sharcly.com";
  const newPassword = process.env.ADMIN_PASSWORD || "admin@123";

  console.log(`Resetting password for admin: ${adminEmail}`);
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  try {
    const user = await prisma.user.update({
      where: { email: adminEmail },
      data: { password: hashedPassword },
    });
    console.log("✅ Admin password reset successfully!");
  } catch (error) {
    console.error("❌ Failed to reset admin password. Make sure the user exists.");
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
