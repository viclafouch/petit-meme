-- CreateEnum
CREATE TYPE "meme_export_format" AS ENUM ('mp4', 'mp3');

-- AlterTable
ALTER TABLE "activity_event" ADD COLUMN     "format" "meme_export_format";

