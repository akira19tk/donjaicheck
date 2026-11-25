-- CR-01 (Lab 7): respondents may correct their response (BR-15). Existing rows: editCount 0, editedAt NULL.
ALTER TABLE "Response" ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "editCount" INTEGER NOT NULL DEFAULT 0;
