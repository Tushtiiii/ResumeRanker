/**
 * Resume Parser Service
 *
 * File text extraction priority:
 *  1. LlamaParse API (cloud, best accuracy for complex PDFs/DOCX)
 *  2. pdf-parse / mammoth (local fallback, no API key needed)
 *
 * Set LLAMAPARSE_API_KEY in .env to enable LlamaParse.
 * If the key is absent the service silently falls back to local parsers.
 */

const multer   = require('multer');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const path     = require('path');

const { parseResume } = require('./aiService');

// ─── LlamaParse Client (optional) ─────────────────────────────────────────────
let LlamaParseReader = null;
if (
  process.env.LLAMAPARSE_API_KEY &&
  !process.env.LLAMAPARSE_API_KEY.startsWith('your_')
) {
  try {
    const llamaParsePkg = require('llama-parse');
    LlamaParseReader = llamaParsePkg.LlamaParseReader || llamaParsePkg.default;
    console.log('[resumeParser] LlamaParse enabled — using cloud PDF/DOCX parsing.');
  } catch (e) {
    console.warn('[resumeParser] llama-parse package not found; falling back to local parsers.');
  }
}

// ─── Multer Storage (in-memory) ───────────────────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are accepted.'), false);
  }
};

const upload = multer({
  storage,
  limits    : { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

// ─── LlamaParse: Extract Text via API ─────────────────────────────────────────
const extractWithLlamaParse = async (buffer, originalname) => {
  if (!LlamaParseReader) return null;

  try {
    // LlamaParse expects a File/Blob or URL; we upload the buffer
    const reader = new LlamaParseReader({
      apiKey     : process.env.LLAMAPARSE_API_KEY,
      resultType : 'markdown',   // returns clean Markdown of the document
      language   : 'en',
    });

    // Convert buffer → Blob (Node 18+ has Blob globally; use Buffer fallback)
    const blob = new Blob([buffer], {
      type: originalname.endsWith('.pdf') ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const documents = await reader.loadData(blob, { fileName: originalname });
    if (documents && documents.length > 0) {
      return documents.map((d) => d.text || d.content || '').join('\n\n');
    }
  } catch (err) {
    console.warn('[resumeParser] LlamaParse failed, falling back to local:', err.message);
  }
  return null;
};

// ─── Local Text Extraction Fallback ──────────────────────────────────────────
const extractTextLocally = async (buffer, originalname) => {
  const ext = path.extname(originalname).toLowerCase();

  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === '.txt') {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${ext}`);
};

// ─── Extract Raw Text from File Buffer ───────────────────────────────────────
const extractTextFromBuffer = async (buffer, mimetype, originalname) => {
  // Try LlamaParse first (higher quality structured extraction)
  const llamaText = await extractWithLlamaParse(buffer, originalname);
  if (llamaText && llamaText.trim().length > 50) {
    console.log('[resumeParser] Text extracted via LlamaParse.');
    return llamaText;
  }

  // Fallback to local parsers
  const localText = await extractTextLocally(buffer, originalname);
  console.log('[resumeParser] Text extracted via local parser.');
  return localText;
};

// ─── Full Resume Processing Pipeline ─────────────────────────────────────────
const processResume = async (file) => {
  // 1. Extract raw text (LlamaParse → local fallback)
  const rawText = await extractTextFromBuffer(file.buffer, file.mimetype, file.originalname);

  if (!rawText || rawText.trim().length < 50) {
    throw new Error('Resume appears to be empty or could not be read.');
  }

  // 2. Use LangChain + Gemini to parse structured data
  const parsed = await parseResume(rawText);

  return {
    rawText,
    parsed,
    fileName: file.originalname,
  };
};

module.exports = { upload, processResume, extractTextFromBuffer };
