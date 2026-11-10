UPDATE "meme"
SET "fill_status" = 'WAITING'
WHERE "status" = 'PENDING'
  AND "title" = 'Sans titre'
  AND "fill_status" = 'NONE';
