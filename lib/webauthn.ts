import "server-only";

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

const rpName = process.env.WEBAUTHN_RP_NAME;
const rpID = process.env.WEBAUTHN_RP_ID;
const origin = process.env.WEBAUTHN_ORIGIN;

if (!rpName || !rpID || !origin) {
  throw new Error(
    "WEBAUTHN_RP_NAME, WEBAUTHN_RP_ID, and WEBAUTHN_ORIGIN must be set"
  );
}

export async function createWebAuthnRegistrationOptions(params: {
  userId: string;
  userEmail: string;
}) {
  const existingCredentials = await prisma.adminWebAuthnCredential.findMany({
    where: { userId: params.userId },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: isoUint8Array.fromUTF8String(params.userId),
    userName: params.userEmail,
    userDisplayName: params.userEmail,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "discouraged",
      userVerification: "preferred",
      authenticatorAttachment: "cross-platform",
    },
    excludeCredentials: existingCredentials.map((credential) => ({
      id: credential.credentialId,
      transports: credential.transports
        ? (JSON.parse(credential.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
  });

  await prisma.adminWebAuthnChallenge.create({
    data: {
      userId: params.userId,
      challenge: options.challenge,
      type: "registration",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return options;
}

export async function verifyWebAuthnRegistration(params: {
  userId: string;
  response: RegistrationResponseJSON;
  name?: string | null;
}): Promise<VerifiedRegistrationResponse> {
  const challengeRecord = await prisma.adminWebAuthnChallenge.findFirst({
    where: {
      userId: params.userId,
      type: "registration",
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!challengeRecord) {
    throw new Error("Registration challenge not found or expired");
  }

  const verification = await verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("WebAuthn registration verification failed");
  }

  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  await prisma.adminWebAuthnCredential.create({
    data: {
      userId: params.userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: params.response.response.transports
        ? JSON.stringify(params.response.response.transports)
        : null,
      name: params.name?.trim() || null,
    },
  });

  await prisma.adminWebAuthnChallenge.deleteMany({
    where: {
      userId: params.userId,
      type: "registration",
    },
  });

  return verification;
}

export async function createWebAuthnAuthenticationOptions(params: {
  userId: string;
}) {
  const credentials = await prisma.adminWebAuthnCredential.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: "asc" },
  });

  if (credentials.length === 0) {
    throw new Error("No registered WebAuthn credentials found");
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: credentials.map((credential) => ({
      id: credential.credentialId,
      transports: credential.transports
        ? (JSON.parse(credential.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
  });

  await prisma.adminWebAuthnChallenge.create({
    data: {
      userId: params.userId,
      challenge: options.challenge,
      type: "authentication",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return options;
}

export async function verifyWebAuthnAuthentication(params: {
  userId: string;
  response: AuthenticationResponseJSON;
}) {
  const challengeRecord = await prisma.adminWebAuthnChallenge.findFirst({
    where: {
      userId: params.userId,
      type: "authentication",
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!challengeRecord) {
    throw new Error("Authentication challenge not found or expired");
  }

  const dbCredential = await prisma.adminWebAuthnCredential.findUnique({
    where: {
      credentialId: params.response.id,
    },
  });

  if (!dbCredential || dbCredential.userId !== params.userId) {
    throw new Error("WebAuthn credential not found");
  }

  const verification = await verifyAuthenticationResponse({
    response: params.response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: dbCredential.credentialId,
      publicKey: Buffer.from(dbCredential.publicKey, "base64"),
      counter: dbCredential.counter,
      transports: dbCredential.transports
        ? (JSON.parse(dbCredential.transports) as AuthenticatorTransportFuture[])
        : undefined,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    throw new Error("WebAuthn authentication verification failed");
  }

  await prisma.adminWebAuthnCredential.update({
    where: { credentialId: dbCredential.credentialId },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  await prisma.adminWebAuthnChallenge.deleteMany({
    where: {
      userId: params.userId,
      type: "authentication",
    },
  });

  return verification;
}