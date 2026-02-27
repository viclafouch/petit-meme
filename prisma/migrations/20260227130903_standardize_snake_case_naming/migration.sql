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
