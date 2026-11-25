-- F-09 Multiple-choice questions (FR-15, BR-12)
ALTER TYPE "QuestionType" ADD VALUE 'MULTIPLE_CHOICE';

ALTER TABLE "Question" ADD COLUMN "minSelections" INTEGER,
ADD COLUMN "maxSelections" INTEGER;

-- One row per selected option of a multiple-choice answer.
CREATE TABLE "AnswerOption" (
    "answerId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("answerId","optionId")
);

CREATE INDEX "AnswerOption_optionId_idx" ON "AnswerOption"("optionId");

ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
