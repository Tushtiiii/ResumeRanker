/**
 * AI Service — LangChain Orchestration Layer
 *
 * LLM:        Google Gemini 2.5 Flash  (AI_PROVIDER=gemini)
 * Embeddings: gemini-embedding-001     (EMBEDDING_PROVIDER=gemini)
 *             Jina AI                  (EMBEDDING_PROVIDER=jina)
 *             Voyage AI                (EMBEDDING_PROVIDER=voyage)
 *
 * Orchestration: LangChain (@langchain/google-genai + langchain/core)
 *
 * No code changes required when switching providers — only .env changes needed.
 */

const { HumanMessage } = require('@langchain/core/messages');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');

const provider        = (process.env.AI_PROVIDER        || 'gemini').toLowerCase();
const embeddingProvider = (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();

// ─── LangChain LLM: Gemini 2.5 Flash ─────────────────────────────────────────
let llm;

const getGeminiApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith('your_')) throw new Error('GEMINI_API_KEY not set in .env');
  return key;
};

if (provider === 'gemini') {
  const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  llm = new ChatGoogleGenerativeAI({
    model          : geminiModel,
    apiKey         : getGeminiApiKey(),
    temperature    : 0.3,
    maxOutputTokens: 8192,
  });
  console.log(`[aiService] LangChain → Gemini (${geminiModel}) initialised.`);
} else if (provider === 'openai') {
  // Fallback: OpenAI via LangChain
  const { ChatOpenAI } = require('@langchain/openai');
  llm = new ChatOpenAI({
    model      : 'gpt-4o-mini',
    apiKey     : process.env.OPENAI_API_KEY,
    temperature: 0.3,
  });
  console.log('[aiService] LangChain → OpenAI GPT-4o-mini initialised.');
} else if (provider === 'groq') {
  // Groq via OpenAI-compatible endpoint
  const { ChatOpenAI } = require('@langchain/openai');
  llm = new ChatOpenAI({
    model       : process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    apiKey      : process.env.GROQ_API_KEY,
    configuration: { baseURL: 'https://api.groq.com/openai/v1' },
    temperature : 0.3,
  });
  console.log('[aiService] LangChain → Groq LLaMA initialised.');
}

// ─── LangChain Output Parser ──────────────────────────────────────────────────
const outputParser = new StringOutputParser();

// ─── Fallback LLM Helper ──────────────────────────────────────────────────────
let fallbackLlm = null;
const getFallbackLlm = () => {
  if (fallbackLlm) return fallbackLlm;
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('your_')) {
    const { ChatOpenAI } = require('@langchain/openai');
    fallbackLlm = new ChatOpenAI({
      model       : process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      apiKey      : process.env.GROQ_API_KEY,
      configuration: { baseURL: 'https://api.groq.com/openai/v1' },
      temperature : 0.3,
    });
    console.log('[aiService] Fallback LLM (Groq LLaMA) initialised.');
  } else if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('your_')) {
    const { ChatOpenAI } = require('@langchain/openai');
    fallbackLlm = new ChatOpenAI({
      model      : 'gpt-4o-mini',
      apiKey     : process.env.OPENAI_API_KEY,
      temperature: 0.3,
    });
    console.log('[aiService] Fallback LLM (OpenAI GPT-4o-mini) initialised.');
  }
  return fallbackLlm;
}; 

// ─── Core: Generate Text via LangChain ───────────────────────────────────────
const generateText = async (prompt) => {
  try {
    const chain = RunnableSequence.from([llm, outputParser]);
    return await chain.invoke([new HumanMessage(prompt)]);
  } catch (err) {
    const isRateLimit = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('Quota')));
    const fallback = getFallbackLlm();
    if (isRateLimit && fallback) {
      console.warn('⚠️ Primary LLM rate limited (429). Falling back to backup provider...');
      const fallbackChain = RunnableSequence.from([fallback, outputParser]);
      return await fallbackChain.invoke([new HumanMessage(prompt)]);
    }
    throw err;
  }
};

// ─── Embedding Clients ────────────────────────────────────────────────────────

/** Gemini Embeddings via LangChain (gemini-embedding-001, 3072-dim) */
let geminiEmbedder = null;
if (
  embeddingProvider === 'gemini' ||
  (embeddingProvider === 'auto' && provider === 'gemini')
) {
  const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
  geminiEmbedder = new GoogleGenerativeAIEmbeddings({
    model   : 'gemini-embedding-001',
    apiKey  : getGeminiApiKey(),
    taskType: 'RETRIEVAL_DOCUMENT',
  });
  console.log('[aiService] LangChain Gemini Embeddings (gemini-embedding-001) initialised.');
}

/** Jina Embeddings (REST, provider-agnostic) */
let jinaApiKey = null;
if (
  embeddingProvider === 'jina' &&
  process.env.JINA_API_KEY &&
  !process.env.JINA_API_KEY.startsWith('your_')
) {
  jinaApiKey = process.env.JINA_API_KEY;
  console.log('[aiService] Jina AI embedding client initialised.');
}

/** Voyage AI (legacy / optional) */
let voyageClient = null;
if (
  embeddingProvider === 'voyage' &&
  process.env.VOYAGE_API_KEY &&
  !process.env.VOYAGE_API_KEY.startsWith('your_')
) {
  const { VoyageAIClient } = require('voyageai');
  voyageClient = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
  console.log('[aiService] Voyage AI embedding client initialised.');
}

// ─── Core: Generate Embedding Vector ─────────────────────────────────────────
const generateEmbedding = async (text) => {
  const truncated = text.slice(0, 10000);

  // ── 1. Gemini Embeddings (primary) ────────────────────────────────────
  if (geminiEmbedder) {
    try {
      const vector = await geminiEmbedder.embedQuery(truncated);
      return vector; // 3072-dimensional float array
    } catch (err) {
      console.error('[aiService] Gemini embedding failed, falling back:', err.message);
    }
  }

  // ── 2. Jina AI Embeddings ──────────────────────────────────────────────
  if (jinaApiKey) {
    try {
      const res = await fetch('https://api.jina.ai/v1/embeddings', {
        method : 'POST',
        headers: {
          'Content-Type' : 'application/json',
          Authorization  : `Bearer ${jinaApiKey}`,
        },
        body: JSON.stringify({
          model : process.env.JINA_MODEL || 'jina-embeddings-v3',
          input : [truncated],
        }),
      });
      const data = await res.json();
      if (data.data?.[0]?.embedding) return data.data[0].embedding;
      throw new Error(data.detail || 'Jina API error');
    } catch (err) {
      console.error('[aiService] Jina embedding failed, falling back:', err.message);
    }
  }

  // ── 3. Voyage AI Embeddings (legacy) ──────────────────────────────────
  if (voyageClient) {
    try {
      const response = await voyageClient.embed({
        input : [truncated],
        model : 'voyage-3-lite',
      });
      return response.data[0].embedding;
    } catch (err) {
      console.error('[aiService] Voyage embedding failed, falling back:', err.message);
    }
  }

  // ── 4. OpenAI fallback ────────────────────────────────────────────────
  if (
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith('your_')
  ) {
    const OpenAI = require('openai');
    const fb = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await fb.embeddings.create({
      model : 'text-embedding-3-small',
      input : truncated,
    });
    return response.data[0].embedding;
  }

  console.warn('[aiService] No embedding provider available. Returning zero vector.');
  return new Array(3072).fill(0);
};

// ─── Parse Job Description (LangChain chain) ──────────────────────────────────
const JD_PROMPT = PromptTemplate.fromTemplate(`
You are an expert HR analyst. Analyze the following job description and extract structured information.
Return ONLY valid JSON — no markdown, no explanation, no code fences.

Job Description:
---
{jd}
---

Return this exact JSON structure:
{{
  "title": "job title string",
  "company": "company name or empty string",
  "seniorityLevel": "one of: intern, junior, mid, senior, lead, principal, executive",
  "employmentType": "one of: full-time, part-time, contract, freelance",
  "industryDomain": "e.g. Software Development, Healthcare, Finance",
  "experienceRange": {{
    "min": 0,
    "max": 0,
    "label": "e.g. 4-6 Years"
  }},
  "requiredSkills": ["array", "of", "required", "technical", "skills"],
  "preferredSkills": ["array", "of", "nice-to-have", "skills"],
  "educationRequirements": ["e.g. Bachelor's in Computer Science"],
  "softSkills": ["e.g. Leadership", "Communication"],
  "responsibilities": ["key responsibility 1", "key responsibility 2"],
  "keywordsForMatching": ["important", "keywords", "for", "semantic", "search"]
}}
`);

const jdChain = RunnableSequence.from([JD_PROMPT, llm, outputParser]);

const parseJobDescription = async (rawText) => {
  const raw = await jdChain.invoke({ jd: rawText.slice(0, 6000) });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
};

// ─── Parse Resume ─────────────────────────────────────────────────────────────
const RESUME_PROMPT = PromptTemplate.fromTemplate(`
You are an expert resume parser. Extract structured information from the resume below.
Return ONLY valid JSON — no markdown, no explanation, no code fences.

Resume:
---
{resume}
---

Return this exact JSON structure:
{{
  "name": "full name",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "location": "city, state/country or empty string",
  "linkedIn": "linkedin URL or empty string",
  "github": "github URL or empty string",
  "portfolio": "portfolio URL or empty string",
  "headline": "one-line professional headline",
  "summary": "2-3 sentence professional summary",
  "totalExperienceYears": 0,
  "skills": ["array", "of", "all", "skills"],
  "topDomains": ["top 1-3 professional domains like Full Stack, Cloud, Data Science"],
  "experience": [
    {{
      "company": "company name",
      "title": "job title",
      "startDate": "Mon YYYY or YYYY",
      "endDate": "Mon YYYY or Present",
      "duration": "X years Y months",
      "description": "brief role description",
      "technologies": ["tech1", "tech2"],
      "achievements": ["key achievement 1"],
      "isCurrent": false
    }}
  ],
  "education": [
    {{
      "institution": "university name",
      "degree": "e.g. Bachelor of Science",
      "field": "e.g. Computer Science",
      "startYear": "YYYY",
      "endYear": "YYYY",
      "gpa": "GPA or empty string",
      "honors": "honors or empty string"
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "description": "what it does",
      "technologies": ["tech1", "tech2"],
      "role": "your role",
      "impact": "impact or metrics",
      "url": "URL or empty string",
      "duration": "duration or empty string"
    }}
  ],
  "certifications": [
    {{
      "name": "certification name",
      "issuer": "issuing organization",
      "year": "YYYY",
      "expiryYear": "YYYY or empty string",
      "credentialId": "ID or empty string",
      "url": "URL or empty string"
    }}
  ],
  "achievements": ["award or achievement 1"],
  "languages": ["English", "other languages"]
}}
`);

const resumeChain = RunnableSequence.from([RESUME_PROMPT, llm, outputParser]);

const parseResume = async (rawText) => {
  const raw = await resumeChain.invoke({ resume: rawText.slice(0, 8000) });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
};

// ─── Generate Candidate AI Insights ──────────────────────────────────────────
const INSIGHTS_PROMPT = PromptTemplate.fromTemplate(`
You are a senior technical recruiter evaluating a candidate for a job position.
Provide a professional, insightful evaluation. Return ONLY valid JSON.

JOB:
Title: {jobTitle}
Required Skills: {requiredSkills}
Experience Required: {experienceLabel}
Domain: {domain}
Seniority: {seniority}

CANDIDATE:
Name: {candidateName}
Headline: {headline}
Total Experience: {experienceYears} years
Skills: {skills}
Top Domains: {topDomains}
Summary: {summary}

SCORE BREAKDOWN:
- Skill Match: {skillMatch}/100
- Experience Match: {experienceMatch}/100
- Project Relevance: {projectRelevance}/100
- Career Growth: {careerGrowth}/100
- Certifications: {certifications}/100
- Soft Skills: {softSkills}/100
- Platform Activity: {platformActivity}/100
- Overall Score: {finalScore}/100

Return this exact JSON:
{{
  "summary": "2-3 sentence professional narrative about this candidate's fit for the role",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "recommendation": "one of: strong_yes, yes, maybe, no, strong_no",
  "interviewFocus": ["topic to explore in interview 1", "topic 2", "topic 3"],
  "matchedSkills": ["skills from required list that candidate has"],
  "missingSkills": ["required skills the candidate lacks"]
}}
`);

const insightsChain = RunnableSequence.from([INSIGHTS_PROMPT, llm, outputParser]);

const generateCandidateInsights = async (jobProfile, candidateProfile, scoreBreakdown) => {
  const raw = await insightsChain.invoke({
    jobTitle       : jobProfile.title,
    requiredSkills : (jobProfile.parsedProfile?.requiredSkills || []).join(', '),
    experienceLabel: jobProfile.parsedProfile?.experienceRange?.label || 'Not specified',
    domain         : jobProfile.parsedProfile?.industryDomain || 'Not specified',
    seniority      : jobProfile.parsedProfile?.seniorityLevel || 'Not specified',
    candidateName  : candidateProfile.userId?.name || 'Candidate',
    headline       : candidateProfile.headline || '',
    experienceYears: candidateProfile.totalExperienceYears,
    skills         : (candidateProfile.skills || []).join(', '),
    topDomains     : (candidateProfile.topDomains || []).join(', '),
    summary        : candidateProfile.summary || '',
    skillMatch     : scoreBreakdown.skillMatch,
    experienceMatch: scoreBreakdown.experienceMatch,
    projectRelevance: scoreBreakdown.projectRelevance,
    careerGrowth   : scoreBreakdown.careerGrowth,
    certifications : scoreBreakdown.certifications,
    softSkills     : scoreBreakdown.softSkills,
    platformActivity: scoreBreakdown.platformActivity,
    finalScore     : scoreBreakdown.finalScore,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
};

// ─── Generate Interview Questions ─────────────────────────────────────────────
const IQ_PROMPT = PromptTemplate.fromTemplate(`
You are an expert technical interviewer. Generate {count} interview questions for this role.
Return ONLY valid JSON — no markdown.

Role: {title}
Required Skills: {skills}
Seniority: {seniority}
Domain: {domain}
Difficulty: {difficulty} (beginner | intermediate | advanced)

Return:
{{
  "questions": [
    {{
      "id": 1,
      "question": "question text",
      "category": "technical | behavioral | situational | system-design",
      "difficulty": "{difficulty}",
      "expectedAnswer": "brief expected answer or key points",
      "followUp": "optional follow-up question"
    }}
  ]
}}
`);

const iqChain = RunnableSequence.from([IQ_PROMPT, llm, outputParser]);

const generateInterviewQuestions = async (jobProfile, difficulty = 'intermediate', count = 10) => {
  const raw = await iqChain.invoke({
    count,
    title     : jobProfile.title,
    skills    : (jobProfile.parsedProfile?.requiredSkills || []).join(', '),
    seniority : jobProfile.parsedProfile?.seniorityLevel || 'mid',
    domain    : jobProfile.parsedProfile?.industryDomain || '',
    difficulty,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
};

// ─── AI Chat / RAG Query ──────────────────────────────────────────────────────
const RAG_PROMPT = PromptTemplate.fromTemplate(`
You are an AI assistant helping a recruiter analyze candidates for a job position.
Answer the recruiter's question based on the candidate data provided.
Be concise, helpful, and professional.

Recruiter Question: {query}

Available Candidate Data:
{context}

Provide a helpful, specific answer:
`);

const ragChain = RunnableSequence.from([RAG_PROMPT, llm, outputParser]);

const answerRecruiterQuery = async (query, candidateContext) => {
  const context = candidateContext
    .slice(0, 5)
    .map(
      (c, i) =>
        `Candidate ${i + 1}: ${c.userId?.name || 'Unknown'} | Score: ${c.finalScore}/100 | Skills: ${c.skills?.join(', ')}`
    )
    .join('\n');

  return ragChain.invoke({ query, context });
};

// ─── Utility: Cosine Similarity ───────────────────────────────────────────────
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = {
  generateText,
  generateEmbedding,
  parseJobDescription,
  parseResume,
  generateCandidateInsights,
  generateInterviewQuestions,
  answerRecruiterQuery,
  cosineSimilarity,
  activeProvider: provider,
  embeddingProvider,
};
