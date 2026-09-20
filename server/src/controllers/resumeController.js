const mongoose = require('mongoose');
const path = require('path');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const { uploadResumeBuffer, deleteResumeAsset } = require('../services/cloudinaryService');

const MAX_RESUMES_PER_REQUEST = 10;
const ALLOWED_FILE_TYPES = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

const getFileExtension = (filename) => path.extname(filename || '').toLowerCase();

const resumeFileFilter = (req, file, callback) => {
  const extension = getFileExtension(file.originalname);
  const acceptedMimeTypes = ALLOWED_FILE_TYPES[extension];

  if (!acceptedMimeTypes || !acceptedMimeTypes.includes(file.mimetype)) {
    const error = new Error('Only PDF and DOCX resume files are allowed.');
    error.statusCode = 400;
    return callback(error);
  }

  callback(null, true);
};

const ensureExpectedFileSignatures = (files) => {
  for (const file of files) {
    const extension = getFileExtension(file.originalname);
    const hasPdfSignature = file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    const hasZipSignature = ['504b0304', '504b0506', '504b0708'].includes(
      file.buffer.subarray(0, 4).toString('hex')
    );

    if ((extension === '.pdf' && !hasPdfSignature) || (extension === '.docx' && !hasZipSignature)) {
      const error = new Error(`${file.originalname} does not match its declared file type.`);
      error.statusCode = 400;
      throw error;
    }
  }
};

exports.uploadConfig = {
  MAX_RESUMES_PER_REQUEST,
  resumeFileFilter,
};

// POST /api/resumes/upload
exports.uploadResumes = async (req, res, next) => {
  const uploadedAssets = [];

  try {
    const files = req.files || [];
    const { jobId } = req.body;

    if (!jobId || !mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ error: 'A valid jobId is required.' });
    }
    if (!files.length) {
      return res.status(400).json({ error: 'At least one resume file is required.' });
    }

    ensureExpectedFileSignatures(files);

    const job = await Job.findById(jobId).select('recruiter');
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    if (req.user.role === 'recruiter' && !job.recruiter.equals(req.user._id)) {
      return res.status(403).json({ error: 'You can only upload resumes for your own jobs.' });
    }

    const resumeData = [];
    for (const file of files) {
      const asset = await uploadResumeBuffer({
        buffer: file.buffer,
        jobId,
        originalname: file.originalname,
      });
      uploadedAssets.push(asset);
      resumeData.push({
        filename: path.basename(file.originalname),
        fileUrl: asset.secure_url,
        jobId,
        status: 'pending',
        uploadedAt: new Date(),
      });
    }

    const resumes = await Resume.insertMany(resumeData);
    return res.status(201).json({
      message: `${resumes.length} resume${resumes.length === 1 ? '' : 's'} uploaded successfully.`,
      resumes,
    });
  } catch (error) {
    await Promise.allSettled(
      uploadedAssets.map((asset) => deleteResumeAsset(asset.public_id))
    );
    return next(error);
  }
};
