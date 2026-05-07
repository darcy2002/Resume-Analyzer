import { z } from "zod";
import type { ParsedResume, Analysis, CoverLetter } from "@/types";

export const ExperienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  bullets: z.array(z.string().min(1)),
});

export const EducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  year: z.string().min(1),
});

export const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  tech: z.array(z.string().min(1)),
});

export const ParsedResumeSchema: z.ZodType<ParsedResume> = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(z.string().min(1)),
  projects: z.array(ProjectSchema).optional(),
});

export const BulletRewriteSchema = z.object({
  original: z.string().min(1),
  rewritten: z.string().min(1),
  reasoning: z.string().min(1),
  impact: z.enum(["high", "medium", "low"]),
});

export const AnalysisSchema: z.ZodType<Analysis> = z.object({
  matchScore: z.number().min(0).max(100),
  oneLineVerdict: z.string().min(1),
  matchedKeywords: z.array(z.string().min(1)),
  missingKeywords: z.array(z.string().min(1)),
  suggestedKeywords: z.array(z.string().min(1)),
  bulletRewrites: z.array(BulletRewriteSchema),
  strengths: z.array(z.string().min(1)),
  concerns: z.array(z.string().min(1)),
  recommendedTitle: z.string().nullable().optional().transform((v) => v ?? undefined),
});

export const CoverLetterSchema: z.ZodType<CoverLetter> = z.object({
  greeting: z.string().min(1),
  body: z.array(z.string().min(1)),
  closing: z.string().min(1),
});
