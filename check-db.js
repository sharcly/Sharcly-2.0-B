// Use the existing configured prisma instance
const { prisma } = require('./src/common/lib/prisma');

async function check() {
  try {
    const user = await prisma.user.findFirst();
    console.log("User columns:", Object.keys(user || {}));
    if (user && 'cart' in user) {
      console.log("✅ 'cart' field exists in DB!");
    } else {
      console.log("❌ 'cart' field MISSING in DB!");
    }
  } catch (err) {
    console.error("❌ DB Check failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
