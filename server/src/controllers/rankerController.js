/**
 * Standalone Resume Ranker Controller
 * ─────────────────────────────────────
 * Accepts:
 *   - jdFile       : PDF / DOCX / TXT (job description)
 *   - candidatesFile: .json OR .jsonl  (candidate list file)
 *   - candidates   : raw JSON string (fallback if no file)
 *
 * Supported candidate file formats:
 *   .json  → JSON array  [ {...}, {...} ]
 *   .jsonl → JSON Lines  one object per line
 *
 * Returns ranked candidates with AI-generated insights.
 * Does NOT require candidates to be registered in the DB.
 */

const path = require('path');
const { extractTextFromBuffer } = require('../services/resumeParser');
const {
  parseJobDescription,
  parseResume,
  generateText,
  generateEmbedding,
  cosineSimilarity,
} = require('../services/aiService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cleanJSON = (raw) =>
  raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

// Some Windows tools write UTF-16 without a byte-order mark.  Looking only at
// the first character is not enough here: exported JSON commonly starts with a
// newline or space before its opening `[` / `{`.  Inspect a small prefix for
// the alternating NUL-byte pattern instead.
const detectBomlessUtf16Encoding = (buffer) => {
  const byteLength = Math.min(buffer.length - (buffer.length % 2), 1024);
  if (byteLength < 8) return null;

  let evenNuls = 0;
  let oddNuls = 0;
  const pairs = byteLength / 2;

  for (let i = 0; i < byteLength; i += 2) {
    if (buffer[i] === 0x00) evenNuls += 1;
    if (buffer[i + 1] === 0x00) oddNuls += 1;
  }

  // UTF-16 JSON written with ASCII structural characters has NUL bytes in one
  // byte position for most character pairs. Require a clear majority so that
  // arbitrary binary uploads still reach the binary-data validation below.
  if (oddNuls / pairs >= 0.4 && oddNuls > evenNuls * 3) return 'utf16le';
  if (evenNuls / pairs >= 0.4 && evenNuls > oddNuls * 3) return 'utf16be';
  return null;
};

const decodeUtf16Be = (buffer) => {
  const utf16le = Buffer.from(buffer);
  for (let i = 0; i + 1 < utf16le.length; i += 2) {
    [utf16le[i], utf16le[i + 1]] = [utf16le[i + 1], utf16le[i]];
  }
  return utf16le.toString('utf16le');
};

/**
 * Parse candidates from an uploaded file buffer.
 * Supports:
 *   .json  → standard JSON array
 *   .jsonl → JSON Lines (one object per line, blank lines ignored)
 */
const decodeCandidateText = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Candidates file is empty.');
  }

  // JSON is text. Handle the common Unicode encodings used by spreadsheet and
  // enterprise exports, rather than treating every upload as UTF-8.
  let text;
  if (buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    text = buffer.subarray(3).toString('utf8');
  } else if (buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))) {
    text = buffer.subarray(2).toString('utf16le');
  } else if (buffer.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))) {
    // Node has no utf16be decoder, so swap each pair before decoding.
    text = decodeUtf16Be(buffer.subarray(2));
  } else if (detectBomlessUtf16Encoding(buffer) === 'utf16le') {
    // UTF-16LE JSON without a BOM (some editors save text this way).
    text = buffer.toString('utf16le');
  } else if (detectBomlessUtf16Encoding(buffer) === 'utf16be') {
    // UTF-16BE JSON without a BOM.
    text = decodeUtf16Be(buffer);
  } else {
    text = buffer.toString('utf8');
  }

  // A filename extension can be changed, so do not feed binary data into the
  // JSON parser and return its misleading "Unexpected token" message.
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Candidates file is empty.');
  if (/[\u0000-\u0008\u000e-\u001f]/.test(trimmed)) {
    throw new Error(
      'Candidates file appears to contain binary data, not JSON text. Export it as a UTF-8 .json or .jsonl file and upload that exported file.'
    );
  }

  return trimmed;
};

const parseCandidatesFromBuffer = (buffer, originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const text = decodeCandidateText(buffer);

  if (ext === '.jsonl') {
    // JSON Lines: split on newlines, parse each non-empty line
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const parsed = lines.map((line, idx) => {
      try {
        return JSON.parse(line.trim());
      } catch (e) {
        throw new Error(`Invalid JSON on line ${idx + 1} of JSONL file: ${e.message}`);
      }
    });
    return parsed;
  }

  if (ext === '.json') {
    const parsed = JSON.parse(text);
    // Support both array and { candidates: [...] } wrapper shapes
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.candidates)) return parsed.candidates;
    if (Array.isArray(parsed.data)) return parsed.data;
    throw new Error('JSON file must contain an array of candidates (or { "candidates": [...] }).');
  }

  throw new Error(`Unsupported candidate file type: ${ext}. Use .json or .jsonl`);
};

/**
 * Build a flat text summary of a candidate for embedding.
 */
const candidateToEmbedText = (c) =>
  [
    c.name,
    c.headline,
    c.summary,
    ...(c.skills || []),
    ...(c.topDomains || []),
    ...(c.experience || []).map((e) => `${e.title || ''} at ${e.company || ''}`),
    ...(c.projects || []).flatMap((p) => p.technologies || []),
    ...(c.certifications || []).map((cert) => cert.name || ''),
  ]
    .filter(Boolean)
    .join(' ');

/**
 * Parse candidate data:
 * Candidates can be:
 *  (a) plain text / resume content  → we run AI extraction
 *  (b) pre-structured JSON object   → we use directly
 */
const normalizeCandidateProfile = async (candidate) => {
  // If resume text is provided, parse it via AI
  if (candidate.resumeText && !candidate.skills) {
    try {
      const parsed = await parseResume(candidate.resumeText);
      return {
        ...parsed,
        name: candidate.name || parsed.name || 'Unknown',
        id: candidate.id || candidate._id || parsed.email || Math.random().toString(36).slice(2),
      };
    } catch {
      return {
        name: candidate.name || 'Unknown',
        skills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        totalExperienceYears: 0,
        summary: candidate.resumeText?.slice(0, 500) || '',
        id: candidate.id || Math.random().toString(36).slice(2),
      };
    }
  }

  // Already structured — normalize field names
  return {
    id: candidate.id || candidate._id || candidate.email || Math.random().toString(36).slice(2),
    name: candidate.name || 'Unknown',
    email: candidate.email || '',
    phone: candidate.phone || '',
    location: candidate.location || '',
    headline: candidate.headline || candidate.title || '',
    summary: candidate.summary || candidate.objective || '',
    totalExperienceYears: candidate.totalExperienceYears ?? candidate.yearsOfExperience ?? 0,
    skills: candidate.skills || candidate.technicalSkills || [],
    topDomains: candidate.topDomains || candidate.domains || [],
    experience: candidate.experience || candidate.workExperience || [],
    education: candidate.education || [],
    projects: candidate.projects || [],
    certifications: candidate.certifications || [],
    achievements: candidate.achievements || [],
    languages: candidate.languages || [],
  };
};

/**
 * Score a single candidate against a parsed JD using heuristic + semantic scoring
 */
const scoreCandidate = (jdParsed, candidateProfile, jdEmbedding, candidateEmbedding) => {
  const toStrArr = (arr) =>
    (arr || []).filter((s) => s != null).map((s) => String(s).toLowerCase().trim());

  const requiredSkills  = toStrArr(jdParsed.requiredSkills);
  const preferredSkills = toStrArr(jdParsed.preferredSkills);
  const candidateSkills = toStrArr(candidateProfile.skills);

  // ── Skill Match (0-100) ───────────────────────────────────────────
  let skillMatch = 70;
  if (requiredSkills.length > 0) {
    const reqMatched = requiredSkills.filter((sk) =>
      candidateSkills.some((cs) => cs.includes(sk) || sk.includes(cs))
    ).length;
    const reqScore = (reqMatched / requiredSkills.length) * 100;
    let prefBonus = 0;
    if (preferredSkills.length > 0) {
      const prefMatched = preferredSkills.filter((sk) =>
        candidateSkills.some((cs) => cs.includes(sk) || sk.includes(cs))
      ).length;
      prefBonus = (prefMatched / preferredSkills.length) * 20;
    }
    skillMatch = Math.min(100, Math.round(reqScore * 0.85 + prefBonus));
  }

  // ── Experience Match (0-100) ──────────────────────────────────────
  const minExp = jdParsed.experienceRange?.min || 0;
  const maxExp = jdParsed.experienceRange?.max || 10;
  const candYears = candidateProfile.totalExperienceYears || 0;
  let experienceMatch = 100;
  if (candYears < minExp) {
    experienceMatch = Math.max(0, Math.round(100 - (minExp - candYears) * 20));
  } else if (candYears > maxExp) {
    experienceMatch = Math.max(60, Math.round(100 - (candYears - maxExp) * 5));
  }

  // ── Project Relevance (0-100) ─────────────────────────────────────
  const jobTechs = [...requiredSkills, ...preferredSkills];
  const projects = candidateProfile.projects || [];
  let projectRelevance = projects.length === 0 ? 30 : 0;
  if (projects.length > 0) {
    const relProjects = projects.filter((p) => {
      const ptechs = (p.technologies || []).map((t) => t.toLowerCase());
      return ptechs.some((pt) => jobTechs.some((jt) => pt.includes(jt) || jt.includes(pt)));
    }).length;
    projectRelevance = Math.round((relProjects / projects.length) * 100);
  }

  // ── Education Match (0-100) ───────────────────────────────────────
  const eduReqs = (jdParsed.educationRequirements || []).filter((e) => e != null).map((e) => String(e).toLowerCase());
  const candEdu = candidateProfile.education || [];
  let educationMatch = 50; // neutral default
  if (candEdu.length > 0) {
    if (eduReqs.length === 0) {
      educationMatch = 70; // has education, none required
    } else {
      const matched = eduReqs.some((req) =>
        candEdu.some((e) => {
          const eduStr = `${e.degree || ''} ${e.field || ''} ${e.institution || ''}`.toLowerCase();
          return eduStr.includes(req) || req.includes((e.field || '').toLowerCase());
        })
      );
      educationMatch = matched ? 90 : 40;
    }
  }

  // ── Certifications (0-100) ────────────────────────────────────────
  const certs = candidateProfile.certifications || [];
  let certifications = 20;
  if (certs.length > 0) {
    const baseScore = Math.min(60, certs.length * 15);
    const relevantCerts = certs.filter((c) => {
      const cn = `${c.name || ''} ${c.issuer || ''}`.toLowerCase();
      return requiredSkills.some((sk) => cn.includes(sk));
    }).length;
    certifications = Math.min(100, baseScore + relevantCerts * 20);
  }

  // ── Semantic similarity from embeddings ───────────────────────────
  const rawSim = cosineSimilarity(jdEmbedding, candidateEmbedding);
  // If embeddings are unavailable (Groq returns zero vectors), rawSim = 0 for
  // every candidate equally — zero ranking signal. Detect this and redistribute
  // that 15% weight to the other factors so scores can still reach 100.
  const embeddingsActive =
    jdEmbedding?.some?.((v) => v !== 0) || candidateEmbedding?.some?.((v) => v !== 0);
  const semanticSim   = Number.isFinite(rawSim) ? rawSim : 0;
  const semanticScore = Math.round(semanticSim * 100);

  // ── Weighted Final Score ──────────────────────────────────────────
  const weights = embeddingsActive
    ? { skillMatch: 0.32, experienceMatch: 0.22, projectRelevance: 0.15,
        educationMatch: 0.12, certifications: 0.04, semantic: 0.15 }
    : { skillMatch: 0.40, experienceMatch: 0.25, projectRelevance: 0.17,
        educationMatch: 0.13, certifications: 0.05, semantic: 0 };

  const rawFinal =
    weights.skillMatch       * skillMatch +
    weights.experienceMatch  * experienceMatch +
    weights.projectRelevance * projectRelevance +
    weights.educationMatch   * educationMatch +
    weights.certifications   * certifications +
    weights.semantic         * semanticScore;

  const finalScore = Math.min(100, Math.max(0, Math.round(
    Number.isFinite(rawFinal) ? rawFinal : 0
  )));


  return {
    skillMatch: Math.round(skillMatch),
    experienceMatch: Math.round(experienceMatch),
    projectRelevance: Math.round(projectRelevance),
    educationMatch: Math.round(educationMatch),
    certifications: Math.round(certifications),
    semanticSimilarity: parseFloat(semanticSim.toFixed(4)),
    finalScore,
  };
};

/**
 * Generate AI insights for a single candidate
 */
const generateCandidateAnalysis = async (jdParsed, candidate, scores, jdRawText) => {
  const toStr = (v) => (v != null ? String(v) : '');
  const jdRequired = (jdParsed.requiredSkills || []).filter((s) => s != null).map(toStr);
  const candSkillsStr = (candidate.skills || []).filter((s) => s != null).map(toStr);

  const matchedSkills = jdRequired.filter((sk) =>
    candSkillsStr.some(
      (cs) => cs.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(cs.toLowerCase())
    )
  );

  const missingSkills = jdRequired.filter((sk) => !matchedSkills.includes(sk));

  const prompt = `
You are a senior technical recruiter evaluating a candidate.
Return ONLY valid JSON — no markdown, no code fences, no explanation.

JOB DESCRIPTION SUMMARY:
- Title: ${jdParsed.title || 'Not specified'}
- Required Skills: ${(jdParsed.requiredSkills || []).join(', ') || 'Not specified'}
- Experience Required: ${jdParsed.experienceRange?.label || 'Not specified'}
- Seniority: ${jdParsed.seniorityLevel || 'Not specified'}
- Domain: ${jdParsed.industryDomain || 'Not specified'}
- Education Required: ${(jdParsed.educationRequirements || []).join(', ') || 'Not specified'}

CANDIDATE:
- Name: ${candidate.name}
- Headline: ${candidate.headline || 'N/A'}
- Total Experience: ${candidate.totalExperienceYears} years
- Skills: ${(candidate.skills || []).join(', ') || 'None listed'}
- Education: ${(candidate.education || []).map((e) => `${e.degree || ''} in ${e.field || ''} from ${e.institution || ''}`).join('; ') || 'None listed'}
- Projects: ${(candidate.projects || []).map((p) => p.name).join(', ') || 'None listed'}
- Certifications: ${(candidate.certifications || []).map((c) => c.name).join(', ') || 'None listed'}
- Summary: ${candidate.summary || 'Not provided'}
- Top Domains: ${(candidate.topDomains || []).join(', ') || 'Not specified'}

SCORE BREAKDOWN:
- Skill Match: ${scores.skillMatch}/100
- Experience Match: ${scores.experienceMatch}/100
- Project Relevance: ${scores.projectRelevance}/100
- Education Match: ${scores.educationMatch}/100
- Certifications: ${scores.certifications}/100
- Overall Score: ${scores.finalScore}/100

Return this exact JSON:
{
  "summary": "2-3 sentence professional narrative about this candidate's fit",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "recommendation": "one of: Highly Recommended, Recommended, Consider, Not Recommended",
  "recommendationReason": "2-3 sentences explaining why this recommendation was made based on the score and profile",
  "interviewFocus": ["topic to explore 1", "topic 2", "topic 3"],
  "matchedSkills": ${JSON.stringify(matchedSkills)},
  "missingSkills": ${JSON.stringify(missingSkills)},
  "jdVsResumeNotes": "brief comparison of how candidate's experience aligns or differs from JD requirements",
  "relevantExperience": "describe the most relevant experience this candidate has for this role"
}
`;

  try {
    const raw = await generateText(prompt);
    return JSON.parse(cleanJSON(raw));
  } catch {
    return {
      summary: `${candidate.name} scored ${scores.finalScore}/100 for this role.`,
      strengths: matchedSkills.slice(0, 3).map((s) => `Proficient in ${s}`),
      concerns: missingSkills.slice(0, 2).map((s) => `Missing: ${s}`),
      recommendation: scores.finalScore >= 75 ? 'Recommended' : scores.finalScore >= 50 ? 'Consider' : 'Not Recommended',
      recommendationReason: `Based on an overall score of ${scores.finalScore}/100.`,
      interviewFocus: ['Technical skills assessment', 'Past project experience', 'Role-specific scenarios'],
      matchedSkills,
      missingSkills,
      jdVsResumeNotes: 'Automatic analysis could not be fully generated.',
      relevantExperience: candidate.summary || 'Not available.',
    };
  }
};

// ─── Controller Exports ───────────────────────────────────────────────────────

/**
 * Core analysis logic — shared by analyzeResumes and analyzeFromFiles.
 */
const runAnalysis = async (jdFileObj, candidates) => {
  // 1. Extract JD text
  const jdRawText = await extractTextFromBuffer(
    jdFileObj.buffer, jdFileObj.mimetype, jdFileObj.originalname
  );
  if (!jdRawText || jdRawText.trim().length < 30) {
    throw Object.assign(new Error('Job description file appears to be empty.'), { status: 400 });
  }

  // 2. Parse JD via AI
  const jdParsed = await parseJobDescription(jdRawText);

  // 3. JD embedding text
  const jdEmbedText = [
    jdParsed.title,
    ...(jdParsed.requiredSkills || []),
    ...(jdParsed.preferredSkills || []),
    jdParsed.industryDomain,
    jdParsed.seniorityLevel,
    ...(jdParsed.responsibilities || []).slice(0, 5),
  ].filter(Boolean).join(' ');
  const jdEmbedding = await generateEmbedding(jdEmbedText);

  // 4. Normalize candidates
  const normalizedCandidates = await Promise.all(
    candidates.map((c) => normalizeCandidateProfile(c))
  );

  // 5. Embed candidates
  const candidateEmbeddings = await Promise.all(
    normalizedCandidates.map((c) => generateEmbedding(candidateToEmbedText(c)))
  );

  // 6. Score
  const scored = normalizedCandidates.map((candidate, i) => ({
    candidate,
    scores: scoreCandidate(jdParsed, candidate, jdEmbedding, candidateEmbeddings[i]),
  }));
  scored.sort((a, b) => b.scores.finalScore - a.scores.finalScore);

  // 7. AI insights (sequential to respect rate limits)
  const results = [];
  for (let i = 0; i < scored.length; i++) {
    const { candidate, scores } = scored[i];
    const insights = await generateCandidateAnalysis(jdParsed, candidate, scores, jdRawText);
    results.push({ rank: i + 1, candidate, scores, insights });
  }

  return { jdParsed, jdRawText, results };
};

/**
 * POST /api/ranker/analyze
 * Multipart fields:
 *   - jdFile          : PDF/DOCX/TXT job description
 *   - candidatesFile  : .json or .jsonl candidate list file  (preferred)
 *   - candidates      : raw JSON string fallback
 */
exports.analyzeResumes = async (req, res) => {
  try {
    const files = req.files || {};
    const jdFile = files.jdFile?.[0];
    const candidatesFile = files.candidatesFile?.[0];

    if (!jdFile) {
      return res.status(400).json({ error: 'Job description file (jdFile) is required.' });
    }

    // ── Resolve candidates from file OR body string ──────────────────
    let candidates = [];

    if (candidatesFile) {
      try {
        candidates = parseCandidatesFromBuffer(candidatesFile.buffer, candidatesFile.originalname);
      } catch (e) {
        return res.status(400).json({ error: `Candidates file error: ${e.message}` });
      }
    } else if (req.body.candidates) {
      try {
        candidates = JSON.parse(req.body.candidates);
      } catch {
        return res.status(400).json({ error: 'Invalid candidates JSON string.' });
      }
    } else {
      return res.status(400).json({
        error: 'Provide either a candidatesFile (.json/.jsonl) or a candidates JSON string.',
      });
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: 'Candidates list is empty.' });
    }
    if (candidates.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 candidates allowed per batch.' });
    }

    const { jdParsed, results } = await runAnalysis(jdFile, candidates);

    res.json({
      success: true,
      jobTitle: jdParsed.title || 'Analyzed Position',
      jdParsed,
      totalCandidates: results.length,
      rankedCandidates: results,
    });
  } catch (err) {
    console.error('❌ Resume ranker error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Analysis failed.' });
  }
};

/**
 * POST /api/ranker/export
 * Same inputs as /analyze but returns a downloadable JSON file.
 * The response includes Content-Disposition so the browser prompts Save As.
 */
exports.exportRankedResults = async (req, res) => {
  try {
    const files = req.files || {};
    const jdFile = files.jdFile?.[0];
    const candidatesFile = files.candidatesFile?.[0];

    if (!jdFile) return res.status(400).json({ error: 'jdFile is required.' });

    let candidates = [];
    if (candidatesFile) {
      candidates = parseCandidatesFromBuffer(candidatesFile.buffer, candidatesFile.originalname);
    } else if (req.body.candidates) {
      candidates = JSON.parse(req.body.candidates);
    } else {
      return res.status(400).json({ error: 'candidatesFile or candidates body required.' });
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: 'Candidates list is empty.' });
    }
    if (candidates.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 candidates.' });
    }

    const { jdParsed, results } = await runAnalysis(jdFile, candidates);

    // ── Build output object ─────────────────────────────────────────
    const output = {
      meta: {
        generatedAt: new Date().toISOString(),
        jobTitle: jdParsed.title || 'Analyzed Position',
        totalCandidates: results.length,
        scoringWeights: { skillMatch: '32%', experienceMatch: '22%', projectRelevance: '15%', educationMatch: '12%', semanticSimilarity: '15%', certifications: '4%' },
      },
      jobDescription: jdParsed,
      rankedCandidates: results.map(({ rank, candidate, scores, insights }) => ({
        rank,
        name: candidate.name,
        email: candidate.email || '',
        overallScore: scores.finalScore,
        recommendation: insights.recommendation,
        scoreBreakdown: {
          skillMatch: scores.skillMatch,
          experienceMatch: scores.experienceMatch,
          projectRelevance: scores.projectRelevance,
          educationMatch: scores.educationMatch,
          certifications: scores.certifications,
          semanticSimilarity: scores.semanticSimilarity,
        },
        aiSummary: insights.summary,
        strengths: insights.strengths,
        concerns: insights.concerns,
        matchedSkills: insights.matchedSkills,
        missingSkills: insights.missingSkills,
        recommendationReason: insights.recommendationReason,
        jdVsResumeNotes: insights.jdVsResumeNotes,
        relevantExperience: insights.relevantExperience,
        interviewFocus: insights.interviewFocus,
        profile: {
          headline: candidate.headline,
          totalExperienceYears: candidate.totalExperienceYears,
          skills: candidate.skills,
          education: candidate.education,
          certifications: candidate.certifications,
          location: candidate.location,
        },
      })),
    };

    const filename = `ranked_candidates_${Date.now()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error('❌ Export error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Export failed.' });
  }
};

/**
 * POST /api/ranker/parse-jd
 * Parse a JD file and return structured data (for preview)
 */
exports.parseJD = async (req, res) => {
  try {
    const jdFile = (req.files?.jdFile || [])[0] || req.file;
    if (!jdFile) return res.status(400).json({ error: 'JD file is required.' });

    const rawText = await extractTextFromBuffer(jdFile.buffer, jdFile.mimetype, jdFile.originalname);
    if (!rawText || rawText.trim().length < 30) {
      return res.status(400).json({ error: 'File appears to be empty.' });
    }

    const parsed = await parseJobDescription(rawText);
    res.json({ success: true, rawText: rawText.slice(0, 2000), parsed });
  } catch (err) {
    console.error('Parse JD error:', err);
    res.status(500).json({ error: err.message || 'Failed to parse JD.' });
  }
};

exports.analyzeCandidates = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a file.' });
    }

    // Your processing logic here...

    res.status(200).json({ message: 'File processed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during analysis.' });
  }
};
