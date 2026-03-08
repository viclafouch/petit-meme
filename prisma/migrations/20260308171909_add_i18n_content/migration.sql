-- CreateEnum
CREATE TYPE "meme_content_locale" AS ENUM ('FR', 'EN', 'UNIVERSAL');

-- AlterTable
ALTER TABLE "meme" ADD COLUMN     "content_locale" "meme_content_locale" NOT NULL DEFAULT 'FR';

-- CreateTable
CREATE TABLE "meme_translation" (
    "id" TEXT NOT NULL,
    "meme_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meme_translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translation" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meme_translation_meme_id_locale_key" ON "meme_translation"("meme_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "category_translation_category_id_locale_key" ON "category_translation"("category_id", "locale");

-- CreateIndex
CREATE INDEX "meme_status_content_locale_idx" ON "meme"("status", "content_locale");

-- AddForeignKey
ALTER TABLE "meme_translation" ADD CONSTRAINT "meme_translation_meme_id_fkey" FOREIGN KEY ("meme_id") REFERENCES "meme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translation" ADD CONSTRAINT "category_translation_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: Copy existing meme title/description/keywords into MemeTranslation(locale="fr")
INSERT INTO "meme_translation" ("id", "meme_id", "locale", "title", "description", "keywords", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  "id",
  'fr',
  "title",
  "description",
  "keywords",
  NOW(),
  NOW()
FROM "meme";

-- DataMigration: Copy existing category title/keywords into CategoryTranslation(locale="fr")
INSERT INTO "category_translation" ("id", "category_id", "locale", "title", "keywords", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  "id",
  'fr',
  "title",
  "keywords",
  NOW(),
  NOW()
FROM "category";

-- DataMigration: Create CategoryTranslation(locale="en") with translated titles based on slug
INSERT INTO "category_translation" ("id", "category_id", "locale", "title", "keywords", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  "id",
  'en',
  CASE "slug"
    WHEN 'sad' THEN 'Sad'
    WHEN 'angry' THEN 'Angry'
    WHEN 'laught' THEN 'Laugh'
    WHEN 'no' THEN 'No'
    WHEN 'cringe' THEN 'Cringe'
    WHEN 'thanks' THEN 'Thanks'
    WHEN 'twitch' THEN 'Twitch'
    WHEN 'politics-in-france' THEN 'Politics in France'
    WHEN 'youtube' THEN 'YouTube'
    WHEN 'tv' THEN 'Seen on TV'
    WHEN 'theater' THEN 'Cinema'
    WHEN 'fight' THEN 'Fight'
    WHEN 'insult' THEN 'Insult'
    ELSE "title"
  END,
  ARRAY[]::TEXT[],
  NOW(),
  NOW()
FROM "category";
