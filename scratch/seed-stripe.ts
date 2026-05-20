import { prisma } from "../src/common/lib/prisma";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    console.error("Error: STRIPE_SECRET_KEY is not configured in .env");
    process.exit(1);
  }

  const existing = await prisma.paymentGateway.findFirst({
    where: { secretKey }
  });

  if (existing) {
    console.log("Stripe payment gateway already exists in database:", existing.id);
    return;
  }

  const gateway = await prisma.paymentGateway.create({
    data: {
      name: "Stripe Default Primary",
      provider: "stripe",
      publishableKey: publishableKey || null,
      secretKey,
      webhookSecret: webhookSecret || null,
      rotationLimit: 10,
      paymentCount: 0,
      totalPayments: 0,
      isActive: true,
    }
  });

  console.log("Stripe payment gateway successfully seeded into database! ID:", gateway.id);
}

main()
  .catch((e) => {
    console.error("Error seeding Stripe gateway:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
