const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Application = require('../models/Application');
const { generateCandidateInsights, generateInterviewQuestions, answerRecruiterQuery, generateEmbedding } = require('../services/aiService');
const { rankCandidates } = require('../services/rankingEngine');
const mongoose = require('mongoose');

// ─── POST /api/ai/rank-candidates ─────────────────────────────────────────────
exports.rankCandidates = async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required.' });

    // Fetch job WITH embeddings
    const job = await Job.findById(jobId).select('+embeddings');
    if (!job) return res.status(404).json({ error: 'Job not found.' });

    // Authorization check
    if (job.recruiter.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    // Fetch all applications for this job
    const applications = await Application.find({ jobId }).populate('candidateId');

    if (applications.length === 0) {
      return res.json({ message: 'No applications found for this job.', rankedCandidates: [] });
    }

    // Fetch candidate embeddings (separate query to get select:false field)
    const candidateIds = applications.map((a) => a.candidateId._id);
    const candidatesWithEmbeddings = await Candidate.find({ _id: { $in: candidateIds } }).select('+embeddings');
    const embeddingMap = {};
    candidatesWithEmbeddings.forEach((c) => { embeddingMap[c._id.toString()] = c.embeddings; });

    // Rank candidates using hybrid scoring
    const candidatesForRanking = applications.map((app) => ({
      candidate: app.candidateId,
      embeddings: embeddingMap[app.candidateId._id.toString()] || [],
      applicationId: app._id,
    }));

    const ranked = rankCandidates(job, candidatesForRanking, job.embeddings || []);

    // Save scores back to Applications collection
    const updateOps = ranked.map(({ candidate, scores, rank, applicationId }) =>
      Application.findByIdAndUpdate(applicationId, {
        finalScore: scores.finalScore,
        scoreBreakdown: scores,
        rank,
        aiProcessedAt: new Date(),
      })
    );
    await Promise.all(updateOps);

    // Return ranked list (without embeddings)
    const result = ranked.map(({ candidate, scores, rank }) => ({
      rank,
      candidate: {
        _id: candidate._id,
        headline: candidate.headline,
        skills: candidate.skills,
        totalExperienceYears: candidate.totalExperienceYears,
        topDomains: candidate.topDomains,
        location: candidate.location,
        certifications: candidate.certifications,
      },
      scores,
    }));

    res.json({ jobId, totalRanked: result.length, rankedCandidates: result });
  } catch (err) {
    console.error('Rank candidates error:', err);
    res.status(500).json({ error: err.message || 'Ranking failed.' });
  }
};

// ─── POST /api/ai/generate-insights ──────────────────────────────────────────
exports.generateInsights = async (req, res) => {
  try {
    const { jobId, candidateId } = req.body;
    if (!jobId || !candidateId) {
      return res.status(400).json({ error: 'jobId and candidateId are required.' });
    }

    const [job, candidate, application] = await Promise.all([
      Job.findById(jobId).populate('recruiter', 'name'),
      Candidate.findById(candidateId).populate('userId', 'name email'),
      Application.findOne({ jobId, candidateId }),
    ]);

    if (!job || !candidate) {
      return res.status(404).json({ error: 'Job or candidate not found.' });
    }

    const scoreBreakdown = application?.scoreBreakdown || {};
    const insights = await generateCandidateInsights(job, candidate, {
      ...scoreBreakdown,
      finalScore: application?.finalScore || 0,
    });

    // Save insights to application
    if (application) {
      await Application.findByIdAndUpdate(application._id, {
        aiInsights: {
          summary: insights.summary,
          strengths: insights.strengths,
          concerns: insights.concerns,
          recommendation: insights.recommendation,
          interviewFocus: insights.interviewFocus,
        },
        matchedSkills: insights.matchedSkills,
        missingSkills: insights.missingSkills,
      });
    }

    res.json({ insights });
  } catch (err) {
    console.error('Generate insights error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate insights.' });
  }
};

// ─── POST /api/ai/interview-questions ─────────────────────────────────────────
exports.generateInterviewQuestions = async (req, res) => {
  try {
    const { jobId, difficulty = 'intermediate', count = 10 } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required.' });

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found.' });

    const result = await generateInterviewQuestions(job, difficulty, Math.min(20, parseInt(count)));
    res.json({ jobId, difficulty, questions: result.questions });
  } catch (err) {
    console.error('Interview questions error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate questions.' });
  }
};

// ─── POST /api/ai/chat ─────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { query, jobId } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required.' });

    let candidateContext = [];
    if (jobId) {
      const applications = await Application.find({ jobId })
        .populate({
          path: 'candidateId',
          populate: { path: 'userId', select: 'name' },
        })
        .sort({ finalScore: -1 })
        .limit(10);

      candidateContext = applications.map((app) => ({
        ...app.candidateId.toObject(),
        finalScore: app.finalScore,
      }));
    }

    const answer = await answerRecruiterQuery(query, candidateContext);
    res.json({ query, answer });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Chat request failed.' });
  }
};

// ─── GET /api/ai/status ───────────────────────────────────────────────────────
exports.getStatus = async (req, res) => {
  const { activeProvider } = require('../services/aiService');
  res.json({
    provider: activeProvider,
    embeddingDimensions: activeProvider === 'gemini' ? 3072 : 1536,
    models: {
      llm: activeProvider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-4o-mini',
      embedding: activeProvider === 'gemini' ? 'gemini-embedding-001' : 'text-embedding-3-small',
    },
  });
};

// ─── GET /api/ai/ranked-applications/:jobId ────────────────────────────────────
exports.getRankedApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, minScore, maxScore, skills, page = 1, limit = 20 } = req.query;

    const matchQuery = { jobId: mongoose.Types.ObjectId.createFromHexString(jobId) };
    if (status) matchQuery.status = status;
    if (minScore || maxScore) {
      matchQuery.finalScore = {};
      if (minScore) matchQuery.finalScore.$gte = parseInt(minScore);
      if (maxScore) matchQuery.finalScore.$lte = parseInt(maxScore);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const applications = await Application.find(matchQuery)
      .populate({
        path: 'candidateId',
        select: '-resumeRawText -embeddings',
        populate: { path: 'userId', select: 'name email avatar' },
      })
      .sort({ finalScore: -1, rank: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Skills filter (post-query since it's on nested candidate)
    let filtered = applications;
    if (skills) {
      const skillList = skills.split(',').map((s) => s.trim().toLowerCase());
      filtered = applications.filter((app) =>
        skillList.some((skill) =>
          (app.candidateId?.skills || []).some((cs) => cs.toLowerCase().includes(skill))
        )
      );
    }

    const total = await Application.countDocuments(matchQuery);

    res.json({
      applications: filtered,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get ranked applications error:', err);
    res.status(500).json({ error: 'Failed to fetch ranked applications.' });
  }
};
