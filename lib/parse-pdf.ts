export async function parsePdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return data.text
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .join("\n");
}