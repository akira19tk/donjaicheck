-- F-08 Scheduled closing (FR-14, BR-11)
ALTER TABLE "Survey" ADD COLUMN "closesAt" TIMESTAMP(3);

-- Used by closeExpiredSurveys(): PUBLISHED surveys whose closing time has passed.
CREATE INDEX "Survey_status_closesAt_idx" ON "Survey"("status", "closesAt");
