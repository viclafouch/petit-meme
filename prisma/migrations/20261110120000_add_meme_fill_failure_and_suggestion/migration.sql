-- AlterEnum
ALTER TYPE "meme_fill_status" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "meme" ADD COLUMN     "fill_suggestion" JSONB;
