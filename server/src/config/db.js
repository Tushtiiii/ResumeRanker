const mongoose = require('mongoose');

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // force Node to use Google/Cloudflare DNS

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create Atlas Vector Search index (run once — idempotent)
    await ensureVectorSearchIndexes();
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
}; 

const ensureVectorSearchIndexes = async () => {
  try {
    const db = mongoose.connection.db;

    // Check if vector search index exists on candidates collection
    const candidateIndexes = await db
      .collection('candidates')
      .listSearchIndexes()
      .toArray()
      .catch(() => []);

    const hasJobIndex = await db
      .collection('jobs')
      .listSearchIndexes()
      .toArray()
      .catch(() => []);

    if (!candidateIndexes.find((i) => i.name === 'candidate_vector_index')) {
      console.log('📐 Creating candidate vector search index...');
      // Note: Atlas Vector Search indexes must be created via Atlas UI or CLI
      // This log reminds the developer to do so
      console.log(
        '⚠️  Please create a Vector Search index named "candidate_vector_index" on the candidates collection with field "embeddings" (dimensions: 768 for Gemini, 1536 for OpenAI)'
      );
    }

    if (!hasJobIndex.find((i) => i.name === 'job_vector_index')) {
      console.log(
        '⚠️  Please create a Vector Search index named "job_vector_index" on the jobs collection with field "embeddings"'
      );
    }
  } catch (err) {
    // Non-fatal — vector index creation instructions will be in README
    console.log('ℹ️  Vector index check skipped (Atlas CLI required for creation)');
  }
};

module.exports = connectDB;
