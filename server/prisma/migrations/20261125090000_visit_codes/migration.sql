-- F-07 Visit-code eligibility (FR-13, BR-09)
ALTER TABLE "Survey" ADD COLUMN "requiresVisitCode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VisitCode" (
    "id" SERIAL NOT NULL,
    "surveyId" INTEGER NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "responseId" INTEGER,

    CONSTRAINT "VisitCode_pkey" PRIMARY KEY ("id")
);

-- BR-09: a code is unique system-wide and can be linked to at most one response.
CREATE UNIQUE INDEX "VisitCode_code_key" ON "VisitCode"("code");
CREATE UNIQUE INDEX "VisitCode_responseId_key" ON "VisitCode"("responseId");
CREATE INDEX "VisitCode_surveyId_usedAt_idx" ON "VisitCode"("surveyId", "usedAt");

-- AddForeignKey
ALTER TABLE "VisitCode" ADD CONSTRAINT "VisitCode_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCode" ADD CONSTRAINT "VisitCode_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE SET NULL ON UPDATE CASCADE;
