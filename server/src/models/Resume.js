const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  fileUrl: {
    type: String,
    required: true,
    trim: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'processed', 'failed'],
    default: 'pending',
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

resumeSchema.index({ jobId: 1, uploadedAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);
