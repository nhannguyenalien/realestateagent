/** Media is rendered from database-backed cards, never from generated image markup. */
export function cleanAdvisorText(text: string): string {
  const normalized = text.replace(/\\([()[\]])/g, "$1");
  let result = "", cursor = 0;
  const image = /!\[[^\]]*\]\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = image.exec(normalized))) {
    result += normalized.slice(cursor, match.index);
    let end = image.lastIndex, depth = 1;
    while (end < normalized.length && depth) {
      const char = normalized[end++];
      if (char === "(") depth++;
      else if (char === ")") depth--;
    }
    cursor = depth ? normalized.indexOf("\n", image.lastIndex) : end;
    if (cursor < 0) cursor = normalized.length;
    image.lastIndex = cursor;
  }
  return (result + normalized.slice(cursor))
    .replace(/!\[[^\]]*\]\s*\[[^\]]*\]/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n").trim();
}
