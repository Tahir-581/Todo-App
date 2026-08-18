-- AlterTable
ALTER TABLE "User" ADD COLUMN "whatsappPhone" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsappNotifications" BOOLEAN NOT NULL DEFAULT false;
