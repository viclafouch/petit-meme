-- Standardize remaining SQL identifiers to snake_case.
-- This migration handles constraints, foreign keys, and indexes.
-- Uses conditional renames to be idempotent against production state.

-- ============================================================
-- 1. Rename primary key constraints (only if old name still exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_pkey') THEN
    ALTER TABLE "category" RENAME CONSTRAINT "Category_pkey" TO "category_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meme_pkey') THEN
    ALTER TABLE "meme" RENAME CONSTRAINT "Meme_pkey" TO "meme_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemeCategory_pkey') THEN
    ALTER TABLE "meme_category" RENAME CONSTRAINT "MemeCategory_pkey" TO "meme_category_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemeViewDaily_pkey') THEN
    ALTER TABLE "meme_view_daily" RENAME CONSTRAINT "MemeViewDaily_pkey" TO "meme_view_daily_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rateLimit_pkey') THEN
    ALTER TABLE "rate_limit" RENAME CONSTRAINT "rateLimit_pkey" TO "rate_limit_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Video_pkey') THEN
    ALTER TABLE "video" RENAME CONSTRAINT "Video_pkey" TO "video_pkey";
  END IF;
END $$;

-- ============================================================
-- 2. Rename foreign key constraints (only if old name still exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_userId_fkey') THEN
    ALTER TABLE "account" RENAME CONSTRAINT "account_userId_fkey" TO "account_user_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meme_videoId_fkey') THEN
    ALTER TABLE "meme" RENAME CONSTRAINT "Meme_videoId_fkey" TO "meme_video_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meme_action_daily_memeId_fkey') THEN
    ALTER TABLE "meme_action_daily" RENAME CONSTRAINT "meme_action_daily_memeId_fkey" TO "meme_action_daily_meme_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemeCategory_categoryId_fkey') THEN
    ALTER TABLE "meme_category" RENAME CONSTRAINT "MemeCategory_categoryId_fkey" TO "meme_category_category_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemeCategory_memeId_fkey') THEN
    ALTER TABLE "meme_category" RENAME CONSTRAINT "MemeCategory_memeId_fkey" TO "meme_category_meme_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemeViewDaily_memeId_fkey') THEN
    ALTER TABLE "meme_view_daily" RENAME CONSTRAINT "MemeViewDaily_memeId_fkey" TO "meme_view_daily_meme_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_userId_fkey') THEN
    ALTER TABLE "session" RENAME CONSTRAINT "session_userId_fkey" TO "session_user_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'studio_generation_memeId_fkey') THEN
    ALTER TABLE "studio_generation" RENAME CONSTRAINT "studio_generation_memeId_fkey" TO "studio_generation_meme_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'studio_generation_userId_fkey') THEN
    ALTER TABLE "studio_generation" RENAME CONSTRAINT "studio_generation_userId_fkey" TO "studio_generation_user_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_bookmark_memeId_fkey') THEN
    ALTER TABLE "user_bookmark" RENAME CONSTRAINT "user_bookmark_memeId_fkey" TO "user_bookmark_meme_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_bookmark_userId_fkey') THEN
    ALTER TABLE "user_bookmark" RENAME CONSTRAINT "user_bookmark_userId_fkey" TO "user_bookmark_user_id_fkey";
  END IF;
END $$;

-- ============================================================
-- 3. Rename indexes (only if old name still exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'account_userId_idx') THEN
    ALTER INDEX "account_userId_idx" RENAME TO "account_user_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Category_createdAt_idx') THEN
    ALTER INDEX "Category_createdAt_idx" RENAME TO "category_created_at_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Category_slug_key') THEN
    ALTER INDEX "Category_slug_key" RENAME TO "category_slug_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Meme_status_publishedAt_idx') THEN
    ALTER INDEX "Meme_status_publishedAt_idx" RENAME TO "meme_status_published_at_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Meme_tweetUrl_key') THEN
    ALTER INDEX "Meme_tweetUrl_key" RENAME TO "meme_tweet_url_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Meme_videoId_key') THEN
    ALTER INDEX "Meme_videoId_key" RENAME TO "meme_video_id_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'meme_action_daily_day_action_memeId_idx') THEN
    ALTER INDEX "meme_action_daily_day_action_memeId_idx" RENAME TO "meme_action_daily_day_action_meme_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'meme_action_daily_memeId_day_action_key') THEN
    ALTER INDEX "meme_action_daily_memeId_day_action_key" RENAME TO "meme_action_daily_meme_id_day_action_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MemeCategory_categoryId_idx') THEN
    ALTER INDEX "MemeCategory_categoryId_idx" RENAME TO "meme_category_category_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MemeViewDaily_day_idx') THEN
    ALTER INDEX "MemeViewDaily_day_idx" RENAME TO "meme_view_daily_day_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MemeViewDaily_memeId_day_idx') THEN
    ALTER INDEX "MemeViewDaily_memeId_day_idx" RENAME TO "meme_view_daily_meme_id_day_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MemeViewDaily_memeId_viewerKey_day_key') THEN
    ALTER INDEX "MemeViewDaily_memeId_viewerKey_day_key" RENAME TO "meme_view_daily_meme_id_viewer_key_day_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MemeViewDaily_viewerKey_day_idx') THEN
    ALTER INDEX "MemeViewDaily_viewerKey_day_idx" RENAME TO "meme_view_daily_viewer_key_day_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'rateLimit_key_key') THEN
    ALTER INDEX "rateLimit_key_key" RENAME TO "rate_limit_key_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'session_userId_idx') THEN
    ALTER INDEX "session_userId_idx" RENAME TO "session_user_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'studio_generation_createdAt_idx') THEN
    ALTER INDEX "studio_generation_createdAt_idx" RENAME TO "studio_generation_created_at_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'studio_generation_memeId_createdAt_idx') THEN
    ALTER INDEX "studio_generation_memeId_createdAt_idx" RENAME TO "studio_generation_meme_id_created_at_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'studio_generation_userId_createdAt_idx') THEN
    ALTER INDEX "studio_generation_userId_createdAt_idx" RENAME TO "studio_generation_user_id_created_at_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_createdAt_idx') THEN
    ALTER INDEX "user_createdAt_idx" RENAME TO "user_created_at_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_bookmark_createdAt_idx') THEN
    ALTER INDEX "user_bookmark_createdAt_idx" RENAME TO "user_bookmark_created_at_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_bookmark_memeId_idx') THEN
    ALTER INDEX "user_bookmark_memeId_idx" RENAME TO "user_bookmark_meme_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_bookmark_userId_idx') THEN
    ALTER INDEX "user_bookmark_userId_idx" RENAME TO "user_bookmark_user_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_bookmark_userId_memeId_key') THEN
    ALTER INDEX "user_bookmark_userId_memeId_key" RENAME TO "user_bookmark_user_id_meme_id_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Video_bunnyId_key') THEN
    ALTER INDEX "Video_bunnyId_key" RENAME TO "video_bunny_id_key";
  END IF;
END $$;

-- ============================================================
-- 4. Create missing indexes (never existed in production)
-- ============================================================
CREATE INDEX IF NOT EXISTS "meme_status_idx" ON "meme"("status");
CREATE INDEX IF NOT EXISTS "meme_status_view_count_idx" ON "meme"("status", "view_count");
