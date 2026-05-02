import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: { email: true }
  });

  console.log("Users in DB:");
  users.forEach((u: any) => {
    if (u.email !== u.email.toLowerCase()) {
      console.log(`⚠️  Uppercase email found: ${u.email}`);
    } else {
      console.log(`✅ Lowercase email: ${u.email}`);
    }
  });
}

checkUsers().then(() => prisma.$disconnect());
