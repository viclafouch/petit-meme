-- CreateEnum
CREATE TYPE "meme_submission_url_type" AS ENUM ('TWEET', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "meme_submission_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "meme_submission" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "url_type" "meme_submission_url_type" NOT NULL,
    "content_locale" "meme_content_locale" NOT NULL,
    "status" "meme_submission_status" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "meme_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meme_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meme_submission_url_key" ON "meme_submission"("url");

-- CreateIndex
CREATE INDEX "meme_submission_status_idx" ON "meme_submission"("status");

-- CreateIndex
CREATE INDEX "meme_submission_user_id_idx" ON "meme_submission"("user_id");

-- CreateIndex
CREATE INDEX "meme_submission_status_created_at_idx" ON "meme_submission"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "meme_submission" ADD CONSTRAINT "meme_submission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meme_submission" ADD CONSTRAINT "meme_submission_meme_id_fkey" FOREIGN KEY ("meme_id") REFERENCES "meme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
