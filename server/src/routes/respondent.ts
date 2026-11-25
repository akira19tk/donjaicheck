/** Respondent API — F-05 (FR-09, FR-10, FR-11; BR-01, BR-02, BR-03, BR-07). */
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError, notFound, validationFailed } from "../lib/errors";
import { canEditResponse, EDIT_WINDOW_MINUTES, MAX_EDITS, validateResponse, type ValidAnswer } from "../domain/responseRules";
import type { QuestionTypeName } from "../domain/surveyRules";
import { parseId } from "./owner";
import { closeExpired } from "../lib/closeExpired";
import { normalizeVisitCode } from "../domain/visitCodes";
import { isAcceptingResponses } from "../domain/closing";

export const respondentRouter = Router();
// Guards are per route (this router is mounted on /api, so a router-wide guard would catch every /api path).
const respondentRole = requireRole("RESPONDENT");

/** Prisma nested-create data for validated answers (F-09: one AnswerOption row per selected option). */
function answerCreate(answers: ValidAnswer[]) {
  return answers.map(({ optionIds, ...a }) =>
    optionIds ? { ...a, selections: { create: optionIds.map((optionId) => ({ optionId })) } } : a
  );
}

/** Validation input for a survey's questions (shared by submit and CR-01 edit). */
function questionsForValidation(questions: { id: number; type: QuestionTypeName; required: boolean; minSelections: number | null; maxSelections: number | null; options: { id: number }[] }[]) {
  return questions.map((q) => ({
    id: q.id,
    type: q.type,
    required: q.required,
    optionIds: q.options.map((o) => o.id),
    minSelections: q.minSelections,
    maxSelections: q.maxSelections,
  }));
}

const invalidVisitCode = () => new AppError(400, "INVALID_VISIT_CODE", "This visit code is not valid for this survey");
const visitCodeUsed = () => new AppError(409, "VISIT_CODE_USED", "This visit code has already been used");

const alreadyResponded = () => new AppError(409, "ALREADY_RESPONDED", "You have already answered this survey");

// FR-09: published surveys, with "already answered" flag for the caller
respondentRouter.get("/surveys", requireAuth, respondentRole, closeExpired, async (req, res) => {
  const surveys = await prisma.survey.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    include: {
      _count: { select: { questions: true } },
      responses: { where: { respondentId: req.user!.id }, select: { id: true } },
    },
  });
  res.json({
    surveys: surveys.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      questionCount: s._count.questions,
      hasResponded: s.responses.length > 0,
      responseId: s.responses[0]?.id ?? null,
    })),
  });
});

// Survey form. DRAFT surveys are invisible to respondents (404).
respondentRouter.get("/surveys/:id", requireAuth, respondentRole, closeExpired, async (req, res) => {
  const survey = await prisma.survey.findFirst({
    where: { id: parseId(req.params.id), status: { in: ["PUBLISHED", "CLOSED"] } },
    include: {
      questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } },
      responses: { where: { respondentId: req.user!.id }, select: { id: true } },
    },
  });
  if (!survey) throw notFound();
  res.json({
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      closesAt: survey.closesAt,
      requiresVisitCode: survey.requiresVisitCode,
      questions: survey.questions.map((q) => ({
        id: q.id,
        position: q.position,
        text: q.text,
        type: q.type,
        required: q.required,
        minSelections: q.minSelections,
        maxSelections: q.maxSelections,
        options: q.options.map((o) => ({ id: o.id, position: o.position, label: o.label })),
      })),
    },
    responseId: survey.responses[0]?.id ?? null,
  });
});

// FR-10: submit a response (order of checks per F-05 contract step 3)
respondentRouter.post("/surveys/:id/responses", requireAuth, respondentRole, closeExpired, async (req, res) => {
  const surveyId = parseId(req.params.id);
  const respondentId = req.user!.id;
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, status: { in: ["PUBLISHED", "CLOSED"] } },
    include: { questions: { orderBy: { position: "asc" }, include: { options: { select: { id: true } } } } },
  });
  if (!survey) throw notFound(); // missing or DRAFT
  if (survey.status !== "PUBLISHED") {
    throw new AppError(409, "SURVEY_NOT_OPEN", "This survey is closed and no longer accepts responses"); // BR-02
  }
  const existing = await prisma.response.findUnique({ where: { surveyId_respondentId: { surveyId, respondentId } } });
  if (existing) throw alreadyResponded(); // BR-01

  const result = validateResponse(
    questionsForValidation(survey.questions),
    req.body?.answers
  ); // BR-03
  // F-07 (BR-09): a restricted survey needs a visit code; report it together with any answer problems.
  const rawCode = req.body?.visitCode;
  const codeMissing = survey.requiresVisitCode && (rawCode === undefined || rawCode === null || String(rawCode).trim() === "");
  if (!result.ok || codeMissing) {
    throw validationFailed([
      ...(codeMissing ? [{ field: "visitCode", message: "Required" }] : []),
      ...(result.ok ? [] : result.details),
    ]);
  }
  let visitCode: string | null = null;
  if (survey.requiresVisitCode) {
    visitCode = normalizeVisitCode(rawCode);
    if (!visitCode) throw invalidVisitCode();
    // Another survey's code gets the same answer as an unknown code (does not reveal other surveys).
    const found = await prisma.visitCode.findFirst({ where: { code: visitCode, surveyId } });
    if (!found) throw invalidVisitCode();
    if (found.usedAt) throw visitCodeUsed();
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-check the status inside the transaction so a survey closed a moment ago is not answered.
      // F-08: the deadline is re-checked here too, so a late submission is rejected even without a prior read.
      const open = await tx.survey.count({
        where: { id: surveyId, status: "PUBLISHED", OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] },
      });
      if (!open) throw new AppError(409, "SURVEY_NOT_OPEN", "This survey is closed and no longer accepts responses");
      const response = await tx.response.create({
        data: {
          surveyId,
          respondentId,
          answers: {
            // F-09: a multiple-choice answer is one Answer row plus one AnswerOption row per selected option.
            create: answerCreate(result.answers),
          },
        },
      });
      if (visitCode) {
        // Consume the code in the same transaction; if someone else used it a moment ago, roll everything back.
        const consumed = await tx.visitCode.updateMany({
          where: { code: visitCode, surveyId, usedAt: null },
          data: { usedAt: new Date(), responseId: response.id },
        });
        if (consumed.count === 0) throw visitCodeUsed();
      }
      return response;
    });
    res.status(201).json({ response: { id: created.id, surveyId, submittedAt: created.submittedAt } });
  } catch (e) {
    // Two simultaneous submissions: the unique (surveyId, respondentId) key rejects the second (BR-01).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw alreadyResponded();
    throw e;
  }
});

// FR-11: own response only (BR-07). Someone else's response looks missing (404).
respondentRouter.get("/responses/:id", requireAuth, respondentRole, async (req, res) => {
  const response = await prisma.response.findFirst({
    where: { id: parseId(req.params.id), respondentId: req.user!.id },
    include: {
      survey: { select: { id: true, title: true, status: true, closesAt: true } },
      answers: {
        include: { question: true, option: true, selections: { include: { option: true } } },
        orderBy: { question: { position: "asc" } },
      },
    },
  });
  if (!response) throw notFound();
  const now = new Date();
  const edit = canEditResponse(response, isAcceptingResponses(response.survey.status, response.survey.closesAt, now), now);
  res.json({
    response: {
      id: response.id,
      submittedAt: response.submittedAt,
      editedAt: response.editedAt,
      editCount: response.editCount,
      maxEdits: MAX_EDITS,
      canEdit: edit.ok,
      editableUntil: edit.ok ? edit.editableUntil : null,
      survey: { id: response.survey.id, title: response.survey.title },
      answers: response.answers.map((a) => ({
        questionId: a.questionId,
        questionText: a.question.text,
        type: a.question.type,
        rating: a.ratingValue,
        optionId: a.optionId,
        optionIds: a.selections.map((x) => x.optionId),
        optionLabel: a.option?.label ?? null,
        optionLabels: a.selections
          .map((x) => x.option)
          .sort((x, y) => x.position - y.position)
          .map((o) => o.label),
        text: a.textValue,
      })),
    },
  });
});

// CR-01 (Lab 7) / BR-15: correct my own response within 30 minutes, at most 3 times, while the survey is open.
respondentRouter.put("/responses/:id", requireAuth, respondentRole, closeExpired, async (req, res) => {
  const responseId = parseId(req.params.id);
  const respondentId = req.user!.id;
  const response = await prisma.response.findFirst({
    where: { id: responseId, respondentId }, // BR-07: another respondent's response is "not found"
    include: {
      survey: { include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } } },
    },
  });
  if (!response) throw notFound();
  const { survey } = response;

  const now = new Date();
  const check = canEditResponse(response, isAcceptingResponses(survey.status, survey.closesAt, now), now);
  if (!check.ok) throw new AppError(409, check.code, check.message);

  const result = validateResponse(questionsForValidation(survey.questions), req.body?.answers); // BR-03 / BR-12 reused
  if (!result.ok) throw validationFailed(result.details);

  const updated = await prisma.$transaction(async (tx) => {
    // Re-check window, limit and survey state inside the transaction (parallel edits, deadline just passed).
    const windowStart = new Date(Date.now() - EDIT_WINDOW_MINUTES * 60_000);
    const open = await tx.survey.count({
      where: { id: survey.id, status: "PUBLISHED", OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] },
    });
    if (open === 0) throw new AppError(409, "SURVEY_NOT_OPEN", "This survey no longer accepts changes");
    const claimed = await tx.response.updateMany({
      where: { id: responseId, respondentId, editCount: { lt: MAX_EDITS }, submittedAt: { gt: windowStart } },
      data: { editCount: { increment: 1 }, editedAt: new Date() },
    });
    if (claimed.count === 0) {
      const latest = await tx.response.findUniqueOrThrow({ where: { id: responseId } });
      const again = canEditResponse(latest, true, new Date());
      throw new AppError(409, again.ok ? "EDIT_LIMIT_REACHED" : again.code, again.ok ? "Please try again" : again.message);
    }
    // Replace the answers (AnswerOption rows are removed by ON DELETE CASCADE).
    await tx.answer.deleteMany({ where: { responseId } });
    for (const data of answerCreate(result.answers)) {
      await tx.answer.create({ data: { ...data, responseId } });
    }
    return tx.response.findUniqueOrThrow({
      where: { id: responseId },
      select: { id: true, submittedAt: true, editedAt: true, editCount: true },
    });
  });

  res.json({ response: updated });
});
