import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/ncert-lesson-pdf")({ server: { handlers: {
  GET: async ({ request }) => { const { streamNcertLessonPdf } = await import("@/lib/ncert-lesson-pdf-stream.server"); return streamNcertLessonPdf(request); },
  HEAD: async ({ request }) => { const { streamNcertLessonPdf } = await import("@/lib/ncert-lesson-pdf-stream.server"); return streamNcertLessonPdf(request); },
} } });
