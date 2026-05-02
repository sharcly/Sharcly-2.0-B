import { prisma } from "../src/common/lib/prisma";
import { AuthService } from "../src/modules/auth/auth.service";

async function checkSequence() {
  const email = "admin@sharcly.com";
  const password = "Admin@123!";
  
  console.log("1. Initial State");
  const user1 = await prisma.user.findUnique({ where: { email } });
  console.log("Hash:", user1?.password);

  console.log("\n2. First Login");
  const login1 = await AuthService.login({ email, password });
  console.log("Login 1 Success");
  const user2 = await prisma.user.findUnique({ where: { email } });
  console.log("Hash:", user2?.password);

  console.log("\n3. Logout");
  await AuthService.logout(user2!.id);
  console.log("Logout Success");
  const user3 = await prisma.user.findUnique({ where: { email } });
  console.log("Hash:", user3?.password);

  console.log("\n4. Second Login");
  try {
    const login2 = await AuthService.login({ email, password });
    console.log("Login 2 Success");
  } catch (e: any) {
    console.error("Login 2 FAILED:", e.message);
  }
  const user4 = await prisma.user.findUnique({ where: { email } });
  console.log("Hash:", user4?.password);

  if (user1?.password !== user4?.password) {
      console.log("\n❌ FATAL: Hash changed during the process!");
  } else {
      console.log("\n✅ Hash remained stable.");
  }
}

checkSequence()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
