import { prisma } from "../src/common/lib/prisma";
import bcrypt from "bcryptjs";

async function masterDiagnose() {
  console.log("--- STARTING MASTER DIAGNOSIS ---");

  // 1. Check for duplicate emails with different casing
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  const emailMap = new Map<string, string[]>();

  allUsers.forEach(u => {
    const low = u.email.toLowerCase();
    if (!emailMap.has(low)) emailMap.set(low, []);
    emailMap.get(low)!.push(u.email);
  });

  console.log("\n[1] Checking for Duplicate/Case-sensitive Emails:");
  let foundDup = false;
  for (const [low, emails] of emailMap.entries()) {
    if (emails.length > 1) {
      console.log(`❌ DUPLICATE FOUND: '${low}' has entries: ${emails.join(", ")}`);
      foundDup = true;
    }
  }
  if (!foundDup) console.log("✅ No duplicate emails found (case-insensitive).");

  // 2. Check a specific user (if exists)
  const targetEmail = "osama2.jet@gmail.com";
  console.log(`\n[2] Checking specific user: ${targetEmail}`);
  const user = await prisma.user.findUnique({ where: { email: targetEmail } });

  if (user) {
    console.log(`   Found: ID=${user.id}, Name=${user.name}`);
    console.log(`   Hash: ${user.password}`);
    const saltInfo = user.password.substring(0, 7);
    console.log(`   Salt Version: ${saltInfo} (Should be $2a$10$ or $2a$12$)`);
    
    // Test common password
    const testPass = "osama@@Kgn95";
    const match = await bcrypt.compare(testPass, user.password);
    console.log(`   Bcrypt Match ('${testPass}'): ${match}`);
  } else {
    console.log(`   User '${targetEmail}' not found in DB.`);
  }

  console.log("\n--- DIAGNOSIS COMPLETE ---");
}

masterDiagnose().catch(console.error).finally(() => prisma.$disconnect());
