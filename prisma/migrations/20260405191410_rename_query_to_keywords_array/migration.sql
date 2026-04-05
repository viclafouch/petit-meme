/*
  Warnings:

  - You are about to drop the column `query` on the `ai_search_log` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_search_log" DROP COLUMN "query",
ADD COLUMN     "keywords" TEXT[];
