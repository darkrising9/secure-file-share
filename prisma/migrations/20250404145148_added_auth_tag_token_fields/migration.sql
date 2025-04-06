/*
  Warnings:

  - You are about to drop the column `encryptionKey` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `File` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[downloadToken]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `authTag` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `downloadToken` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "encryptionKey",
DROP COLUMN "expiresAt",
ADD COLUMN     "authTag" TEXT NOT NULL,
ADD COLUMN     "downloadToken" TEXT NOT NULL,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "File_downloadToken_key" ON "File"("downloadToken");
