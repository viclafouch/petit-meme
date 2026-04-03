-- CreateTable
CREATE TABLE "ai_search_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "category_slugs" TEXT[],
    "meme_ids" TEXT[],
    "locale" TEXT NOT NULL,
    "result_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_search_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_search_log_user_id_created_at_idx" ON "ai_search_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_search_log_created_at_idx" ON "ai_search_log"("created_at");

-- AddForeignKey
ALTER TABLE "ai_search_log" ADD CONSTRAINT "ai_search_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
