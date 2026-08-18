-- AlterTable
ALTER TABLE "User" ADD COLUMN "hasProgressActivityWaReminders" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProgressActivityReminderWhatsAppLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "dateStr" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressActivityReminderWhatsAppLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgressActivityReminderWhatsAppLog_userId_activityId_dateStr_key" ON "ProgressActivityReminderWhatsAppLog"("userId", "activityId", "dateStr");

-- CreateIndex
CREATE INDEX "ProgressActivityReminderWhatsAppLog_userId_dateStr_idx" ON "ProgressActivityReminderWhatsAppLog"("userId", "dateStr");

-- AddForeignKey
ALTER TABLE "ProgressActivityReminderWhatsAppLog" ADD CONSTRAINT "ProgressActivityReminderWhatsAppLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
