/** Keep explicit book titles in existing request records without a schema change. */
export function requestBookTitle(message: string): string | null {
 const match = message.match(/^[ \t]*Book title:[ \t]*([^\r\n]+)[ \t]*$/im);
 const title = match?.[1]?.trim();
 return title && !/^\[.*\]$/.test(title) ? title : null;
}
export function requestMessageWithTitle(title: string, message: string): string {
 return `Book title: ${title.trim()}\n\n${message.trim()}`;
}
