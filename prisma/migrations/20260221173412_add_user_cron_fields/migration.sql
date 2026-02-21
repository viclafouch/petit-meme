-- AlterTable
ALTER TABLE "user" ADD COLUMN     "is_anonymized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verification_reminder_sent" BOOLEAN NOT NULL DEFAULT false;
