import { prisma } from "./src/common/lib/prisma";

async function listUsers() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      userRole: {
        select: {
          slug: true
        }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

listUsers();
