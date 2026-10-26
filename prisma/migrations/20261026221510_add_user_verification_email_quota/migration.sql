-- AlterTable
ALTER TABLE "user" ADD COLUMN     "verification_email_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verification_email_window_start" TIMESTAMP(3);
