-- CreateEnum
CREATE TYPE "TaskRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deadlineRecurrence" "TaskRecurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "reminderRecurrence" "TaskRecurrence" NOT NULL DEFAULT 'NONE';
