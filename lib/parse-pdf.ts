export async function parsePdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdf = require("pdf-parse");
  const data = await pdf(buffer);
  return data.text
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .join("\n");
}