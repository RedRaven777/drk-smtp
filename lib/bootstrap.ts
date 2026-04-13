import { prisma } from "@/lib/prisma";

export async function isAppInitialized(): Promise<boolean> {
	const adminCount = await prisma.adminUser.count();
	return adminCount > 0;
}