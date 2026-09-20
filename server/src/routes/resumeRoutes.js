const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const { uploadResumes, uploadConfig } = require('../controllers/resumeController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: uploadConfig.MAX_RESUMES_PER_REQUEST,
  },
  fileFilter: uploadConfig.resumeFileFilter,
});

router.post(
  '/upload',
  protect,
  authorize('recruiter', 'admin'),
  upload.array('resumes', uploadConfig.MAX_RESUMES_PER_REQUEST),
  uploadResumes
);

module.exports = router;
