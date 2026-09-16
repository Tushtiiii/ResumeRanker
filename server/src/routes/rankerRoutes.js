const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize, optionalProtect } = require('../middleware/auth');
const { analyzeResumes, parseJD, exportRankedResults } = require('../controllers/rankerController');

// JD & Candidates File Filter (PDF / DOCX / TXT for JD; JSON / JSONL for Candidates)
const jdFilter = (req, file, cb) => {
  if (file.fieldname === 'jdFile') {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) return cb(null, true);
    return cb(new Error('JD file must be PDF, DOCX, or TXT.'), false);
  }
  if (file.fieldname === 'candidatesFile') {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.json', '.jsonl'].includes(ext)) return cb(null, true);
    return cb(new Error('Candidates file must be .json or .jsonl.'), false);
  }
  cb(null, true);
};

// Create a Multer instance with memory storage, file limits, and custom file filter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: jdFilter,
});
 
// Accept two named fields: jdFile (1 file) and candidatesFile (1 file)
const multiUpload = upload.fields([
  { name: 'jdFile', maxCount: 1 },
  { name: 'candidatesFile', maxCount: 1 }, 
]);

// Single-file upload for parse-jd preview (only needs the JD)
const singleJD = upload.fields([{ name: 'jdFile', maxCount: 1 }]);

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/ranker/analyze  → public (no login required), attach user if present
router.post('/analyze', optionalProtect, multiUpload, analyzeResumes);

// POST /api/ranker/export   → public (no login required)
router.post('/export', optionalProtect, multiUpload, exportRankedResults);

// POST /api/ranker/parse-jd → protected (recruiter/admin only)
router.post('/parse-jd', protect, authorize('recruiter', 'admin'), singleJD, parseJD);

module.exports = router;
