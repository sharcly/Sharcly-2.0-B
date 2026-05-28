import { prisma } from "./src/common/lib/prisma";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

// Helper to escape values for CSV
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  // If the value contains quotes, commas, or newlines, escape it by surrounding in quotes and doubling existing quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportProducts() {
  console.log("Fetching products from the database...");
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" }
    });

    console.log(`Found ${products.length} products. Generating CSV file...`);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    // Strip trailing slash if present
    const cleanFrontendUrl = frontendUrl.endsWith("/") ? frontendUrl.slice(0, -1) : frontendUrl;

    // Define CSV Headers
    const headers = [
      "Product ID",
      "Product Title",
      "Slug",
      "Status",
      "Price",
      "Stock",
      "Relative URL",
      "Full URL"
    ];

    const csvRows = [headers.join(",")];

    for (const product of products) {
      const relativeUrl = `/products/${product.slug}`;
      const fullUrl = `${cleanFrontendUrl}${relativeUrl}`;

      const row = [
        escapeCSV(product.id),
        escapeCSV(product.name),
        escapeCSV(product.slug),
        escapeCSV(product.status),
        escapeCSV(product.price),
        escapeCSV(product.stock),
        escapeCSV(relativeUrl),
        escapeCSV(fullUrl)
      ];

      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\r\n");
    const outputPath = path.join(__dirname, "products_export.csv");

    fs.writeFileSync(outputPath, csvContent, "utf8");
    console.log("\n========================================================");
    console.log("SUCCESS!");
    console.log(`CSV file exported successfully to:`);
    console.log(outputPath);
    console.log(`Total products exported: ${products.length}`);
    console.log("========================================================\n");

  } catch (error) {
    console.error("Error exporting products:", error);
  } finally {
    await prisma.$disconnect();
  }
}

exportProducts();
