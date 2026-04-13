-- CreateTable
CREATE TABLE "AdminWebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "AdminWebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminWebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminWebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminWebAuthnCredential_credentialId_key" ON "AdminWebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "AdminWebAuthnCredential_userId_idx" ON "AdminWebAuthnCredential"("userId");

-- CreateIndex
CREATE INDEX "AdminWebAuthnChallenge_userId_idx" ON "AdminWebAuthnChallenge"("userId");

-- CreateIndex
CREATE INDEX "AdminWebAuthnChallenge_expiresAt_idx" ON "AdminWebAuthnChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "AdminWebAuthnCredential" ADD CONSTRAINT "AdminWebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
