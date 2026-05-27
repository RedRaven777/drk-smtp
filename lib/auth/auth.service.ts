import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionByToken, getSessionCookieName } from "@/lib/session/session.service";
import { unauthorized } from "@/lib/api/api.response";

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

export async function requireAdminUserOr401() {
  const user = await getCurrentAdminUser();

  if (!user) {
    return {
      user: null,
      response: unauthorized(),
    };
  }

  return {
    user,
    response: null,
  };
}