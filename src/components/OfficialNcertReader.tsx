import { BookOpen, ExternalLink } from "lucide-react";

type OfficialNcertReaderProps = {
  klass: string;
  subject: string;
  chapter: string;
  topic: string;
};

/**
 * A lightweight entry point to NCERT's own textbook service.
 * Textbook files remain on NCERT's domain; this app does not mirror or re-host them.
 */
export function OfficialNcertReader({ klass, subject, chapter, topic }: OfficialNcertReaderProps) {
  return (
    <section className="my-4 print:hidden" aria-label="Official NCERT textbook reader">
      <details className="group overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/80 to-background shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Read the official NCERT textbook</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Free chapter-wise PDFs from NCERT · opens in the official source
            </span>
          </span>
          <span className="text-sm font-medium text-sky-800 group-open:hidden">Open</span>
          <span className="hidden text-sm font-medium text-sky-800 group-open:inline">Close</span>
        </summary>
        <div className="border-t border-sky-200/80 px-4 pb-4 pt-3 sm:px-5">
          <p className="text-sm text-foreground">
            Your current lesson: <strong>Class {klass}</strong> · <strong>{subject}</strong>
            {chapter ? <> · <strong>{chapter}</strong></> : null}
            {topic && topic !== chapter ? <> · {topic}</> : null}
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Choose the class, subject, book and chapter on NCERT's official textbook page.
            You can open the complete book or an individual chapter there. The textbook stays
            on NCERT's website; EduPlan does not copy, store or re-host NCERT textbook files.
          </p>
          <a
            href="https://ncert.nic.in/textbook.php"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
          >
            Open NCERT textbook reader <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            Source: National Council of Educational Research and Training (NCERT). Access is free
            and subject to NCERT's copyright and terms of use.
          </p>
        </div>
      </details>
    </section>
  );
}
