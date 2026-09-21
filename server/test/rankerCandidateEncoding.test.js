const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Module = require('node:module');

// The parser is intentionally private to the controller. Load the controller
// with a test-only export so its production API remains unchanged.
const loadCandidateParser = () => {
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

test('continues rejecting binary candidate uploads', () => {
  const parseCandidatesFromBuffer = loadCandidateParser();
  const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

  assert.throws(
    () => parseCandidatesFromBuffer(zipHeader, 'candidates.json'),
    /appears to contain binary data/
  );
});
