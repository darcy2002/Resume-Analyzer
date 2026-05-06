// Best-effort parser for an incomplete JSON object stream.
// Closes open strings, arrays, and objects, then attempts JSON.parse.
// Returns null if no usable prefix can be parsed.
export function tryParsePartial<T = unknown>(buffer: string): T | null {
  if (!buffer) return null;

  // Trim to first '{' or '[' — Gemini sometimes prefixes whitespace/markdown.
  let start = -1;
  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];
    if (c === "{" || c === "[") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  const src = buffer.slice(start);

  const stack: string[] = [];
  let inString = false;
  let escape = false;
  let lastNonWs = -1;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") stack.pop();
    if (c.trim()) lastNonWs = i;
  }

  let trimmed = src.slice(0, lastNonWs + 1);

  if (inString) {
    // Drop the partial string token entirely so the parser doesn't have to
    // guess at its content. Walk back to the last token-boundary character.
    let cut = trimmed.length;
    let depth = 0;
    let inStr = false;
    let esc = false;
    let lastBoundary = -1;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') {
        // String start. Track its position as a possible cut point.
        lastBoundary = i;
        inStr = true;
      } else if (c === "{" || c === "[") {
        depth++;
        lastBoundary = i + 1;
      } else if (c === "}" || c === "]") {
        depth--;
        lastBoundary = i + 1;
      } else if (c === "," || c === ":") {
        lastBoundary = i;
      }
    }
    cut = lastBoundary;
    if (cut <= 0) return null;
    trimmed = trimmed.slice(0, cut);
  }

  // Strip trailing comma or colon.
  trimmed = trimmed.replace(/[,:\s]+$/g, "");

  // Close open structures in reverse.
  // Recompute open stack against the trimmed string.
  const openers: string[] = [];
  let inStr2 = false;
  let esc2 = false;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inStr2) {
      if (esc2) esc2 = false;
      else if (c === "\\") esc2 = true;
      else if (c === '"') inStr2 = false;
      continue;
    }
    if (c === '"') inStr2 = true;
    else if (c === "{" || c === "[") openers.push(c);
    else if (c === "}") {
      if (openers[openers.length - 1] === "{") openers.pop();
    } else if (c === "]") {
      if (openers[openers.length - 1] === "[") openers.pop();
    }
  }

  let closed = trimmed;
  // If the last meaningful char is a key-without-value pattern like `"foo"`,
  // strip it.
  closed = closed.replace(/,\s*"[^"]*"$/g, "");
  closed = closed.replace(/{\s*"[^"]*"$/g, "{");
  closed = closed.replace(/\[\s*$/g, "[");

  for (let i = openers.length - 1; i >= 0; i--) {
    closed += openers[i] === "{" ? "}" : "]";
  }

  try {
    return JSON.parse(closed) as T;
  } catch {
    return null;
  }
}
