import { prisma } from "../src/common/lib/prisma";
import { AuthService } from "../src/modules/auth/auth.service";

async function checkHashChange() {
  const email = "admin@sharcly.com";
  
  const userBefore = await prisma.user.findUnique({ where: { email } });
  console.log("Hash before login:", userBefore?.password);

  try {
    // Perform login (this calls generateTokens which updates the user)
    await AuthService.login({ email, password: "Admin@123!" });
    console.log("Login successful");
  } catch (e) {
    console.error("Login failed:", e);
  }

  const userAfter = await prisma.user.findUnique({ where: { email } });
  console.log("Hash after login: ", userAfter?.password);

  if (userBefore?.password !== userAfter?.password) {
    console.log("❌ HASH CHANGED!");
  } else {
    console.log("✅ Hash remains the same");
  }
}

checkHashChange()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
