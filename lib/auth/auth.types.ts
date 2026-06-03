import { Prisma } from "@prisma/client";

export type CurrentAdminUser = Prisma.AdminUserGetPayload<{}>;

export type AdminUserWithSecurity = Prisma.AdminUserGetPayload<{
  include: {
    totp: true;
    webauthnCredentials: true;
  };
}>;