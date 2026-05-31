import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

// All tables that should exist according to the Prisma schema
const expectedTables = [
  "roles", "permissions", "role_permissions", "users", "addresses",
  "categories", "products", "product_variants", "product_images",
  "orders", "order_items", "blogs", "coupons", "welcome_offers",
  "offer_claims", "reviews", "cms_content", "collections",
  "store_settings", "global_seo_settings", "regions", "product_types",
  "product_tags", "return_reasons", "refund_reasons", "seo_meta",
  "shipping_methods", "shipping_zones", "shipping_rates",
  "wholesale_inquiries", "pricing_plans", "testimonials",
  "api_integrations", "otps", "newsletter_subscribers",
  "contact_messages", "faqs", "flavours",
  "payment_gateways", "payment_integrations", "integration_audit_logs"
];

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("✅ Connected to DB");

  // Get all existing tables
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const existingTables = res.rows.map((r: any) => r.table_name);
  console.log("\n📋 Tables in DB:", existingTables);

  // Find missing tables
  const missingTables = expectedTables.filter(t => !existingTables.includes(t));
  if (missingTables.length === 0) {
    console.log("\n✅ All expected tables exist!");
  } else {
    console.log("\n❌ MISSING TABLES:", missingTables);
  }

  await client.end();
}

main().catch(console.error);
