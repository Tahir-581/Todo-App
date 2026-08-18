-- CreateTable
CREATE TABLE "WhatsAppReportRecipient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppReportRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppReportRecipient_userId_phone_key" ON "WhatsAppReportRecipient"("userId", "phone");

-- AddForeignKey
ALTER TABLE "WhatsAppReportRecipient" ADD CONSTRAINT "WhatsAppReportRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
