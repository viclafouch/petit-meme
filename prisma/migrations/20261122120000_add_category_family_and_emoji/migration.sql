-- CreateEnum
CREATE TYPE "category_family" AS ENUM ('MOOD', 'REPLY', 'THEME', 'SOURCE');

-- AlterTable
ALTER TABLE "category" ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "family" "category_family";

-- Fill the existing categories
UPDATE "category" AS c
SET "family" = v.family::"category_family", "emoji" = v.emoji
FROM (VALUES
  ('laught', 'MOOD', 'face-with-tears-of-joy'),
  ('happy', 'MOOD', 'beaming-face-with-smiling-eyes'),
  ('sad', 'MOOD', 'crying-face'),
  ('angry', 'MOOD', 'pouting-face'),
  ('cringe', 'MOOD', 'grimacing-face'),
  ('celebrate', 'MOOD', 'partying-face'),
  ('no', 'REPLY', 'cross-mark'),
  ('thanks', 'REPLY', 'folded-hands'),
  ('question', 'REPLY', 'thinking-face'),
  ('insult', 'REPLY', 'face-with-symbols-on-mouth'),
  ('flirt', 'REPLY', 'smirking-face'),
  ('food', 'THEME', 'hamburger'),
  ('work', 'THEME', 'briefcase'),
  ('sport', 'THEME', 'soccer-ball'),
  ('alcool', 'THEME', 'clinking-beer-mugs'),
  ('fight', 'THEME', 'boxing-glove'),
  ('beauf', 'THEME', 'billed-cap'),
  ('politics-in-france', 'THEME', 'classical-building'),
  ('tv', 'SOURCE', 'television'),
  ('theater', 'SOURCE', 'clapper-board'),
  ('youtube', 'SOURCE', 'play-button'),
  ('twitch', 'SOURCE', 'studio-microphone'),
  ('video-games', 'SOURCE', 'joystick'),
  ('music', 'SOURCE', 'musical-note')
) AS v(slug, family, emoji)
WHERE c."slug" = v.slug;
