/*
  Warnings:

  - You are about to drop the column `recipient` on the `SmtpConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SmtpConfig" DROP COLUMN "recipient",
ADD COLUMN     "recipientEncrypted" TEXT;
