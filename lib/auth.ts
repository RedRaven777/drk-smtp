import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionByToken, getSessionCookieName } from "@/lib/session";

export async function getCurrentAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    return null;
  }

  const session = await getSessionByToken(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

export async function requireAdminUser() {
  const user = await getCurrentAdminUser();

  if (!user) {
    redirect("/");
  }

  return user;
}