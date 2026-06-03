import "dotenv/config";
import { prisma } from "../lib/prisma/prisma.client";
import { hashPassword } from "../lib/password/password.service";

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set"
    );
  }

  const existing = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("Admin user already exists");
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      isActive: true,
    },
  });

  console.log("Initial admin user created");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });