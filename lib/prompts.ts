import type { ParsedResume } from "@/types";

export function PARSE_RESUME_PROMPT(rawText: string): string {
  return `Extract structured information from this resume text.
Extract ONLY information explicitly present. Do not invent details.
If a field is missing, omit it from the response.

Resume text:
${rawText}

Return valid JSON matching this structure exactly:
{
  "name": "string (required)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "location": "string (optional)",
  "summary": "string (optional, 1-2 sentence professional summary)",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "startDate": "string (YYYY-MM or YYYY format)",
      "endDate": "string (YYYY-MM or YYYY or 'Present')",
      "bullets": ["array of achievement bullets"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "year": "string (YYYY)"
    }
  ],
  "skills": ["array of technical and professional skills"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "tech": ["technologies used"]
    }
  ]
}`;
}

export function ANALYZE_PROMPT(resume: ParsedResume, jd: string): string {
  const resumeText = formatResumeForAnalysis(resume);

  return `You are an expert resume coach analyzing a candidate's fit for a role.

Candidate Resume:
${resumeText}

Job Description:
${jd}

Analyze the candidate's fit and return JSON with this exact structure:
{
  "matchScore": number (0-100, calibrated: 90+ is rare, most resumes 50-75),
  "oneLineVerdict": "string (max 12 words, e.g., 'Strong fit with 3 keyword gaps')",
  "matchedKeywords": ["keywords present in both resume and JD"],
  "missingKeywords": ["critical keywords in JD but missing from resume - MOST IMPORTANT"],
  "suggestedKeywords": ["related terms candidate could honestly add"],
  "bulletRewrites": [
    {
      "original": "original resume bullet",
      "rewritten": "improved version (3-5 suggestions max, only if genuinely improves)",
      "reasoning": "why this change is better",
      "impact": "high|medium|low"
    }
  ],
  "strengths": ["3 key strengths max"],
  "concerns": ["2 concerns max - be honest, not nice"],
  "recommendedTitle": "string (optional, if current title undersells them)"
}

Be specific and data-driven. Focus on missingKeywords as the most valuable feedback.`;
}

export function REGENERATE_PROMPT(
  resume: ParsedResume,
  analysis: string
): string {
  const resumeText = formatResumeForAnalysis(resume);

  return `Rewrite this resume based on analysis feedback.
CRITICAL: ONLY rewrite what the analysis suggested. Never invent experience or skills.

Original Resume:
${resumeText}

Analysis & Suggestions:
${analysis}

Return the complete updated resume as JSON with the same structure as the original.
Apply ONLY the suggested changes. Do not add experience or skills that weren't there.`;
}

export function COVER_LETTER_PROMPT(resume: ParsedResume, jd: string): string {
  const resumeText = formatResumeForAnalysis(resume);

  return `Write a compelling cover letter (3 paragraphs max).
Tone: confident, specific, no AI-isms ("excited to apply", "passionate about" are BANNED).
Reference 2 specific things from the JD and 2 specific things from the resume.

Resume:
${resumeText}

Job Description:
${jd}

Return JSON:
{
  "greeting": "Dear [Hiring Manager Name],",
  "body": ["paragraph 1", "paragraph 2", "paragraph 3 (optional)"],
  "closing": "Best regards,\\n[Candidate Name]"
}`;
}

function formatResumeForAnalysis(resume: ParsedResume): string {
  const parts: string[] = [];

  if (resume.name) parts.push(`Name: ${resume.name}`);
  if (resume.email) parts.push(`Email: ${resume.email}`);
  if (resume.phone) parts.push(`Phone: ${resume.phone}`);
  if (resume.location) parts.push(`Location: ${resume.location}`);
  if (resume.summary) parts.push(`\nSummary:\n${resume.summary}`);

  if (resume.experience.length > 0) {
    parts.push("\nExperience:");
    resume.experience.forEach((exp) => {
      parts.push(
        `- ${exp.role} at ${exp.company} (${exp.startDate} - ${exp.endDate})`
      );
      exp.bullets.forEach((bullet) => parts.push(`  • ${bullet}`));
    });
  }

  if (resume.education.length > 0) {
    parts.push("\nEducation:");
    resume.education.forEach((edu) => {
      parts.push(`- ${edu.degree} from ${edu.institution} (${edu.year})`);
    });
  }

  if (resume.skills.length > 0) {
    parts.push(`\nSkills: ${resume.skills.join(", ")}`);
  }

  if (resume.projects && resume.projects.length > 0) {
    parts.push("\nProjects:");
    resume.projects.forEach((proj) => {
      parts.push(
        `- ${proj.name}: ${proj.description} (${proj.tech.join(", ")})`
      );
    });
  }

  return parts.join("\n");
}