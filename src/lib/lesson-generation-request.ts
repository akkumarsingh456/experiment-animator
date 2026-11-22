export type LessonGenerationScope = {
  workspaceId?: string;
  topic: string;
  klass: string;
  subject: string;
  chapter?: string;
  subtopics?: string;
  mode?: "topic" | "chapter";
  go?: string;
};

/** Stable identity for one public generation or private lesson-open request. */
export function lessonGenerationRequestKey(
  scope: LessonGenerationScope,
  retryAttempt: number,
): string {
  return JSON.stringify([
    scope.workspaceId || "",
    scope.topic,
    scope.klass,
    scope.subject,
    scope.chapter || "",
    scope.subtopics || "",
    scope.mode || "topic",
    scope.go || "",
    retryAttempt,
  ]);
}
