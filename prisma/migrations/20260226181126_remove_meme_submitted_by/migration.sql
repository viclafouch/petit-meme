/*
  Warnings:

  - You are about to drop the column `submittedBy` on the `Meme` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Meme" DROP CONSTRAINT "Meme_submittedBy_fkey";

-- DropIndex
DROP INDEX "Meme_submittedBy_idx";

-- AlterTable
ALTER TABLE "Meme" DROP COLUMN "submittedBy";
