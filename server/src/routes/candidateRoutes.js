const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  uploadResume,
  getCandidates,
  getMyProfile,
  updateMyProfile,
  getCandidate,
  applyToJob,
  getMyApplications,
} = require('../controllers/candidateController');

router.use(protect);

router.post('/upload-resume', authorize('candidate', 'admin'), uploadResume);
router.get('/me', authorize('candidate'), getMyProfile);
router.put('/me', authorize('candidate'), updateMyProfile);
router.get('/applications', authorize('candidate'), getMyApplications);

router.post('/apply/:jobId', authorize('candidate'), applyToJob);
router.get('/', authorize('recruiter', 'admin'), getCandidates);
router.get('/:id', authorize('recruiter', 'admin', 'candidate'), getCandidate);

module.exports = router;
