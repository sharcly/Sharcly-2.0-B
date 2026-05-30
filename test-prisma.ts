import { prisma } from "./src/common/lib/prisma";

async function main() {
  console.log("Checking User model...");
  try {
    const user = await prisma.user.findUnique({
        where: {
            email: "admin@sharcly.com"
        },
        include: {
            userRole: true
        }
    });
    console.log("Success:", user);
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
