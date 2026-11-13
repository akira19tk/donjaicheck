/** Respondent API — F-05 (FR-09, FR-10, FR-11; BR-01, BR-02, BR-03, BR-07). */
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError, notFound, validationFailed } from "../lib/errors";
import { validateResponse } from "../domain/responseRules";
import { parseId } from "./owner";

export const respondentRouter = Router();
// Guards are per route (this router is mounted on /api, so a router-wide guard would catch every /api path).
const respondentRole = requireRole("RESPONDENT");

const alreadyResponded = () => new AppError(409, "ALREADY_RESPONDED", "You have already answered this survey");

// FR-09: published surveys, with "already answered" flag for the caller
respondentRouter.get("/surveys", requireAuth, respondentRole, async (req, res) => {
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
respondentRouter.get("/surveys/:id", requireAuth, respondentRole, async (req, res) => {
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
      questions: survey.questions.map((q) => ({
        id: q.id,
        position: q.position,
        text: q.text,
        type: q.type,
        required: q.required,
        options: q.options.map((o) => ({ id: o.id, position: o.position, label: o.label })),
      })),
    },
    responseId: survey.responses[0]?.id ?? null,
  });
});

// FR-10: submit a response (order of checks per F-05 contract step 3)
respondentRouter.post("/surveys/:id/responses", requireAuth, respondentRole, async (req, res) => {
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
    survey.questions.map((q) => ({ id: q.id, type: q.type, required: q.required, optionIds: q.options.map((o) => o.id) })),
    req.body?.answers
  ); // BR-03
  if (!result.ok) throw validationFailed(result.details);

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-check the status inside the transaction so a survey closed a moment ago is not answered.
      const open = await tx.survey.count({ where: { id: surveyId, status: "PUBLISHED" } });
      if (!open) throw new AppError(409, "SURVEY_NOT_OPEN", "This survey is closed and no longer accepts responses");
      return tx.response.create({
        data: { surveyId, respondentId, answers: { create: result.answers } },
      });
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
      survey: { select: { id: true, title: true } },
      answers: { include: { question: true, option: true }, orderBy: { question: { position: "asc" } } },
    },
  });
  if (!response) throw notFound();
  res.json({
    response: {
      id: response.id,
      submittedAt: response.submittedAt,
      survey: response.survey,
      answers: response.answers.map((a) => ({
        questionId: a.questionId,
        questionText: a.question.text,
        type: a.question.type,
        rating: a.ratingValue,
        optionLabel: a.option?.label ?? null,
        text: a.textValue,
      })),
    },
  });
});
