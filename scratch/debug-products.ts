import { prisma } from "../src/common/lib/prisma";

async function testFetchProducts() {
  try {
    const sort = "newest";
    const page = "1";
    const limit = "10";
    
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit as string) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    console.log("Attempting to fetch products with:", { where, skip, limitNum, sort });

    const products = await prisma.product.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        category: true,
        type: true,
        tags: true, // POTENTIAL ISSUE HERE
        flavours: true,
        variants: true,
        images: {
          orderBy: { order: "asc" },
          select: { id: true, isThumbnail: true, order: true, mimeType: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    console.log("Successfully fetched products:", products.length);
  } catch (error: any) {
    console.error("Error fetching products:", error.message);
    if (error.code) console.error("Error code:", error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testFetchProducts();
