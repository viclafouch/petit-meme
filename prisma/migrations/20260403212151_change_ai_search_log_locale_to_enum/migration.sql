-- Safe conversion: String → UserLocale enum (existing values already match)
ALTER TABLE "ai_search_log"
  ALTER COLUMN "locale" TYPE "UserLocale" USING "locale"::"UserLocale";
