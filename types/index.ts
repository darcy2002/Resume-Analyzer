export type ParsedResume = {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
    tech: string[];
  }>;
};

export type Analysis = {
  matchScore: number;
  oneLineVerdict: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestedKeywords: string[];
  bulletRewrites: Array<{
    original: string;
    rewritten: string;
    reasoning: string;
    impact: "high" | "medium" | "low";
  }>;
  strengths: string[];
  concerns: string[];
  recommendedTitle?: string;
  atsScore: number;
  atsIssues: Array<{
    issue: string;
    severity: "high" | "medium" | "low";
    why: string;
    fix: string;
  }>;
};

export type CoverLetter = {
  greeting: string;
  body: string[];
  closing: string;
};
