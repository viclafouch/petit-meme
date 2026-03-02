-- Standardize all SQL identifiers to snake_case.
-- This migration contains ONLY renames (tables, columns, enum type).
-- Zero data loss — no DROP, no CREATE TABLE, no ALTER COLUMN TYPE.

-- ============================================================
-- 1. Rename tables
-- ============================================================
ALTER TABLE "Category" RENAME TO "category";
ALTER TABLE "MemeCategory" RENAME TO "meme_category";
ALTER TABLE "Video" RENAME TO "video";
ALTER TABLE "Meme" RENAME TO "meme";
ALTER TABLE "MemeViewDaily" RENAME TO "meme_view_daily";
ALTER TABLE "rateLimit" RENAME TO "rate_limit";

-- ============================================================
-- 2. Rename enum type
-- ============================================================
ALTER TYPE "MemeStatus" RENAME TO "meme_status";

-- ============================================================
-- 3. Rename columns — user_bookmark
-- ============================================================
ALTER TABLE "user_bookmark" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "user_bookmark" RENAME COLUMN "memeId" TO "meme_id";
ALTER TABLE "user_bookmark" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================
-- 4. Rename columns — category
-- ============================================================
ALTER TABLE "category" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "category" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================
-- 5. Rename columns — meme_category
-- ============================================================
ALTER TABLE "meme_category" RENAME COLUMN "memeId" TO "meme_id";
ALTER TABLE "meme_category" RENAME COLUMN "categoryId" TO "category_id";
ALTER TABLE "meme_category" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================
-- 6. Rename columns — video
-- ============================================================
ALTER TABLE "video" RENAME COLUMN "bunnyId" TO "bunny_id";
ALTER TABLE "video" RENAME COLUMN "bunnyStatus" TO "bunny_status";

-- ============================================================
-- 7. Rename columns — meme
-- ============================================================
ALTER TABLE "meme" RENAME COLUMN "videoId" TO "video_id";
ALTER TABLE "meme" RENAME COLUMN "viewCount" TO "view_count";
ALTER TABLE "meme" RENAME COLUMN "shareCount" TO "share_count";
ALTER TABLE "meme" RENAME COLUMN "downloadCount" TO "download_count";
ALTER TABLE "meme" RENAME COLUMN "tweetUrl" TO "tweet_url";
ALTER TABLE "meme" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "meme" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "meme" RENAME COLUMN "publishedAt" TO "published_at";

-- ============================================================
-- 8. Rename columns — meme_view_daily
-- ============================================================
ALTER TABLE "meme_view_daily" RENAME COLUMN "memeId" TO "meme_id";
ALTER TABLE "meme_view_daily" RENAME COLUMN "viewerKey" TO "viewer_key";
ALTER TABLE "meme_view_daily" RENAME COLUMN "watchMs" TO "watch_ms";
ALTER TABLE "meme_view_daily" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================
-- 9. Rename columns — meme_action_daily
-- ============================================================
ALTER TABLE "meme_action_daily" RENAME COLUMN "memeId" TO "meme_id";

-- ============================================================
-- 10. Rename columns — user
-- ============================================================
ALTER TABLE "user" RENAME COLUMN "emailVerified" TO "email_verified";
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "user" RENAME COLUMN "generationCount" TO "generation_count";
ALTER TABLE "user" RENAME COLUMN "banReason" TO "ban_reason";
ALTER TABLE "user" RENAME COLUMN "banExpires" TO "ban_expires";
ALTER TABLE "user" RENAME COLUMN "stripeCustomerId" TO "stripe_customer_id";

-- ============================================================
-- 11. Rename columns — session
-- ============================================================
ALTER TABLE "session" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "session" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "session" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "session" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "session" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "session" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "session" RENAME COLUMN "impersonatedBy" TO "impersonated_by";

-- ============================================================
-- 12. Rename columns — account
-- ============================================================
ALTER TABLE "account" RENAME COLUMN "accountId" TO "account_id";
ALTER TABLE "account" RENAME COLUMN "providerId" TO "provider_id";
ALTER TABLE "account" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "account" RENAME COLUMN "accessToken" TO "access_token";
ALTER TABLE "account" RENAME COLUMN "refreshToken" TO "refresh_token";
ALTER TABLE "account" RENAME COLUMN "idToken" TO "id_token";
ALTER TABLE "account" RENAME COLUMN "accessTokenExpiresAt" TO "access_token_expires_at";
ALTER TABLE "account" RENAME COLUMN "refreshTokenExpiresAt" TO "refresh_token_expires_at";
ALTER TABLE "account" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "account" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================
-- 13. Rename columns — verification
-- ============================================================
ALTER TABLE "verification" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "verification" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "verification" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================
-- 14. Rename columns — studio_generation
-- ============================================================
ALTER TABLE "studio_generation" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "studio_generation" RENAME COLUMN "memeId" TO "meme_id";
ALTER TABLE "studio_generation" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================
-- 15. Rename columns — rate_limit
-- ============================================================
ALTER TABLE "rate_limit" RENAME COLUMN "lastRequest" TO "last_request";

-- ============================================================
-- 16. Rename primary key constraints (only if old name still exists)
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
-- 17. Rename foreign key constraints (only if old name still exists)
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
-- 18. Rename indexes (only if old name still exists)
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
    ALTER INDEX "MemeViewDaily_memeId_viewerKey_day_key" RENAME TO "meme_view_daily_meme_id_viewer_key_day_idx";
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
-- 19. Create missing indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS "meme_status_idx" ON "meme"("status");
CREATE INDEX IF NOT EXISTS "meme_status_view_count_idx" ON "meme"("status", "view_count");
