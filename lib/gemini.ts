import { GoogleGenerativeAI } from "@google/generative-ai";
import { ZodSchema } from "zod";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL = "gemini-2.5-flash";

export async function callGemini<T>(
  prompt: string,
  schema: ZodSchema
): Promise<{ data: T | null; error: string | null }> {
  try {
    const model = client.getGenerativeModel({ model: MODEL });
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const text = response.response.text();
    const parsed = JSON.parse(text);
    const validated = await schema.parseAsync(parsed);
    return { data: validated as T, error: null };
  } catch (err) {
    const firstError =
      err instanceof Error ? err.message : "Unknown validation error";

    try {
      const model = client.getGenerativeModel({ model: MODEL });
      const retryPrompt = `${prompt}

Your last response was malformed or invalid. Return ONLY valid JSON matching the required schema. No explanation, no markdown code blocks, just raw JSON.`;

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: retryPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const text = response.response.text();
      const parsed = JSON.parse(text);
      const validated = await schema.parseAsync(parsed);
      return { data: validated as T, error: null };
    } catch {
      return { data: null, error: firstError };
    }
  }
}

export async function* streamGemini(prompt: string) {
  const model = client.getGenerativeModel({ model: MODEL });
  const stream = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  for await (const chunk of stream.stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      yield text;
    }
  }
}