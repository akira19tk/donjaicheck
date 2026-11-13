import { prisma } from "../../src/prisma";

/** A valid create/edit body with one question of each type. */
export const validSurveyBody = () => ({
  title: "Dinner experience",
  description: "Tell us about your meal today",
  questions: [
    { text: "How was the taste?", type: "RATING", required: true },
    { text: "Favourite dish", type: "SINGLE_CHOICE", required: true, options: ["Pad Thai", "Tom Yum", "Green curry"] },
    { text: "Any comments?", type: "TEXT", required: false },
  ],
});

/** Insert a survey directly (fixture) with the given status and questions. */
export async function makeSurvey(
  ownerId: number,
  status: "DRAFT" | "PUBLISHED" | "CLOSED" = "DRAFT",
  opts: { withQuestions?: boolean; title?: string } = {}
) {
  const withQuestions = opts.withQuestions ?? true;
  return prisma.survey.create({
    data: {
      ownerId,
      title: opts.title ?? `Survey ${status}`,
      status,
      publishedAt: status === "DRAFT" ? null : new Date(),
      closedAt: status === "CLOSED" ? new Date() : null,
      questions: withQuestions
        ? {
            create: [
              { position: 1, text: "How was the taste?", type: "RATING", required: true },
              {
                position: 2,
                text: "Favourite dish",
                type: "SINGLE_CHOICE",
                required: true,
                options: { create: [{ position: 1, label: "X" }, { position: 2, label: "Y" }, { position: 3, label: "Z" }] },
              },
              { position: 3, text: "Comments", type: "TEXT", required: false },
            ],
          }
        : undefined,
    },
    include: { questions: { include: { options: true }, orderBy: { position: "asc" } } },
  });
}
