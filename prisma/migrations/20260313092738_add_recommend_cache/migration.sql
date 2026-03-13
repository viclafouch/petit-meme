-- CreateTable
CREATE TABLE "recommend_cache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommend_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "recommend_cache_expires_at_idx" ON "recommend_cache"("expires_at");
