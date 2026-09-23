const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Module = require('node:module');

// The parser is intentionally private to the controller. Load the controller
// with a test-only export so its production API remains unchanged.
const loadCandidateParser = () => {
  // Loading the controller pulls aiService; a placeholder key is enough to
  // initialise the module graph for these pure parsing tests.
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('your_')) {
    process.env.GEMINI_API_KEY = 'test-only-gemini-key';
  }

  const controllerPath = path.resolve(__dirname, '../src/controllers/rankerController.js');
  const controller = new Module(controllerPath);
  controller.filename = controllerPath;
  controller.paths = Module._nodeModulePaths(path.dirname(controllerPath));
  controller._compile(
    `${fs.readFileSync(controllerPath, 'utf8')}\nmodule.exports.__testParser = parseCandidatesFromBuffer;`,
    controllerPath
  );
  return controller.exports.__testParser;
};

const toUtf16Be = (text) => {
  const buffer = Buffer.from(text, 'utf16le');
  for (let i = 0; i + 1 < buffer.length; i += 2) {
    [buffer[i], buffer[i + 1]] = [buffer[i + 1], buffer[i]];
  }
  return buffer;
};

test('accepts BOM-less UTF-16LE candidate JSON with leading whitespace', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  const buffer = Buffer.from('\n  [{"name":"Ada Lovelace"}]', 'utf16le');

  assert.deepEqual(parseCandidatesFromBuffer(buffer, 'candidates.json'), [{ name: 'Ada Lovelace' }]);
});

test('accepts BOM-less UTF-16BE candidate JSON with leading whitespace', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  const buffer = toUtf16Be('\n  [{"name":"Ada Lovelace"}]');

  assert.deepEqual(parseCandidatesFromBuffer(buffer, 'candidates.json'), [{ name: 'Ada Lovelace' }]);
});

test('accepts UTF-8 JSON with a trailing NUL byte', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  const buffer = Buffer.concat([
    Buffer.from('[{"name":"Ada Lovelace"}]', 'utf8'),
    Buffer.from([0x00]),
  ]);

  assert.deepEqual(parseCandidatesFromBuffer(buffer, 'candidates.json'), [{ name: 'Ada Lovelace' }]);
});

test('accepts UTF-8 JSON with a sparse form-feed in a string field', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  // Form feed would make JSON.parse fail if left in place; sanitize to a space.
  const buffer = Buffer.from('[{"name":"Ada","summary":"Line1\u000cLine2"}]', 'utf8');

  assert.deepEqual(parseCandidatesFromBuffer(buffer, 'candidates.json'), [
    { name: 'Ada', summary: 'Line1 Line2' },
  ]);
});

test('accepts UTF-8 JSONL with a unit-separator control character', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  const buffer = Buffer.from('{"name":"Ada","summary":"A\u001eB"}\n{"name":"Grace"}\n', 'utf8');

  assert.deepEqual(parseCandidatesFromBuffer(buffer, 'candidates.jsonl'), [
    { name: 'Ada', summary: 'A B' },
    { name: 'Grace' },
  ]);
});

test('accepts UTF-8 JSON with a UTF-8 BOM', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  const buffer = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from('[{"name":"Ada Lovelace"}]', 'utf8'),
  ]);

  assert.deepEqual(parseCandidatesFromBuffer(buffer, 'candidates.json'), [{ name: 'Ada Lovelace' }]);
});

test('rejects ZIP/XLSX bytes even when named .json', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);

  assert.throws(
    () => parseCandidatesFromBuffer(zipHeader, 'candidates.json'),
    /appears to contain binary data/
  );
});

test('rejects PDF bytes even when named .json', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  const pdfHeader = Buffer.from('%PDF-1.4 binary-ish\u0000\u0001\u0002\u0003\u0004\u0005', 'utf8');

  assert.throws(
    () => parseCandidatesFromBuffer(pdfHeader, 'candidates.json'),
    /appears to contain binary data/
  );
});
