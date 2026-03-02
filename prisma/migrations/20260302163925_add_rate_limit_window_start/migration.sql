-- AlterTable: add window_start with backfill for existing rows (idempotent)
ALTER TABLE "rate_limit" ADD COLUMN IF NOT EXISTS "window_start" BIGINT;
UPDATE "rate_limit" SET "window_start" = "last_request" WHERE "window_start" IS NULL;
ALTER TABLE "rate_limit" ALTER COLUMN "window_start" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rate_limit_last_request_idx" ON "rate_limit"("last_request");

-- RenameIndex (conditional: may already be correct in production)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'meme_view_daily_meme_id_viewer_key_day_idx') THEN
    ALTER INDEX "meme_view_daily_meme_id_viewer_key_day_idx" RENAME TO "meme_view_daily_meme_id_viewer_key_day_key";
  END IF;
END $$;
