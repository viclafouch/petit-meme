-- CreateTable
CREATE TABLE "meme_action_daily" (
    "id" TEXT NOT NULL,
    "memeId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meme_action_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meme_action_daily_day_action_idx" ON "meme_action_daily"("day", "action");

-- CreateIndex
CREATE UNIQUE INDEX "meme_action_daily_memeId_day_action_key" ON "meme_action_daily"("memeId", "day", "action");

-- AddForeignKey
ALTER TABLE "meme_action_daily" ADD CONSTRAINT "meme_action_daily_memeId_fkey" FOREIGN KEY ("memeId") REFERENCES "Meme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
