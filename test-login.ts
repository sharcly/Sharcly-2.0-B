import { prisma } from "./src/common/lib/prisma";
import bcrypt from "bcryptjs";

async function testLogin() {
  const email = "admin@sharcly.com";
  const password = "Admin@123!";

  const user = await prisma.user.findUnique({
    where: { email },
    include: { userRole: true }
  });

  if (!user) {
    console.log("❌ User not found in DB");
    return;
  }

  console.log("✅ User found in DB:", user.email);
  console.log("👤 Role:", user.userRole?.slug);

  const isMatch = await bcrypt.compare(password, user.password);
  console.log("🔑 Password Match:", isMatch);
}

testLogin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
