-- DropIndex
DROP INDEX "meme_action_daily_day_action_count_idx";

-- CreateIndex
CREATE INDEX "meme_action_daily_day_action_memeId_idx" ON "meme_action_daily"("day", "action", "memeId");
