-- AlterTable
ALTER TABLE "User"
ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "banReason" TEXT;
