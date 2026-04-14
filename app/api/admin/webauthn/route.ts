import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  WebAuthnAdminError,
  renameWebAuthnCredential,
  deleteWebAuthnCredential,
  listWebAuthnCredentialsForAdmin,
} from "@/lib/webauthn-admin";

const MINIMUM_KEYS = 1;

export async function GET() {
  try {
    const user = await requireAdminUser();

    const credentials = await listWebAuthnCredentialsForAdmin(user.id);

    return NextResponse.json({
      credentials: credentials.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        lastUsedAt: item.lastUsedAt ? item.lastUsedAt.toISOString() : null,
      })),
      minimumKeys: MINIMUM_KEYS,
    });
  } catch (error) {
    console.error("GET WEBAUTHN ADMIN ERROR:", error);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdminUser();
    const body = await req.json().catch(() => null);

    const credentialId = String(body?.credentialId ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (!credentialId) {
      return NextResponse.json(
        { message: "Credential id is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { message: "Key name is required" },
        { status: 400 }
      );
    }

    const updated = await renameWebAuthnCredential({
      userId: user.id,
      credentialId,
      name,
    });

    const userAgent = req.headers.get("user-agent");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

    await createAuditLog({
      actorUserId: user.id,
      action: "WEBAUTHN_RENAMED",
      targetType: "AdminWebAuthnCredential",
      targetId: updated.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      message: "Security key renamed",
      credential: {
        id: updated.id,
        name: updated.name,
      },
    });
  } catch (error) {
    if (error instanceof WebAuthnAdminError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 }
      );
    }

    console.error("PATCH WEBAUTHN ADMIN ERROR:", error);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAdminUser();
    const body = await req.json().catch(() => null);

    const credentialId = String(body?.credentialId ?? "").trim();

    if (!credentialId) {
      return NextResponse.json(
        { message: "Credential id is required" },
        { status: 400 }
      );
    }

    const deleted = await deleteWebAuthnCredential({
      userId: user.id,
      credentialId,
      minimumRemaining: MINIMUM_KEYS,
    });

    const userAgent = req.headers.get("user-agent");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

    await createAuditLog({
      actorUserId: user.id,
      action: "WEBAUTHN_REMOVED",
      targetType: "AdminWebAuthnCredential",
      targetId: deleted.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      message: "Security key removed",
    });
  } catch (error) {
    if (error instanceof WebAuthnAdminError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 }
      );
    }

    console.error("DELETE WEBAUTHN ADMIN ERROR:", error);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}