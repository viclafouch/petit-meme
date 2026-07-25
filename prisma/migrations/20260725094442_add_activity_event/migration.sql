-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('VIEW', 'DOWNLOAD', 'SHARE', 'GENERATION', 'AI_SEARCH', 'BOOKMARK_ADDED', 'SIGNUP', 'SUBSCRIPTION');

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "ended_at" TIMESTAMP(3),
ADD COLUMN     "stripe_schedule_id" TEXT;

-- CreateTable
CREATE TABLE "activity_event" (
    "id" TEXT NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT,
    "meme_id" TEXT,
    "dedup_key" TEXT,
    "metadata" JSONB,

    CONSTRAINT "activity_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_event_dedup_key_key" ON "activity_event"("dedup_key");

-- CreateIndex
CREATE INDEX "activity_event_created_at_idx" ON "activity_event"("created_at");

-- CreateIndex
CREATE INDEX "activity_event_user_id_created_at_idx" ON "activity_event"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_event_ip_address_created_at_idx" ON "activity_event"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "activity_event_type_created_at_idx" ON "activity_event"("type", "created_at");

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_meme_id_fkey" FOREIGN KEY ("meme_id") REFERENCES "meme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
