-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "billing_interval" TEXT,
ADD COLUMN     "cancel_at" TIMESTAMP(3),
ADD COLUMN     "canceled_at" TIMESTAMP(3);
