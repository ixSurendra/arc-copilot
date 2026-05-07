/**
 * Seed AI features into FeatureRegistry
 * Usage: DATABASE_URL=... npx tsx tools/seed-ai-features.ts
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const AI_FEATURES = [
  { featureKey: 'ai_enabled', featureName: 'AI Processing', category: 'ai', valueType: 'boolean', description: 'Master toggle for AI document processing' },
  { featureKey: 'ai_auto_process', featureName: 'Auto-Process Uploads', category: 'ai', valueType: 'boolean', description: 'Automatically process uploaded files through AI pipeline' },
  { featureKey: 'ai_auto_process_pull', featureName: 'Auto-Process Pull Jobs', category: 'ai', valueType: 'boolean', description: 'Automatically process files discovered by pull jobs' },
  { featureKey: 'ai_ocr_enabled', featureName: 'OCR Processing', category: 'ai', valueType: 'boolean', description: 'Enable OCR for scanned documents' },
  { featureKey: 'ai_summarization', featureName: 'Document Summarization', category: 'ai', valueType: 'boolean', description: 'Generate AI-powered document summaries' },
  { featureKey: 'ai_search_enabled', featureName: 'Semantic Search', category: 'ai', valueType: 'boolean', description: 'Enable AI-powered semantic search across documents' },
  { featureKey: 'ai_qa_enabled', featureName: 'Q&A Chat', category: 'ai', valueType: 'boolean', description: 'Enable document Q&A chatbot' },
  { featureKey: 'ai_reranking', featureName: 'Search Re-ranking', category: 'ai', valueType: 'boolean', description: 'Enable cross-encoder re-ranking for better search accuracy' },
  { featureKey: 'ai_hybrid_search', featureName: 'Hybrid Search', category: 'ai', valueType: 'boolean', description: 'Combine keyword and semantic search for better results' },
  { featureKey: 'ai_max_file_size_mb', featureName: 'Max File Size (MB)', category: 'ai', valueType: 'integer', description: 'Maximum file size in MB for AI processing' },
  { featureKey: 'ai_max_concurrency', featureName: 'Max Concurrency', category: 'ai', valueType: 'integer', description: 'Maximum number of files processed in parallel' },
  { featureKey: 'ai_ocr_language', featureName: 'Default OCR Language', category: 'ai', valueType: 'string', description: 'Default language for OCR processing (e.g., eng, ara, auto)' },
  { featureKey: 'ai_monthly_doc_quota', featureName: 'Monthly Document Quota', category: 'ai', valueType: 'integer', description: 'Maximum AI document operations per month (SaaS only)' },
  { featureKey: 'ai_monthly_query_quota', featureName: 'Monthly Query Quota', category: 'ai', valueType: 'integer', description: 'Maximum AI search/Q&A queries per month (SaaS only)' },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required. Set it in .env or pass directly.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: databaseUrl });
  console.log('Seeding AI features into FEATURE_REGISTRY...\n');
  try {
    for (const f of AI_FEATURES) {
      await pool.query(
        `INSERT INTO "FEATURE_REGISTRY" ("FEATURE_KEY","FEATURE_NAME","CATEGORY","VALUE_TYPE","DESCRIPTION","STATUS","CREATED_AT","UPDATED_AT")
         VALUES ($1,$2,$3,$4,$5,'ACTIVE',NOW(),NOW())
         ON CONFLICT ("FEATURE_KEY") DO UPDATE SET "CATEGORY"=$3,"VALUE_TYPE"=$4,"UPDATED_AT"=NOW()`,
        [f.featureKey, f.featureName, f.category, f.valueType, f.description]
      );
      console.log('  + ' + f.featureKey + ' (' + f.valueType + ')');
    }
    const count = await pool.query(`SELECT COUNT(*) FROM "FEATURE_REGISTRY" WHERE "CATEGORY"='ai'`);
    console.log('\nDone! ' + count.rows[0].count + ' AI features in registry.');
  } finally {
    await pool.end();
  }
}
main().catch(console.error);
