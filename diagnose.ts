import { prisma } from "./src/common/lib/prisma";
import bcrypt from "bcryptjs";

async function diagnose(email: string, plainPassword?: string) {
  console.log(`Diagnosing user: ${email}`);
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { userRole: true }
  });

  if (!user) {
    console.error("❌ User NOT found in database.");
    const allUsers = await prisma.user.findMany({ select: { email: true }, take: 5 });
    console.log("Some emails in DB:", allUsers.map(u => u.email));
    return;
  }

  console.log("✅ User found!");
  console.log("Email in DB:", user.email);
  console.log("Role:", user.userRole?.slug);
  console.log("Is Blocked:", user.isBlocked);
  console.log("Is Verified:", user.isEmailVerified);
  console.log("Hash Length:", user.password.length);

  if (plainPassword) {
    const isMatch = await bcrypt.compare(plainPassword, user.password);
    console.log(`Password test for "${plainPassword}": ${isMatch ? "✅ MATCH" : "❌ MISMATCH"}`);
  }
}

const targetEmail = process.argv[2];
const targetPass = process.argv[3];

if (!targetEmail) {
  console.log("Usage: npx ts-node diagnose.ts <email> [password]");
} else {
  diagnose(targetEmail, targetPass).then(() => prisma.$disconnect());
}
