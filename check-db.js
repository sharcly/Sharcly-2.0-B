const { prisma } = require("./src/common/lib/prisma");

async function checkColumns() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `;
    console.log("Columns in 'products' table:", columns);
  } catch (err) {
    console.error("Error checking columns:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
