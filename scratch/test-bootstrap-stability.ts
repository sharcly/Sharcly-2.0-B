import { prisma } from "../src/common/lib/prisma";
import { bootstrap } from "../src/common/utils/bootstrap";

async function testBootstrapStability() {
  const email = (process.env.ADMIN_EMAIL || "admin@sharcly.com").toLowerCase().trim();
  
  console.log("1. Running bootstrap first time...");
  await bootstrap();
  const user1 = await prisma.user.findUnique({ where: { email } });
  const hash1 = user1?.password;
  console.log("Hash after 1st run:", hash1);

  console.log("\n2. Running bootstrap second time (should NOT change hash)...");
  await bootstrap();
  const user2 = await prisma.user.findUnique({ where: { email } });
  const hash2 = user2?.password;
  console.log("Hash after 2nd run:", hash2);

  if (hash1 === hash2) {
    console.log("\n✅ SUCCESS: Bootstrap is now stable!");
  } else {
    console.log("\n❌ FAILURE: Bootstrap STILL overwrites password!");
  }

  console.log("\n3. Testing FORCE_ADMIN_RESET...");
  process.env.FORCE_ADMIN_RESET = "true";
  await bootstrap();
  const user3 = await prisma.user.findUnique({ where: { email } });
  const hash3 = user3?.password;
  console.log("Hash after forced run:", hash3);

  if (hash1 !== hash3) {
    console.log("✅ SUCCESS: Force reset works!");
  } else {
    console.log("❌ FAILURE: Force reset did not change hash!");
  }
}

testBootstrapStability()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
