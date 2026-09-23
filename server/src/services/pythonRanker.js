/**
 * Python Fast Ranker Bridge Service
 * Spawns python rank.py for high-speed candidate ranking across 100,000+ records.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RANK_SCRIPT = path.join(__dirname, '../../../rank.py');

/**
 * Execute Python pipeline from Node.js
 * @param {string} candidatesPath - Path to candidates.jsonl file
 * @param {string} outputPath - Path to output submission.csv file
 * @param {number} topN - Number of top candidates to return (default 100)
 * @returns {Promise<Array<{candidate_id: string, rank: number, score: number, reasoning: string}>>}
 */
const runPythonRanker = (candidatesPath, outputPath, topN = 100) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      RANK_SCRIPT,
      '--candidates', candidatesPath,
      '--out', outputPath,
      '--top_n', String(topN)
    ]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python ranker exited with code ${code}: ${stderrData}`));
      }

      try {
        if (!fs.existsSync(outputPath)) {
          return reject(new Error(`Output file ${outputPath} was not created.`));
        }

        const fileContent = fs.readFileSync(outputPath, 'utf-8');
        const lines = fileContent.trim().split('\n');
        if (lines.length <= 1) {
          return resolve([]);
        }

        const headers = lines[0].split(',');
        const results = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse CSV row correctly respecting quotes
          const fields = [];
          let current = '';
          let inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              fields.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          fields.push(current.trim());

          if (fields.length >= 4) {
            const cid = fields[0];
            const rank = parseInt(fields[1], 10);
            const score = parseFloat(fields[2]);
            const reasoning = fields.slice(3).join(', ').replace(/^"|"$/g, '');
            results.push({ candidate_id: cid, rank, score, reasoning });
          }
        }

        resolve(results);
      } catch (err) {
        reject(err);
      }
    });
  });
};

module.exports = {
  runPythonRanker,
};
