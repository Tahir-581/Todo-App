-- AlterTable
ALTER TABLE "User" ADD COLUMN "dailyProgressWhatsApp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProgressDailyReportWhatsAppLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateStr" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressDailyReportWhatsAppLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgressDailyReportWhatsAppLog_userId_dateStr_key" ON "ProgressDailyReportWhatsAppLog"("userId", "dateStr");

-- AddForeignKey
ALTER TABLE "ProgressDailyReportWhatsAppLog" ADD CONSTRAINT "ProgressDailyReportWhatsAppLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
