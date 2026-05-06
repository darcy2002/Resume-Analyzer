import pdf from "pdf-parse";

export async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}