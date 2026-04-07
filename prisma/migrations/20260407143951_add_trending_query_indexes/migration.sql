-- CreateIndex
CREATE INDEX "meme_view_daily_day_meme_id_idx" ON "meme_view_daily"("day", "meme_id");

-- CreateIndex
CREATE INDEX "user_bookmark_created_at_meme_id_idx" ON "user_bookmark"("created_at", "meme_id");
