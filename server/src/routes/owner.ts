/** Survey owner API: F-03 authoring, F-04 lifecycle (and F-06 summary later). */
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError, notFound, validationFailed } from "../lib/errors";
import { canTransition, validateSurveyInput, type LifecycleAction, type SurveyInput } from "../domain/surveyRules";

export const ownerRouter = Router();
ownerRouter.use(requireAuth, requireRole("SURVEY_OWNER"));

const surveyInclude = {
  questions: {
    orderBy: { position: "asc" },
    include: { options: { orderBy: { position: "asc" } } },
  },
} satisfies Prisma.SurveyInclude;

type SurveyWithQuestions = Prisma.SurveyGetPayload<{ include: typeof surveyInclude }>;

export function parseId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw notFound();
  return id;
}

/** Number of responses per survey id. */
export async function responseCounts(surveyIds: number[]): Promise<Map<number, number>> {
  if (surveyIds.length === 0) return new Map();
  const rows = await prisma.response.groupBy({
    by: ["surveyId"],
    where: { surveyId: { in: surveyIds } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.surveyId, r._count._all]));
}

export function toSurveyDetail(s: SurveyWithQuestions, responseCount: number) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status,
    createdAt: s.createdAt,
    publishedAt: s.publishedAt,
    closedAt: s.closedAt,
    responseCount,
    questions: s.questions.map((q) => ({
      id: q.id,
      position: q.position,
      text: q.text,
      type: q.type,
      required: q.required,
      options: q.options.map((o) => ({ id: o.id, position: o.position, label: o.label })),
    })),
  };
}

/** BR-06: the owner filter is part of the query, so other owners' surveys look missing (404). */
export async function loadOwnSurvey(id: number, ownerId: number) {
  const survey = await prisma.survey.findFirst({ where: { id, ownerId }, include: surveyInclude });
  if (!survey) throw notFound();
  return survey;
}

async function detailResponse(id: number) {
  const survey = await prisma.survey.findUniqueOrThrow({ where: { id }, include: surveyInclude });
  const counts = await responseCounts([id]);
  return { survey: toSurveyDetail(survey, counts.get(id) ?? 0) };
}

const questionCreate = (questions: SurveyInput["questions"]) =>
  questions.map((q, i) => ({
    position: i + 1,
    text: q.text,
    type: q.type,
    required: q.required,
    options: { create: q.options.map((label, j) => ({ position: j + 1, label })) },
  }));

// FR-08: list own surveys
ownerRouter.get("/surveys", async (req, res) => {
  const surveys = await prisma.survey.findMany({
    where: { ownerId: req.user!.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const counts = await responseCounts(surveys.map((s) => s.id));
  res.json({
    surveys: surveys.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      responseCount: counts.get(s.id) ?? 0,
      createdAt: s.createdAt,
      publishedAt: s.publishedAt,
      closedAt: s.closedAt,
    })),
  });
});

// FR-04: create draft
ownerRouter.post("/surveys", async (req, res) => {
  const result = validateSurveyInput(req.body);
  if (!result.ok) throw validationFailed(result.details);
  const { title, description, questions } = result.value;
  const created = await prisma.survey.create({
    data: { ownerId: req.user!.id, title, description, questions: { create: questionCreate(questions) } },
  });
  res.status(201).json(await detailResponse(created.id));
});

ownerRouter.get("/surveys/:id", async (req, res) => {
  const survey = await loadOwnSurvey(parseId(req.params.id), req.user!.id);
  res.json(await detailResponse(survey.id));
});

// FR-05: edit draft (BR-05: only DRAFT is editable)
ownerRouter.put("/surveys/:id", async (req, res) => {
  const survey = await loadOwnSurvey(parseId(req.params.id), req.user!.id);
  if (survey.status !== "DRAFT") {
    throw new AppError(409, "SURVEY_NOT_EDITABLE", "Only draft surveys can be edited");
  }
  const result = validateSurveyInput(req.body);
  if (!result.ok) throw validationFailed(result.details);
  const { title, description, questions } = result.value;

  await prisma.$transaction(async (tx) => {
    // Re-check the status inside the transaction so a concurrent publish wins safely.
    const updated = await tx.survey.updateMany({
      where: { id: survey.id, ownerId: req.user!.id, status: "DRAFT" },
      data: { title, description },
    });
    if (updated.count === 0) throw new AppError(409, "SURVEY_NOT_EDITABLE", "Only draft surveys can be edited");
    await tx.question.deleteMany({ where: { surveyId: survey.id } });
    for (const q of questionCreate(questions)) {
      await tx.question.create({ data: { ...q, surveyId: survey.id } });
    }
  });
  res.json(await detailResponse(survey.id));
});

// FR-06 / FR-07: lifecycle (BR-04)
async function transition(surveyId: number, ownerId: number, action: LifecycleAction) {
  const survey = await loadOwnSurvey(surveyId, ownerId);
  if (!canTransition(survey.status, action)) {
    throw new AppError(409, "INVALID_TRANSITION", `A ${survey.status.toLowerCase()} survey cannot be ${action === "publish" ? "published" : "closed"}`);
  }
  if (action === "publish" && survey.questions.length === 0) {
    throw new AppError(409, "NO_QUESTIONS", "Add at least one question before publishing");
  }
  const now = new Date();
  const result = await prisma.survey.updateMany({
    where: { id: survey.id, ownerId, status: survey.status },
    data: action === "publish" ? { status: "PUBLISHED", publishedAt: now } : { status: "CLOSED", closedAt: now },
  });
  if (result.count === 0) throw new AppError(409, "INVALID_TRANSITION", "The survey status changed; reload and try again");
}

ownerRouter.post("/surveys/:id/publish", async (req, res) => {
  const id = parseId(req.params.id);
  await transition(id, req.user!.id, "publish");
  res.json(await detailResponse(id));
});

ownerRouter.post("/surveys/:id/close", async (req, res) => {
  const id = parseId(req.params.id);
  await transition(id, req.user!.id, "close");
  res.json(await detailResponse(id));
});
