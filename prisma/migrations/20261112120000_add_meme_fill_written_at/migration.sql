-- AlterTable
ALTER TABLE "meme" ADD COLUMN     "fill_written_at" TIMESTAMP(3);

UPDATE "meme"
SET "fill_written_at" = "updated_at"
WHERE "status" = 'PENDING'
  AND "fill_status" = 'FILLED'
  AND "fill_suggestion" IS NULL;
