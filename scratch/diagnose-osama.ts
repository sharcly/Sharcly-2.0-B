import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function diagnose() {
  const email = "osama2.jet@gmail.com";
  console.log(`Checking user: ${email}`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("❌ User not found");
    return;
  }

  console.log("✅ User found");
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.name}`);
  console.log(`Role ID: ${user.roleId}`);
  console.log(`Password Hash: ${user.password}`);

  const testPassword = "osama@@Kgn95";
  const isMatch = await bcrypt.compare(testPassword, user.password);
  console.log(`Bcrypt match with 'osama@@Kgn95': ${isMatch}`);

  // Check if it matches after trimming
  const isMatchTrimmed = await bcrypt.compare(testPassword.trim(), user.password);
  console.log(`Bcrypt match with trimmed password: ${isMatchTrimmed}`);
  
  // Check if it matches with extra space
  const isMatchSpace = await bcrypt.compare(testPassword + " ", user.password);
  console.log(`Bcrypt match with trailing space: ${isMatchSpace}`);
}

diagnose().then(() => prisma.$disconnect());
