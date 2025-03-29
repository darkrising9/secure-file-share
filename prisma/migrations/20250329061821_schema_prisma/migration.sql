/*
  Warnings:

  - A unique constraint covering the columns `[idNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "PreExistingIDs" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "teacherId" TEXT,

    CONSTRAINT "PreExistingIDs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "encryptionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreExistingIDs_studentId_key" ON "PreExistingIDs"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PreExistingIDs_teacherId_key" ON "PreExistingIDs"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "User_idNumber_key" ON "User"("idNumber");
