import { prisma } from "../src/common/lib/prisma";

async function diagnose() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      password: true,
      userRole: { select: { slug: true } }
    }
  });

  console.log("--- User Diagnosis ---");
  users.forEach((u: any) => {
    console.log(`User: [${u.email}] (Length: ${u.email.length})`);
    console.log(`Role: ${u.userRole?.slug}`);
    console.log(`Password Hash: ${u.password.substring(0, 10)}...`);
    console.log("----------------------");
  });

  const envEmail = process.env.ADMIN_EMAIL || "admin@sharcly.com";
  const envPassword = process.env.ADMIN_PASSWORD;
  console.log(`Env ADMIN_EMAIL: [${envEmail}] (Length: ${envEmail.length})`);
  console.log(`Env ADMIN_PASSWORD set: ${!!envPassword}`);
  if (envPassword) {
      console.log(`Env ADMIN_PASSWORD length: ${envPassword.length}`);
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
