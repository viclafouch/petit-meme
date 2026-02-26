-- AlterTable
ALTER TABLE "Meme" ADD COLUMN     "downloadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shareCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "studio_generation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_generation_createdAt_idx" ON "studio_generation"("createdAt");

-- CreateIndex
CREATE INDEX "studio_generation_userId_createdAt_idx" ON "studio_generation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Meme_status_publishedAt_idx" ON "Meme"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "MemeViewDaily_day_idx" ON "MemeViewDaily"("day");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");

-- CreateIndex
CREATE INDEX "user_bookmark_createdAt_idx" ON "user_bookmark"("createdAt");

-- AddForeignKey
ALTER TABLE "studio_generation" ADD CONSTRAINT "studio_generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
