-- BackfillNulls
UPDATE "user" SET locale = 'fr' WHERE locale IS NULL;

-- CreateEnum
CREATE TYPE "UserLocale" AS ENUM ('fr', 'en');

-- ConvertColumn (in-place, no data loss)
ALTER TABLE "user" ALTER COLUMN "locale" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "locale" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "locale" TYPE "UserLocale" USING locale::"UserLocale";
ALTER TABLE "user" ALTER COLUMN "locale" SET DEFAULT 'fr';
