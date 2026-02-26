-- DropIndex
DROP INDEX "meme_action_daily_day_action_idx";

-- CreateIndex
CREATE INDEX "meme_action_daily_day_action_count_idx" ON "meme_action_daily"("day", "action", "count");
