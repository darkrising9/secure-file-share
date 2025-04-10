-- AlterTable
ALTER TABLE "File" ADD COLUMN     "recipientId" TEXT;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
