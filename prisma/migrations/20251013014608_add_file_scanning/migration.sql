-- CreateEnum
CREATE TYPE "public"."ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'THREAT_DETECTED', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActionType" ADD VALUE 'FILE_SCAN_THREAT_DETECTED';
ALTER TYPE "public"."ActionType" ADD VALUE 'FILE_SCAN_CLEAN';

-- AlterTable
ALTER TABLE "public"."File" ADD COLUMN     "scanEngine" TEXT,
ADD COLUMN     "scanResult" TEXT,
ADD COLUMN     "scanStatus" "public"."ScanStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "scannedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "File_scanStatus_idx" ON "public"."File"("scanStatus");
