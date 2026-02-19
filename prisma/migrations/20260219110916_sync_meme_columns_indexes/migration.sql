-- AlterTable
ALTER TABLE "Meme" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Meme" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Meme_status_idx" ON "Meme"("status");

-- CreateIndex
CREATE INDEX "Meme_status_viewCount_idx" ON "Meme"("status", "viewCount");
