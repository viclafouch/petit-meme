-- AlterTable
ALTER TABLE "studio_generation" ADD COLUMN     "memeId" TEXT;

-- CreateIndex
CREATE INDEX "studio_generation_memeId_createdAt_idx" ON "studio_generation"("memeId", "createdAt");

-- AddForeignKey
ALTER TABLE "studio_generation" ADD CONSTRAINT "studio_generation_memeId_fkey" FOREIGN KEY ("memeId") REFERENCES "Meme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
