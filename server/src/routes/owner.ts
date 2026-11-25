/** Survey owner API: F-03 authoring, F-04 lifecycle, F-06 summary. */
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError, notFound, validationFailed } from "../lib/errors";
import { canTransition, validateSurveyInput, type LifecycleAction, type SurveyInput } from "../domain/surveyRules";
import { buildSummary } from "../domain/summary";
import { validateClosesAt } from "../domain/closing";
import { generateVisitCode, validateCodeCount } from "../domain/visitCodes";
import { buildCsv } from "../domain/csvExport";
import { closeExpired } from "../lib/closeExpired";

export const ownerRouter = Router();
ownerRouter.use(requireAuth, requireRole("SURVEY_OWNER"), closeExpired);

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

export function toSurveyDetail(s: SurveyWithQuestions, responseCount: number, codes = { total: 0, used: 0 }) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status,
    createdAt: s.createdAt,
    publishedAt: s.publishedAt,
    closedAt: s.closedAt,
    closesAt: s.closesAt,
    requiresVisitCode: s.requiresVisitCode,
    visitCodeCount: codes.total,
    usedVisitCodeCount: codes.used,
    responseCount,
    questions: s.questions.map((q) => ({
      id: q.id,
      position: q.position,
      text: q.text,
      type: q.type,
      required: q.required,
      minSelections: q.minSelections,
      maxSelections: q.maxSelections,
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
  const [counts, total, used] = await Promise.all([
    responseCounts([id]),
    prisma.visitCode.count({ where: { surveyId: id } }),
    prisma.visitCode.count({ where: { surveyId: id, usedAt: { not: null } } }),
  ]);
  return { survey: toSurveyDetail(survey, counts.get(id) ?? 0, { total, used }) };
}

const questionCreate = (questions: SurveyInput["questions"]) =>
  questions.map((q, i) => ({
    position: i + 1,
    text: q.text,
    type: q.type,
    required: q.required,
    minSelections: q.minSelections ?? null,
    maxSelections: q.maxSelections ?? null,
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
      closesAt: s.closesAt,
    })),
  });
});

// FR-04: create draft
/** Validates the survey body and the optional F-08 closesAt together, reporting every problem at once. */
function validateBody(body: unknown) {
  const result = validateSurveyInput(body);
  const raw = (typeof body === "object" && body !== null ? (body as Record<string, unknown>).closesAt : undefined);
  const closing = validateClosesAt(raw, new Date());
  const details = [...(result.ok ? [] : result.details), ...(closing.ok ? [] : closing.details)];
  if (!result.ok || !closing.ok) throw validationFailed(details);
  // closesAt absent -> undefined, so an edit that does not send it keeps the stored schedule.
  return { ...result.value, closesAt: raw === undefined ? undefined : closing.value };
}

ownerRouter.post("/surveys", async (req, res) => {
  const { title, description, questions, closesAt, requiresVisitCode } = validateBody(req.body);
  const created = await prisma.survey.create({
    data: {
      ownerId: req.user!.id,
      title,
      description,
      closesAt,
      requiresVisitCode: requiresVisitCode ?? false,
      questions: { create: questionCreate(questions) },
    },
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
  const { title, description, questions, closesAt, requiresVisitCode } = validateBody(req.body);

  await prisma.$transaction(async (tx) => {
    // Re-check the status inside the transaction so a concurrent publish wins safely.
    const updated = await tx.survey.updateMany({
      where: { id: survey.id, ownerId: req.user!.id, status: "DRAFT" },
      data: { title, description, closesAt, requiresVisitCode },
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
  if (action === "publish" && survey.closesAt && survey.closesAt.getTime() <= now.getTime()) {
    throw new AppError(409, "CLOSING_TIME_PASSED", "The closing time has already passed; change it before publishing");
  }
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

// FR-14 / F-08: set or clear the closing time of an own DRAFT or PUBLISHED survey (BR-11)
ownerRouter.put("/surveys/:id/closing", async (req, res) => {
  const survey = await loadOwnSurvey(parseId(req.params.id), req.user!.id);
  if (survey.status === "CLOSED") throw new AppError(409, "SURVEY_CLOSED", "A closed survey cannot be scheduled");
  const closing = validateClosesAt(req.body?.closesAt, new Date());
  if (!closing.ok) throw validationFailed(closing.details);
  const updated = await prisma.survey.updateMany({
    where: { id: survey.id, ownerId: req.user!.id, status: { in: ["DRAFT", "PUBLISHED"] } },
    data: { closesAt: closing.value },
  });
  if (updated.count === 0) throw new AppError(409, "SURVEY_CLOSED", "A closed survey cannot be scheduled");
  res.json(await detailResponse(survey.id));
});

// FR-13 / F-07: generate single-use visit codes for an own restricted survey (BR-09)
ownerRouter.post("/surveys/:id/visit-codes", async (req, res) => {
  const survey = await loadOwnSurvey(parseId(req.params.id), req.user!.id);
  const count = validateCodeCount(req.body?.count);
  if (!count.ok) throw validationFailed(count.details);
  if (!survey.requiresVisitCode) {
    throw new AppError(409, "VISIT_CODES_NOT_ENABLED", "Turn on 'Require a visit code' for this survey first");
  }
  if (survey.status === "CLOSED") throw new AppError(409, "SURVEY_CLOSED", "A closed survey does not need new codes");

  const created: { code: string; createdAt: Date }[] = [];
  // Codes are unique system-wide; on the (very unlikely) collision a new code is drawn.
  for (let attempts = 0; created.length < count.value && attempts < count.value * 5; attempts++) {
    try {
      created.push(
        await prisma.visitCode.create({ data: { surveyId: survey.id, code: generateVisitCode() }, select: { code: true, createdAt: true } })
      );
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  res.status(201).json({ codes: created });
});

ownerRouter.get("/surveys/:id/visit-codes", async (req, res) => {
  const survey = await loadOwnSurvey(parseId(req.params.id), req.user!.id);
  const codes = await prisma.visitCode.findMany({
    where: { surveyId: survey.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { code: true, createdAt: true, usedAt: true },
  });
  res.json({ codes });
});

// FR-16 / F-10: CSV export of an own survey's responses (BR-06, BR-13)
ownerRouter.get("/surveys/:id/export.csv", async (req, res) => {
  const survey = await loadOwnSurvey(parseId(req.params.id), req.user!.id);
  const responses = await prisma.response.findMany({
    where: { surveyId: survey.id },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    include: {
      respondent: { select: { name: true, email: true } },
      visitCode: { select: { code: true } },
      answers: { include: { option: true, selections: { include: { option: true } } } },
    },
  });
  const rows = responses.map((r) => ({
    id: r.id,
    submittedAt: r.submittedAt,
    editedAt: r.editedAt,
    name: r.respondent.name,
    email: r.respondent.email,
    visitCode: r.visitCode?.code ?? null,
    values: survey.questions.map((q) => {
      const a = r.answers.find((x) => x.questionId === q.id);
      if (!a) return null;
      if (q.type === "RATING") return a.ratingValue;
      if (q.type === "SINGLE_CHOICE") return a.option?.label ?? null;
      if (q.type === "MULTIPLE_CHOICE") {
        const labels = a.selections.map((x) => x.option).sort((x, y) => x.position - y.position).map((o) => o.label);
        return labels.length ? labels.join("; ") : null;
      }
      return a.textValue;
    }),
  }));
  const csv = buildCsv(survey.questions, rows, { includeVisitCode: survey.requiresVisitCode });
  res
    .status(200)
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="donjaicheck-survey-${survey.id}-responses.csv"`,
      "Cache-Control": "no-store",
    })
    .send(csv);
});

// FR-12 / F-06: aggregate summary of an own survey (BR-06)
ownerRouter.get("/surveys/:id/summary", async (req, res) => {
  const survey = await loadOwnSurvey(parseId(req.params.id), req.user!.id);
  const [responseCount, answers] = await Promise.all([
    prisma.response.count({ where: { surveyId: survey.id } }),
    prisma.answer.findMany({
      where: { response: { surveyId: survey.id } },
      select: {
        questionId: true,
        ratingValue: true,
        optionId: true,
        textValue: true,
        selections: { select: { optionId: true } },
        response: { select: { submittedAt: true } },
      },
    }),
  ]);
  res.json({
    survey: { id: survey.id, title: survey.title, status: survey.status },
    responseCount,
    questions: buildSummary(
      survey.questions.map((q) => ({
        id: q.id,
        position: q.position,
        text: q.text,
        type: q.type,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      })),
      answers.map((a) => ({ ...a, optionIds: a.selections.map((x) => x.optionId), submittedAt: a.response.submittedAt }))
    ),
  });
});
