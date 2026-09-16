const Candidate = require('../models/Candidate');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { upload, processResume } = require('../services/resumeParser');
const { generateEmbedding } = require('../services/aiService');

// ─── POST /api/candidates/upload-resume ───────────────────────────────────────
exports.uploadResume = [
  upload.single('resume'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Resume file is required.' });
      }

      // Extract text and parse with AI
      const { rawText, parsed, fileName } = await processResume(req.file);

      // Generate embedding for semantic search
      const embeddingText = `${parsed.headline || ''} ${parsed.summary || ''} ${(parsed.skills || []).join(' ')} ${parsed.totalExperienceYears || 0} years experience`;
      let embeddings = [];
      try {
        embeddings = await generateEmbedding(embeddingText);
      } catch (embErr) {
        console.error('Embedding error:', embErr.message);
      }

      // Upsert candidate profile
      const candidateData = {
        resumeRawText: rawText,
        resumeFileName: fileName,
        resumeUploadedAt: new Date(),
        headline: parsed.headline,
        summary: parsed.summary,
        skills: parsed.skills || [],
        experience: parsed.experience || [],
        education: parsed.education || [],
        projects: parsed.projects || [],
        certifications: parsed.certifications || [],
        achievements: parsed.achievements || [],
        languages: parsed.languages || [],
        phone: parsed.phone,
        linkedIn: parsed.linkedIn,
        github: parsed.github,
        portfolio: parsed.portfolio,
        location: parsed.location,
        totalExperienceYears: parsed.totalExperienceYears || 0,
        topDomains: parsed.topDomains || [],
        embeddings,
        profileComplete: true,
        aiProcessed: true,
      };

      const candidate = await Candidate.findOneAndUpdate(
        { userId: req.user._id },
        candidateData,
        { new: true, upsert: true, runValidators: true }
      ).select('-resumeRawText -embeddings');

      res.status(200).json({
        message: 'Resume uploaded and parsed successfully.',
        candidate,
        parsedData: parsed, // Return full parsed data so frontend can preview
      });
    } catch (err) {
      console.error('Resume upload error:', err);
      res.status(500).json({ error: err.message || 'Failed to process resume.' });
    }
  },
];

// ─── GET /api/candidates ──────────────────────────────────────────────────────
exports.getCandidates = async (req, res) => {
  try {
    const { skills, minExp, maxExp, location, page = 1, limit = 20 } = req.query;
    const query = {};

    if (skills) {
      const skillList = skills.split(',').map((s) => s.trim());
      query.skills = { $in: skillList.map((s) => new RegExp(s, 'i')) };
    }
    if (minExp) query.totalExperienceYears = { $gte: parseInt(minExp) };
    if (maxExp) {
      query.totalExperienceYears = { ...(query.totalExperienceYears || {}), $lte: parseInt(maxExp) };
    }
    if (location) query.location = new RegExp(location, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [candidates, total] = await Promise.all([
      Candidate.find(query)
        .populate('userId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-resumeRawText -embeddings'),
      Candidate.countDocuments(query),
    ]);

    res.json({ candidates, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candidates.' });
  }
};

// ─── GET /api/candidates/me ───────────────────────────────────────────────────
exports.getMyProfile = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user._id })
      .populate('userId', 'name email avatar')
      .select('-resumeRawText -embeddings');

    if (!candidate) {
      return res.status(404).json({ error: 'Profile not found. Please upload your resume.' });
    }

    res.json({ candidate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

// ─── GET /api/candidates/:id ──────────────────────────────────────────────────
exports.getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('userId', 'name email avatar')
      .select('-resumeRawText -embeddings');

    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
    res.json({ candidate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candidate.' });
  }
};

// ─── POST /api/candidates/apply/:jobId ───────────────────────────────────────
exports.applyToJob = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user._id });
    if (!candidate) {
      return res.status(400).json({ error: 'Please complete your profile before applying.' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job || job.status !== 'active') {
      return res.status(404).json({ error: 'Job not found or no longer active.' });
    }

    const existing = await Application.findOne({ candidateId: candidate._id, jobId: job._id });
    if (existing) {
      return res.status(409).json({ error: 'You have already applied for this job.' });
    }

    const application = await Application.create({
      candidateId: candidate._id,
      jobId: job._id,
      status: 'applied',
    });

    // Increment job applicant count
    await Job.findByIdAndUpdate(job._id, { $inc: { applicantCount: 1 } });

    res.status(201).json({ message: 'Application submitted successfully.', application });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to submit application.' });
  }
};

// ─── GET /api/candidates/applications ────────────────────────────────────────
exports.getMyApplications = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user._id });
    if (!candidate) return res.json({ applications: [] });

    const applications = await Application.find({ candidateId: candidate._id })
      .populate('jobId', 'title company location status createdAt parsedProfile')
      .sort({ createdAt: -1 })
      .select('-scoreBreakdown');

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
};

// ─── PUT /api/candidates/me ───────────────────────────────────────────────────
exports.updateMyProfile = async (req, res) => {
  try {
    const { headline, summary, skills, location } = req.body;
    const updateData = {
      userId: req.user._id,
      ...(headline !== undefined && { headline }),
      ...(summary !== undefined && { summary }),
      ...(skills !== undefined && { skills }),
      ...(location !== undefined && { location }),
    };

    if (headline !== undefined || summary !== undefined || skills !== undefined) {
      const currentCandidate = await Candidate.findOne({ userId: req.user._id });
      const finalHeadline = headline !== undefined ? headline : (currentCandidate?.headline || '');
      const finalSummary = summary !== undefined ? summary : (currentCandidate?.summary || '');
      const finalSkills = skills !== undefined ? skills : (currentCandidate?.skills || []);
      const finalExp = currentCandidate?.totalExperienceYears || 0;

      const embeddingText = `${finalHeadline} ${finalSummary} ${finalSkills.join(' ')} ${finalExp} years experience`;
      try {
        updateData.embeddings = await generateEmbedding(embeddingText);
      } catch (embErr) {
        console.error('Embedding regeneration error:', embErr.message);
      }
    }

    const candidate = await Candidate.findOneAndUpdate(
      { userId: req.user._id },
      updateData,
      { new: true, upsert: true, runValidators: true }
    ).populate('userId', 'name email avatar').select('-resumeRawText -embeddings');

    res.json({ candidate });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

