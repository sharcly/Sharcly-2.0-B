import { prisma } from "../src/common/lib/prisma";

async function checkOtp() {
  const email = "osama2.jet@gmail.com";
  const otp = await prisma.otp.findUnique({ where: { email } });
  console.log("OTP Record:", JSON.stringify(otp, null, 2));
  console.log("Current Time:", new Date().toISOString());
  if (otp) {
      console.log("Is expired?", otp.expiresAt < new Date());
  }
}

checkOtp()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
