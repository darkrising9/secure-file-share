-- AlterTable
ALTER TABLE "public"."ActivityLog" ADD COLUMN     "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "public"."ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorEmail_idx" ON "public"."ActivityLog"("actorEmail");
