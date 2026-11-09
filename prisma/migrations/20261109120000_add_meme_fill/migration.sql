-- CreateEnum
CREATE TYPE "meme_fill_status" AS ENUM ('NONE', 'WAITING', 'RUNNING', 'FILLED');

-- AlterTable
ALTER TABLE "meme" ADD COLUMN     "fill_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fill_doubt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fill_status" "meme_fill_status" NOT NULL DEFAULT 'NONE';

